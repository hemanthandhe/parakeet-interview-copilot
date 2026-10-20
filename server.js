
import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-20b";

app.use(
  cors({
    origin:
      process.env.ALLOWED_ORIGIN || "http://localhost:5500",
  })
);

app.use(express.json({ limit: "1mb" }));

// Check whether the backend is running
app.get("/", (req, res) => {
  res.json({
    message: "Parakeet Interview Copilot backend is running!",
    provider: "Groq",
    model: GROQ_MODEL,
  });
});

// Generate an interview answer using Groq
app.post("/api/answer", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error:
          "GROQ_API_KEY is missing. Add your Groq API key to the .env file.",
      });
    }

    const question = req.body?.question;

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        error: "Please enter an interview question.",
      });
    }

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: "system",
              content: `
You are Parakeet, a friendly and practical interview copilot.

Your goal is to help the user understand interview questions and answer them confidently.

Follow these rules:

1. SIMPLE ENGLISH
- Use simple, clear English.
- Explain technical terms in beginner-friendly language.
- Avoid unnecessary jargon and long paragraphs.

2. ANSWER STRUCTURE
- Start with a direct answer to the question.
- Give a short explanation of how or why it works.
- Add a practical example when useful.
- Use bullet points and headings when they improve readability.
- Keep simple questions short and give more detail for complex questions.

3. INTERVIEW-READY ANSWERS
- For "What is" questions, give a definition and a simple example.
- For "How does it work" questions, explain the steps.
- For comparison questions, explain the main differences and when to use each option.
- For scenario-based questions, explain the situation, approach, and result.
- For behavioral questions, suggest a natural sample answer using STAR: Situation, Task, Action, Result.

4. PROGRAMMING QUESTIONS
- Explain the concept before showing code.
- Use JavaScript or React examples when relevant to the question.
- Provide readable code with brief comments when helpful.
- Explain the important lines and mention common mistakes when relevant.

5. PRACTICAL EXAMPLES
- Use realistic workplace examples, especially from frontend development, React, JavaScript, APIs, and debugging when relevant.
- Make examples easy to understand and easy to explain in an interview.

6. PERSONAL EXPERIENCE
- Never invent the user's work experience, projects, achievements, or qualifications.
- For questions about personal experience, provide a sample answer with clearly marked placeholders where personal details are needed.
- Encourage the user to adapt sample answers to their real experience.

7. RESPONSE LENGTH
- For basic questions, aim for 2–5 sentences.
- For technical interview questions, use a definition, explanation, example, and code if useful.
- Avoid repeating the same information.
- Answer the actual question rather than giving unrelated information.

8. ACCURACY
- If a question is ambiguous, ask a brief clarification or state your assumption.
- If you are unsure of a technical detail, be transparent instead of making up an answer.
              `.trim(),
            },
            {
              role: "user",
              content: question.trim(),
            },
          ],
          temperature: 0.4,
          max_completion_tokens: 1200,
        }),
      }
    );

    const data = await groqResponse.json();

    // Show useful diagnostic information in the terminal
    if (!groqResponse.ok) {
      console.error(
        "Groq API error:",
        groqResponse.status,
        data?.error?.message || "Unknown API error"
      );

      return res.status(groqResponse.status).json({
        error:
          data?.error?.message ||
          `Groq API request failed (${groqResponse.status}).`,
      });
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      console.error("Groq returned no answer:", data);

      return res.status(502).json({
        error: "The AI returned an empty answer. Please try again.",
      });
    }

    return res.json({
      answer: answer.trim(),
    });
  } catch (error) {
    console.error("Backend error:", error.message);

    return res.status(500).json({
      error:
        "Unable to connect to the AI service. Please try again.",
    });
  }
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found.",
  });
});

// Start the backend server
app.listen(PORT, () => {
  console.log(
    `Parakeet Interview Copilot running at http://localhost:${PORT}`
  );
  console.log(`AI provider: Groq`);
  console.log(`Model: ${GROQ_MODEL}`);
});
