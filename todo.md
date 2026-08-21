# Project TODO

- [x] Review the supplied product prompt and research archives for reusable, license-safe architecture patterns.
- [x] Define original ORBIT domain models for agents, conversations, messages, memory notes, attachments, settings, and generated media.
- [x] Create persistent database schema and protected tRPC procedures scoped to the authenticated user.
- [x] Implement Manus OAuth-aware protected workspace routing and a dashboard shell.
- [x] Register protected workspace routes and verify the OAuth login gate for unauthenticated visitors.
- [x] Create the sidebar with exactly these sections, in order: Chat, Agents, History, Files, Settings.
- [x] Implement a polished responsive Chat workspace with progressive markdown message rendering.
- [x] Add model selection, default-model preferences, custom assistant behavior, and a default system prompt.
- [x] Implement creation, editing, naming, and management of agents with custom system prompts and persistent agent memory.
- [x] Persist conversation threads and messages per user; support browsing history and resuming a thread.
- [x] Add secure file upload and attachments for documents and images in conversations.
- [x] Add microphone capture, transcription, automatic message submission, and visible transcription states.
- [x] Add image generation from text and show generated images inline in chat messages.
- [x] Build Files, Agents, History, and Settings pages with loading, empty, error, and success states.
- [x] Add and verify persistent query-error views on Files, Agents, History, and Settings rather than relying only on mutation notifications.
- [x] Re-run TypeScript and test validation after the management-page error states are confirmed.
- [x] Add Vitest coverage for core data transformations.
- [x] Add Vitest coverage for anonymous denial on protected assistant, history, file, memory, and settings routes.
- [x] Add integration coverage for authenticated assistant sends and cross-user resource isolation before enabling multi-user collaboration.
- [x] Verify TypeScript, tests, desktop and mobile rendering.
- [x] Verify core browser screen and route flows; authenticated agent, file, voice, image, and history mutations remain covered by procedure tests and require owner acceptance testing with a real account.
- [ ] Create a final checkpoint and deliver the implementation summary.
- [x] Investigate and eliminate the landing-page-to-login loop reported when opening the workspace.
- [x] Remove the public marketing landing page and make the auth screen the root entry route.
- [x] Implement local login and registration with username, password, password confirmation, hashed credentials, and protected application sessions.
- [x] Remove personal e-mail and platform-brand wording from all ORBIT-controlled login and dashboard UI.
- [x] Document that the platform-owned development-preview badge is outside ORBIT source control and must be visually checked by the owner after publishing.
- [x] Remove the Google sign-in control and all deferred Google OAuth references from the authentication experience.
- [x] Test local registration, credential verification, session issuance, and protected-route redirect behavior through router tests and an unauthenticated browser session.
- [ ] Manually verify authenticated flows with a real local account: create an agent, send chat, upload an attachment, trigger voice transcription auto-send, generate an inline image, and resume history.
- [x] Add targeted tests for authenticated agent save/archive, history creation, file upload, image-generation, and transcription routes; previous website-route tests were retired with the feature.
- [x] Remove app-side artificial message or generation quotas while preserving provider error handling and safe payload limits.
- [x] Create and integrate an original ORBIT logo and avatar as web-hosted static assets.
- [x] Add explicit creation modes for chat, image generation, and website generation.
- [x] Add an ORBIT Intelligence mode with a clear capability description and safe routing to the integrated AI service.
- [x] Present available model choices clearly without implying unsupported third-party model access.
- [x] Test image and website-generation interactions, mode selection, and output rendering.
- [x] Audit and document the absence of app-side message or generation quota logic while retaining safe payload and file-size safeguards.
- [ ] Manually verify authenticated inline image generation with a real local account; code and HTML requests remain standard Intelligence chat responses.
- [x] Add focused coverage for the shared client/server creation-mode contract and keep visual validation for the mode controls.
- [x] Diagnose and fix the reported light-theme regression so ORBIT always renders dark in the workspace.
- [x] Remove the separate website-generation mode, control, prompt card, HTML artifact path, and related presentation copy.
- [x] Preserve code and HTML generation as normal ORBIT Intelligence chat output rather than a standalone website tool.
- [x] Add and verify an explicit Intelligence instruction for copyable code responses without publication claims.
- [x] Verify the dark theme and the simplified Intelligence/Image composer on desktop.
- [x] Verify the dark theme and simplified composer at the mobile breakpoint.
- [x] Diagnose why the outer dashboard shell can render with light semantic tokens while the chat panel is dark.
- [x] Lock the dark class and dark color tokens before first application render, including the HTML root and full dashboard shell.
- [x] Verify the complete desktop preview has no white outer shell, no low-contrast text, and no clipped workspace layout.
- [x] Record a final post-restart desktop inspection confirming dark root and shell surfaces, readable contrast, and an unclipped workspace layout.
- [x] Confirm the written dark-theme inspection record and checkpoint it with the hard-dark shell fix.
- [x] Fix storage presign failures caused by Cyrillic or non-ASCII attachment names.
- [x] Add regression tests proving display names may remain Unicode while storage paths are ASCII-only.
- [ ] Verify attachment upload succeeds with a Cyrillic filename.
- [x] Diagnose the transcription service request failure for microphone recordings.
- [x] Correct audio URL or storage-key handling and return actionable transcription errors.
- [x] Add a regression test for the protected transcription route, including signed-URL WebM audio and actionable provider failure output.
- [ ] Verify the microphone auto-send flow with a real recording after the transcription fix.
- [x] Add a browser speech-recognition fallback that automatically sends recognized text if the remote transcription provider is unavailable.
- [x] Add a Voice Chat section to the left navigation and protected routing.
- [x] Build a dark voice-conversation screen with a central interactive orbit control and clear listening/thinking/speaking states.
- [x] Connect speech recognition, ORBIT Intelligence replies, and in-browser speech synthesis for hands-free conversation.
- [x] Provide transcript visibility, browser capability fallbacks, stop controls, and accessible status announcements.
- [x] Test voice-chat navigation, responsive state rendering, answer panels, and voice-synthesis fallback behavior.
- [ ] Manually verify a real Voice Chat conversation with microphone permission and audible speech synthesis in a supported browser.
- [x] Add focused coverage for the no-speech-synthesis fallback and document text-only answer behavior.
- [x] Document the Voice Chat text-only fallback when browser speech synthesis is unavailable.

