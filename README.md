# Interview Copilot — plain HTML, CSS, JavaScript

A Parakeet AI-inspired interview assistant with microphone transcription (where supported), optional screen/tab audio capture, Gemini-generated answers, speech playback, and Firebase/Firestore question history.

## Requirements

- Node.js 18+ (20+ recommended)
- Google Gemini API key
- Firebase project (optional for local AI use; required for cloud history)
- Chrome or Edge recommended for browser speech recognition and screen/tab sharing

## 1. Start the backend

```bash
npm install
cp .env.example .env
```

Edit `.env` and set `GEMINI_API_KEY`. Keep this file private; do not commit it or paste the key into frontend code.

```bash
npm start
```

The API runs at `http://localhost:3000`. Test `http://localhost:3000/api/health`.

## 2. Serve the frontend

Do not open `index.html` as a `file://` URL. In a second terminal, from this folder, run:

```bash
npx serve -l 5500 .
```

Then open `http://localhost:5500`. If your frontend uses another origin, update `ALLOWED_ORIGIN` in `.env` and restart the backend.

## 3. Configure Firebase history

1. Create a project in the Firebase console.
2. Add a Web App and copy its `apiKey`, `authDomain`, `projectId`, and `appId`.
3. In Firebase Authentication → Sign-in method, enable **Anonymous**.
4. Create a Cloud Firestore database.
5. In Firestore Rules, publish the contents of `firestore.rules`.
6. In the app, open the gear icon and enter the Firebase web-app settings, plus backend URL `http://localhost:3000`.
7. Save; the page reloads and signs in anonymously. Question history will be saved under `users/{anonymousUid}/interviewQuestions`.

Firebase web configuration is not a server secret. Security comes from Authentication and Firestore rules. Do not use open rules such as `allow read, write: if true`.

## How to use

1. Select the interview role, answer style, and experience level.
2. Click **Start mic** and grant microphone permission. Speak a question; stable speech segments are transcribed and likely questions trigger an AI answer.
3. You can type a question and press Enter or click **Ask AI**.
4. Use **Read aloud**, **Copy**, **Export JSON**, or review recent questions.
5. Click **Share audio** to select a tab/window/screen and enable audio sharing when your browser offers it. Click **Stop all** when finished.

## Browser audio limitations — important

- `getDisplayMedia({audio:true, video:true})` requires a secure context (localhost is allowed), a user gesture, and explicit user selection. The browser may provide no audio track if the user does not choose a compatible source or enable audio sharing.
- The app checks for a returned system-audio track, but **does not transcribe system audio**. The Web Speech API does not expose a way to feed an arbitrary `MediaStream` into `SpeechRecognition`; it usually recognizes microphone input. This app's working transcription path is microphone speech recognition plus manually typed questions.
- For true system-audio transcription, add a dedicated streaming speech-to-text service. A production implementation should capture short audio chunks from the shared stream (for example via Web Audio/AudioWorklet and MediaRecorder where supported), stream them to an authenticated backend, and use a provider that accepts streaming audio. Handle chunking, latency, reconnects, language selection, consent, and data retention carefully. Do not assume that recording an audio track automatically transcribes it.
- Web Speech API support and behavior vary by browser, platform, permissions, and network. Chrome/Edge are the best initial targets; always keep the manual question input available.
- Use audio capture only with appropriate consent and in compliance with interview, workplace, and meeting policies.

## Security and deployment

- Gemini key stays in backend `.env`; frontend sends questions to `/api/answer`, never to Gemini directly.
- Set `ALLOWED_ORIGIN` to your exact production frontend origin. The sample CORS setting is intended for local development; do not leave broad CORS enabled in production.
- Add rate limiting, authentication, request logging with redaction, quotas, abuse controls, and TLS before public deployment.
- Do not put secrets in `app.js`, HTML, or `localStorage`. Firebase web config can be in the browser, but access must be secured by Auth + Firestore rules.
- Anonymous Firebase accounts can be abused if rules and quotas are misconfigured. Consider account linking or a proper sign-in flow before production.
- This is a starter project, not a complete security-reviewed production service.

## Project files

- `index.html` — app structure
- `styles.css` — responsive dark UI
- `app.js` — microphone recognition, UI, Gemini backend calls, Firebase history
- `server.js` — Express API that keeps Gemini key on the server
- `firestore.rules` — per-user history access rules
- `.env.example` — backend environment template

## Troubleshooting

- **AI request failed:** make sure backend is running, `.env` contains a valid Gemini API key, and the selected model is available to your account.
- **Firebase not configured:** open Settings and enter all four Firebase web-app fields. Enable Anonymous Auth and publish Firestore rules.
- **No speech detected:** allow microphone access, use Chrome/Edge, check OS microphone permissions, and try speaking in English. Speech recognition may require an internet connection.
- **No system audio track:** choose a browser tab and tick Share audio if shown. Some OS/browser/source combinations cannot share audio.
