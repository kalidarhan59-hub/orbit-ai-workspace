# Voice Chat

The **Voice Chat** workspace uses the browser microphone and speech-recognition interface to capture a user’s question, sends the recognized text to ORBIT Intelligence, and keeps both sides of the exchange visible as text on screen.

When browser speech synthesis is available, the assistant’s text response is also spoken aloud using a Russian-capable browser voice where present. If speech output is unavailable or disabled, ORBIT keeps the answer visible in the **ORBIT ответил** panel and shows the notice: *«Ответ показан текстом: озвучивание не поддерживается этим браузером.»* The conversation remains usable as a text-first fallback.

The capability check for this fallback is covered by `client/src/lib/voice.test.ts`.
