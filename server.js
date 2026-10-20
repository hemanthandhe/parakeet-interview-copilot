
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
You are Parakeet, a helpful interview copilot.

Instructions:
- Answer interview questions in simple, clear English.
- Start with a direct answer.
- Explain technical concepts step by step.
- Give real-world examples where useful.
- Include code examples for programming questions.
- Use headings and bullet points when helpful.
- Keep answers relevant and easy to understand.
- Never invent personal experience or qualifications for the user.
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
