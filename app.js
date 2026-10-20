import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const defaults = { firebaseApiKey:"", firebaseAuthDomain:"", firebaseProjectId:"", firebaseAppId:"", backendUrl:"https://parakeet-interview-copilot.onrender.com" };
let settings = { ...defaults, ...JSON.parse(localStorage.getItem("copilotSettings") || "{}") };
let app, auth, db, user = null, recognition = null, micOn = false, systemStream = null;
let currentTranscript = "", answerText = "", sessionId = crypto.randomUUID(), history = [];

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
function setStatus(text){ $("sessionStatus").textContent = text; }
function showTranscriptEmpty(){ $("transcript").innerHTML = '<div class="empty-state"><div class="empty-icon">⌁</div><strong>Waiting for speech</strong><p>Start the microphone, then speak a question.</p></div>'; }
function addTranscript(text, source="Microphone"){
  const clean = text.trim(); if (!clean) return;
  currentTranscript = clean;
  const node = document.createElement("div"); node.className = "transcript-line";
  const small = document.createElement("small"); small.textContent = `${source} · ${new Date().toLocaleTimeString()}`;
  const body = document.createElement("div"); body.textContent = clean;
  node.append(small, body);
  if ($("transcript").querySelector(".empty-state")) $("transcript").innerHTML = "";
  $("transcript").prepend(node);
  // Ask automatically when a stable speech segment looks like a question.
  if (/[?]$/.test(clean) || /^(what|why|how|when|where|which|explain|tell me|describe|define|can you|could you)\b/i.test(clean)) {
    clearTimeout(window.__questionDebounce);
    window.__questionDebounce = setTimeout(() => askAI(clean), 900);
  }
}
function setListeningUI(){
  const on = micOn || !!systemStream;
  $("listeningBadge").textContent = on ? "● LISTENING / CAPTURING" : "● NOT LISTENING";
  $("listeningBadge").style.color = on ? "var(--green)" : "";
  $("wave").classList.toggle("active", on);
  $("stopAllBtn").disabled = !on;
  $("captureMessage").textContent = micOn && systemStream ? "Microphone active · system audio shared" : micOn ? "Listening to microphone" : systemStream ? "System audio stream shared (not transcribed)" : "Audio capture is off";
}
async function initFirebase(){
  if (!settings.firebaseApiKey || !settings.firebaseProjectId || !settings.firebaseAppId) {
    $("authStatus").textContent = "Firebase not configured";
    return;
  }
  try {
    app = initializeApp({ apiKey:settings.firebaseApiKey, authDomain:settings.firebaseAuthDomain, projectId:settings.firebaseProjectId, appId:settings.firebaseAppId });
    auth = getAuth(app); db = getFirestore(app);
    await signInAnonymously(auth);
    onAuthStateChanged(auth, async (u) => {
      user = u;
      $("authStatus").textContent = u ? "Firebase connected" : "Not signed in";
      if (u) await loadHistory();
    });
  } catch (e) {
    $("authStatus").textContent = "Firebase setup error";
    console.error(e);
  }
}
async function saveHistory(item){
  history.unshift(item); renderHistory(); renderSessions();
  if (db && user) {
    try { await addDoc(collection(db, "users", user.uid, "interviewQuestions"), { ...item, createdAt:serverTimestamp() }); }
    catch(e){ console.error(e); setStatus("Could not save to Firebase; check Firestore rules"); }
  }
}
async function loadHistory(){
  try {
    const q = query(collection(db, "users", user.uid, "interviewQuestions"), orderBy("createdAt","desc"), limit(50));
    const snap = await getDocs(q);
    history = snap.docs.map(d => ({ id:d.id, ...d.data(), timestamp:d.data().createdAt?.toDate?.().toISOString() || "" }));
    renderHistory(); renderSessions();
  } catch(e) { console.warn("History load:", e); }
}
function renderHistory(){
  const host = $("historyList"); host.innerHTML = "";
  if (!history.length){ host.innerHTML = '<p class="muted">No questions saved in this session yet.</p>'; return; }
  history.slice(0,20).forEach(item => {
    const row = document.createElement("div"); row.className = "history-item";
    const left = document.createElement("div"); const strong = document.createElement("strong"); strong.textContent = item.question || "Untitled question";
    const p = document.createElement("p"); p.textContent = item.role || "Interview";
    left.append(strong,p);
    const btn = document.createElement("button"); btn.className = "text-button"; btn.textContent = "View answer";
    btn.onclick = () => { $("questionInput").value = item.question || ""; renderAnswer(item.answer || "No saved answer."); };
    row.append(left,btn); host.append(row);
  });
}
function renderSessions(){
  const host = $("sessionList"); host.innerHTML = "";
  if (!history.length){ host.innerHTML = '<p class="muted small">Your saved sessions will appear here.</p>'; return; }
  [...new Set(history.map(x=>x.sessionId).filter(Boolean))].slice(0,8).forEach(id => {
    const el = document.createElement("div"); el.className = "session-link"; el.textContent = history.find(x=>x.sessionId===id)?.question || "Interview session"; el.title=id; el.onclick=()=>{$("historyPanel").scrollIntoView({behavior:"smooth"});};
    host.append(el);
  });
}
function escapeHTML(s){ return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function markdownLite(text){
  // Small safe renderer: escape HTML first, then format fenced code, inline code, headings and lists.
  let s = escapeHTML(text);
  s = s.replace(/```([\w+-]*)\n([\s\S]*?)```/g,(_,lang,code)=>`<pre><code>${code.trim()}</code></pre>`);
  s = s.replace(/`([^`]+)`/g,"<code>$1</code>");
  s = s.replace(/^### (.+)$/gm,"<h3>$1</h3>").replace(/^## (.+)$/gm,"<h3>$1</h3>");
  s = s.replace(/^\s*[-*] (.+)$/gm,"<li>$1</li>").replace(/(?:<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`);
  return s.split(/\n{2,}/).map(part=>/^(<h3>|<ul>|<pre>)/.test(part.trim())?part:`<p>${part.replace(/\n/g,"<br>")}</p>`).join("");
}
function renderAnswer(text){
  answerText=text;
  $("answer").innerHTML = markdownLite(text);
  $("copyBtn").disabled = $("speakBtn").disabled = !text;
  $("answerMeta").textContent = "Generated " + new Date().toLocaleTimeString();
}
async function askAI(question){
  question = (question || $("questionInput").value || currentTranscript).trim();
  if (!question) { setStatus("Enter or speak a question first"); return; }
  $("questionInput").value = question; $("askBtn").disabled = true; $("askBtn").textContent = "Thinking…";
  $("answer").innerHTML = '<div class="empty-state"><strong>Thinking through the question…</strong><p>Generating an interview-ready response.</p></div>';
  setStatus("Generating answer");
  const role=$("roleSelect").value, style=$("answerStyle").value, experience=$("experience").value;
  try {
    const response = await fetch(`${settings.backendUrl.replace(/\/$/,"")}/api/answer`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ question, role, style, experience })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "AI request failed");
    renderAnswer(data.answer);
    await saveHistory({ question, answer:data.answer, role, style, experience, sessionId, timestamp:new Date().toISOString() });
    setStatus("Answer ready");
  } catch(e) {
    $("answer").innerHTML = `<div class="empty-state"><strong>Could not generate answer</strong><p>${escapeHTML(e.message)}. Check that the backend is running and GEMINI_API_KEY is configured.</p></div>`;
    setStatus("Connection issue");
  } finally { $("askBtn").disabled=false; $("askBtn").textContent="Ask AI ↗"; }
}
function startMic(){
  if (!SpeechRecognition) { $("micDescription").textContent="SpeechRecognition is not supported in this browser. Try Chrome or Edge, or type questions manually."; setStatus("Speech recognition unsupported"); return; }
  if (micOn) { recognition?.stop(); return; }
  recognition = new SpeechRecognition();
  recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-US";
  recognition.onstart = () => { micOn=true; $("micBtn").textContent="Stop mic"; $("micState").textContent="Microphone active"; $("micState").style.color="var(--green)"; setListeningUI(); setStatus("Listening to microphone"); };
  recognition.onresult = (event) => {
    let finalText = "";
    for (let i=event.resultIndex;i<event.results.length;i++) if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
    if (finalText.trim()) addTranscript(finalText, "Microphone");
  };
  recognition.onerror = (e) => { console.warn("Speech recognition:",e.error); if(e.error!=="no-speech") setStatus("Speech recognition: "+e.error); };
  recognition.onend = () => { micOn=false; $("micBtn").textContent="Start mic"; $("micState").textContent="Not connected"; setListeningUI(); if ($("sessionStatus").textContent==="Listening to microphone") setStatus("Ready when you are"); };
  try { recognition.start(); } catch(e) { setStatus("Could not start microphone: "+e.message); }
}
async function shareSystemAudio(){
  if (!navigator.mediaDevices?.getDisplayMedia) { setStatus("Screen/audio sharing is not supported in this browser"); return; }
  try {
    systemStream = await navigator.mediaDevices.getDisplayMedia({ video:true, audio:true });
    const audioTracks = systemStream.getAudioTracks();
    if (!audioTracks.length) {
      systemStream.getTracks().forEach(t=>t.stop()); systemStream=null;
      $("systemState").textContent="No audio shared — choose a tab and enable Share audio";
      setStatus("No system audio track received"); setListeningUI(); return;
    }
    $("systemState").textContent="Audio stream connected · not transcribed";
    $("systemState").style.color="var(--green)"; $("systemBtn").textContent="Stop sharing";
    systemStream.getTracks().forEach(track=>track.addEventListener("ended", stopSystemAudio));
    setStatus("System audio shared; transcription requires an STT service");
    setListeningUI();
  } catch(e) { setStatus(e.name==="NotAllowedError"?"Screen/audio sharing cancelled":"Could not share audio: "+e.message); }
}
function stopSystemAudio(){
  if(systemStream) systemStream.getTracks().forEach(t=>t.stop());
  systemStream=null; $("systemState").textContent="Not connected"; $("systemState").style.color="";
  $("systemBtn").textContent="Share audio"; setListeningUI();
}
function stopAll(){
  if(recognition && micOn) recognition.stop();
  stopSystemAudio(); window.speechSynthesis?.cancel(); setStatus("Capture stopped"); setListeningUI();
}
function openSettings(){
  $("fbApiKey").value=settings.firebaseApiKey; $("fbAuthDomain").value=settings.firebaseAuthDomain; $("fbProjectId").value=settings.firebaseProjectId; $("fbAppId").value=settings.firebaseAppId; $("backendUrl").value=settings.backendUrl;
  $("settingsDialog").showModal();
}
$("micBtn").addEventListener("click",startMic);
$("systemBtn").addEventListener("click",()=>systemStream?stopSystemAudio():shareSystemAudio());
$("stopAllBtn").addEventListener("click",stopAll);
$("askBtn").addEventListener("click",()=>askAI());
$("questionInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();askAI();}});
$("clearTranscriptBtn").addEventListener("click",()=>{currentTranscript="";showTranscriptEmpty();});
$("newSessionBtn").addEventListener("click",()=>{stopAll();sessionId=crypto.randomUUID();currentTranscript="";answerText="";showTranscriptEmpty();$("answer").innerHTML='<div class="empty-state"><div class="empty-icon">✧</div><strong>Your answer will appear here</strong><p>Ask a question to get started.</p></div>';setStatus("New session ready");});
$("historyNav").addEventListener("click",()=>$("historyPanel").scrollIntoView({behavior:"smooth"}));
$("settingsBtn").addEventListener("click",openSettings);
$("saveSettingsBtn").addEventListener("click",async()=>{
  settings={firebaseApiKey:$("fbApiKey").value.trim(),firebaseAuthDomain:$("fbAuthDomain").value.trim(),firebaseProjectId:$("fbProjectId").value.trim(),firebaseAppId:$("fbAppId").value.trim(),backendUrl:$("backendUrl").value.trim()||"https://parakeet-interview-copilot.onrender.com"};
  localStorage.setItem("copilotSettings",JSON.stringify(settings)); $("settingsDialog").close(); $("authStatus").textContent="Reloading Firebase…"; location.reload();
});
$("copyBtn").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(answerText);$("copyBtn").textContent="Copied";setTimeout(()=>$("copyBtn").textContent="Copy",1200);}catch(e){setStatus("Clipboard unavailable");}});
$("speakBtn").addEventListener("click",()=>{if(!answerText||!window.speechSynthesis)return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(answerText.replace(/```[\s\S]*?```/g,"code example omitted"));utterance.rate=1;window.speechSynthesis.speak(utterance);});
$("exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(history,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="interview-history.json";a.click();URL.revokeObjectURL(url);});
initFirebase();
