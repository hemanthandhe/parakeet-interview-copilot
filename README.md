
# Parakeet Interview Copilot

A Parakeet AI-inspired interview assistant built with HTML, CSS, JavaScript, Node.js, Express, Groq API, and optional Firebase/Firestore history.

## Features

- Microphone speech recognition (browser-supported)
- Type interview questions and generate AI answers
- Groq-powered interview guidance
- Read answers aloud and copy them
- Optional Firebase/Firestore question history
- Responsive dark UI

## Requirements

- Node.js 18+ (20+ recommended)
- Groq API key
- Firebase project (optional)
- Chrome or Edge recommended for speech recognition

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Create a local `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
PORT=3000
ALLOWED_ORIGIN=http://localhost:5500
```

Get your API key from [Groq Console](https://console.groq.com/keys).

Keep `.env` private. Never commit your API key or put it in frontend JavaScript.

## 3. Start the backend

```bash
npm start
```

The backend runs at:

`http://localhost:3000`

## 4. Start the frontend

Open a second terminal in the project folder and run:

```bash
npx serve -l 5500 .
```

Then open:

`http://localhost:5500`

Keep both servers running while testing locally.

## 5. Optional Firebase setup

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Add a Web App and copy its configuration.
3. Enable Anonymous Authentication if your app uses it.
4. Create a Cloud Firestore database.
5. Publish the rules from `firestore.rules`.
6. Enter the Firebase settings in the app's settings panel.

Use Firebase Authentication and secure Firestore rules. Never use unrestricted database rules in production.

## How to use

1. Open the app in your browser.
2. Type an interview question or start the microphone.
3. Click **Ask AI** to generate an answer.
4. Use **Read aloud** or **Copy** as needed.
5. Configure Firebase if you want cloud question history.

## Browser audio limitations

- Microphone access requires browser permission.
- Speech recognition support varies by browser and operating system.
- Screen/tab audio capture does not automatically provide speech transcription.
- Use audio capture only with appropriate consent and in accordance with interview, workplace, and meeting policies.

## Deployment and security

- The Groq API key must remain on the backend in `.env`.
- Set `ALLOWED_ORIGIN` to your actual frontend domain in production.
- Configure `GROQ_API_KEY` and `GROQ_MODEL` as environment variables in your backend hosting service.
- Never upload `.env`, API keys, or `node_modules` to GitHub.
- Add appropriate authentication, rate limiting, quotas, and monitoring before public production use.

## Project files

- `index.html` — application structure
- `styles.css` — responsive styling
- `app.js` — frontend behavior and AI requests
- `server.js` — Express backend and Groq API integration
- `firestore.rules` — Firestore access rules
- `.env.example` — environment variable template

## Troubleshooting

- **401 error:** Check your Groq API key.
- **404 error:** Check whether the configured model is available.
- **429 error:** Check your Groq usage limits.
- **Backend connection error:** Confirm the backend is running and the frontend uses the correct API URL.
- **Microphone not working:** Allow browser and operating-system microphone permissions.

