# ORBIT Architecture Notes

## Responsibility boundaries

The client is responsible for presentation, keyboard-accessible interaction, microphone capture, progressive message display, and authenticated route entry. It never receives model-provider credentials or direct storage credentials.

The tRPC server is responsible for authorization, thread ownership, metadata persistence, model invocation, signed attachment URLs, transcription, image generation, and error normalization. Every persistence helper accepts the authenticated user identifier and uses it in its selection criteria. File bytes are intentionally stored outside the database; the database stores only metadata and the object-storage key.

## Core records

| Record | Scope | Purpose |
| --- | --- | --- |
| `orbit_agents` | User | Agent role, instructions, preferred model, and memory status. |
| `orbit_threads` | User | Resumable conversation metadata. |
| `orbit_messages` | User + thread | User and assistant content with attachment references. |
| `orbit_files` | User | Object-storage metadata for uploaded files. |
| `orbit_memory_notes` | User + optional agent | Explicit, durable agent context. |
| `orbit_user_settings` | User | Default model, default prompt, and response style. |

## Provider adapter model

The assistant route combines core ORBIT safety instructions, user default instructions, selected-agent instructions, and permitted agent memory before calling the model adapter. It discovers available model IDs at runtime instead of maintaining a hard-coded catalog. Image generation and voice transcription are independent server-side adapters; their results are saved as normal chat attachments.

## Future background work

Long-running workflows, schedules, and autonomous jobs are intentionally out of scope for the current request. When introduced, they should use a durable queue, worker ownership, run records, event sequencing, token/time/cost limits, and mandatory human approval before a destructive or external action. The web process should remain stateless in the default managed runtime.