- [x] Проанализировать архив orbit-voice.zip и определить, содержит ли он распознавание речи, синтез речи или готовый голосовой интерфейс.
- [x] Сопоставить найденные голосовые компоненты с текущим браузерным Voice Chat ORBIT без ElevenLabs.
- [x] Улучшить Voice Chat ORBIT на основе безопасных компонентов из архива, если они совместимы.
- [x] Проверить тесты и визуальное состояние Voice Chat после улучшений.
- [x] Сообщить пользователю, какие голосовые возможности найдены в архиве и что изменено в ORBIT.
- [ ] Не подключать ElevenLabs и не запрашивать ELEVENLABS_API_KEY.

- [x] Сделать браузерный Voice Chat более естественным для русской речи без Charon, Gemini и ElevenLabs.
- [x] Настроить приоритет мужских системных голосов и понятное уведомление, если мужской голос отсутствует в ОС.
- [x] Усилить очистку текста перед озвучиванием: не произносить Markdown, пунктуационные знаки, звёздочки, кодовые символы и служебные маркеры.
- [x] Добавить тесты для выбора мужского голоса и очистки текста перед speechSynthesis.
- [x] Проверить обновлённый Voice Chat визуально и автоматическими тестами.
- [x] Не подключать Gemini Charon, Gemini API или ElevenLabs для этого улучшения.

- [x] Убрать правую панель контекста из Chat и растянуть беседу на всю доступную ширину.
- [x] Добавить возможность свернуть и развернуть левую панель, чтобы беседа занимала весь экран.
- [x] Исследовать доступные варианты более естественной озвучки без ElevenLabs и без публикации секретов.
- [x] Улучшить браузерную озвучку ORBIT для более человеческой русской речи, сохранив очистку служебных знаков.
- [x] Проверить доступные профили Manus и добавить только реально поддерживаемые Max и Lite режимы.
- [x] Добавить тесты и визуальную проверку для нового Chat layout, голосовых улучшений и профилей моделей.
- [x] Не подключать ElevenLabs и не использовать ключи, отправленные в чат.

- [x] Проверить отсутствие искусственных лимитов на сообщения, изображения и другие функции ORBIT.
- [x] Удалить найденные app-side квоты, оставив только технические ограничения безопасности и ограничения провайдера.
- [x] Добавить или обновить тесты, подтверждающие отсутствие искусственных квот.
- [x] Сохранить checkpoint после проверки безлимитного режима.

- [x] Настроить браузерную озвучку Voice Chat для более естественного мужского звучания: темп, pitch, паузы и подготовка фраз.
- [x] Добавить тесты для естественного разбиения и подготовки текста к speechSynthesis.
- [x] Проверить Voice Chat и сохранить checkpoint после настройки голоса.

- [x] Проанализировать orbit-voice(1).zip как визуальный референс и выделить полезные UX-паттерны.
- [x] Улучшить дизайн Voice Chat ORBIT по референсу, сохранив тёмную тему, доступность и браузерный голос.
- [x] Проверить обновлённый Voice Chat на desktop и mobile, обновить тесты и сохранить checkpoint.

- [x] Исправить озвучивание сокращений и технических обозначений: не обрезать слова, раскрывать распространённые сокращения и сохранять смысл полного ответа.
- [x] Добавить тесты для раскрытия сокращений и сохранения полных слов перед speechSynthesis.
- [x] Проверить Voice Chat и сохранить checkpoint после исправления сокращений.

- [x] Подготовить и опубликовать актуальную версию ORBIT в приватном GitHub-репозитории.
- [x] Проверить ссылку и состояние опубликованного GitHub-репозитория.

- [x] Сделать GitHub-репозиторий ORBIT публичным.
- [x] Проверить публичный статус и доступность GitHub-ссылки.

- [x] Проверить, как GitHub Pages выбирает README вместо приложения.
- [x] Подготовить публикацию без README только если это не ломает исходный ORBIT.
- [x] Проверить результат и явно документировать ограничение отсутствия backend на GitHub Pages.

- [x] Добавить опубликованный Manus URL как официальный сайт GitHub-репозитория ORBIT.
- [x] Настроить GitHub Pages-переход на рабочий Manus ORBIT вместо README.
- [x] Проверить публичные ссылки GitHub и Manus после связывания: прямой GitHub index.html ведёт на рабочий Manus ORBIT.
