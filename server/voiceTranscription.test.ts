import { describe, expect, it } from "vitest";
import { getFileExtension, normalizeAudioMimeType } from "./_core/voiceTranscription";

describe("voice transcription MIME normalization", () => {
  it("removes MediaRecorder codec parameters before choosing a file extension", () => {
    const mimeType = normalizeAudioMimeType("audio/webm;codecs=opus");
    expect(mimeType).toBe("audio/webm");
    expect(getFileExtension(mimeType)).toBe("webm");
  });

  it("keeps supported audio formats recognizable", () => {
    expect(getFileExtension(normalizeAudioMimeType("audio/mp4"))).toBe("m4a");
    expect(getFileExtension(normalizeAudioMimeType("audio/ogg"))).toBe("ogg");
  });
});
