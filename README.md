# ORBIT AI Workspace

**ORBIT** is an original, authenticated AI workspace that brings together conversations, specialist agents, user-scoped memory, files, voice input, model selection, and inline image generation. Its central design premise is that a useful assistant should preserve context and make work resumable, rather than act as an isolated text box.

## What is implemented

| Area | Implementation |
| --- | --- |
| Authentication | Manus OAuth protects all `/app` routes. Unauthenticated visitors see a clear sign-in gate. |
| Chat | Markdown conversations are persisted per user and can be reopened from **History**. Assistant text is progressively rendered in the UI. |
| Agents | Create, edit, archive, name, and configure agents with a role, system instructions, preferred model, and memory toggle. |
| Memory | Each agent can retain user-authorized notes that are applied only to that agent’s subsequent conversations. |
| Files | Users may upload supported images, audio, video, PDF, text, JSON, and CSV files up to 16 MB. File metadata is persisted; bytes reside in object storage. |
| Voice | The browser records audio, uploads it, transcribes it server-side, and automatically submits the recognized text to the assistant. |
| Images | Explicit image requests or the **Изображение** mode invoke the image-generation adapter; the result appears inline in the conversation. |
| Models | Available LLM models are loaded from the live server-side catalog. Users can choose a model for a chat, agent, or default setting. |
| Safety | The interface exposes no credentials. All data procedures are authenticated and scoped to the current user. |

The authenticated sidebar intentionally contains **exactly five sections, in this order**: **Chat**, **Agents**, **History**, **Files**, and **Settings**.

## Architecture

```text
React client (dark ORBIT dashboard)
  ├─ protected workspace routes
  ├─ chat, agent, history, file, and settings views
  └─ browser microphone capture
          │
          ▼
tRPC server (authenticated procedures)
  ├─ assistant orchestration + live model discovery
  ├─ agent, thread, message, memory, file, and settings services
  ├─ image generation adapter
  └─ transcription adapter
          │
          ├─ MySQL / TiDB: metadata and user-scoped records
          └─ S3-compatible object storage: file bytes and generated images
```

The user-facing interface is Russian-first, while its route and domain vocabulary are suitable for later internationalization. The original visual system uses a graphite foundation with violet and cyan accents, restrained surfaces, keyboard focus treatment, responsive dashboard behavior, and reduced-motion support.

## Run locally

The managed project already supplies its OAuth, database, object-storage, and internal AI credentials. In a local Manus development workspace:

```bash
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm check
pnpm test
pnpm build
```

## Environment variables

Use `.env.example` only as a description of the names expected by the runtime. Do **not** commit credentials or put provider keys in the browser bundle. In the managed environment, platform-managed values are injected automatically.

## Design research and originality

The supplied repositories were examined only as research material. ORBIT incorporates generalized ideas such as controllable agents, a durable session layer, visual workflow thinking, verification, private memory, multimodal inputs, and long-running task boundaries. It does **not** copy their source code, branding, logos, names, proprietary interfaces, or credentials.

## Current boundaries and extension points

The available LLM helper returns completed responses rather than exposing a transport-level token stream. ORBIT therefore renders a completed response progressively for a responsive chat experience. For true server-sent token streaming, add an authenticated SSE endpoint around a provider that supports streaming and keep the existing message persistence model.

The current application deliberately does not expose arbitrary tool execution, external side effects, unsandboxed code execution, or customer-facing integrations. A future orchestration layer should require explicit approval before external writes, publishing, deletion, or message delivery. Similarly, schedules, autonomous workers, and visual workflow execution should be implemented as a queued background service with clear limits and an approval step, not as hidden browser work.

## Security notes

All external files and transcribed or generated content are treated as untrusted data. Attachment inputs are size and MIME constrained before object storage, database access is scoped to the authenticated user, and the server creates signed URLs only when passing eligible attachments to model adapters. Secrets are never sent to the client, saved in messages, or included in UI logs.
