import { afterEach, describe, expect, it } from "vitest";
import { acceptAttribute, isSupportedMedia } from "./media-formats";
import { getAudioDurationLimitSeconds, getMediaLimitBytes, validateMediaFile } from "./media";

afterEach(() => {
  delete process.env.MAX_IMAGE_MB;
  delete process.env.MAX_AUDIO_DURATION_SECONDS;
});

describe("private media constraints", () => {
  it("enforces the configured image size limit", () => {
    process.env.MAX_IMAGE_MB = "1";
    const tooLarge = new File([new Uint8Array(1024 * 1024 + 1)], "photo.jpg", { type: "image/jpeg" });
    expect(getMediaLimitBytes("IMAGE")).toBe(1024 * 1024);
    expect(validateMediaFile("IMAGE", tooLarge)).toContain("超过当前限制");
  });

  it("rejects a media type that does not match its input", () => {
    const textFile = new File(["not a photo"], "note.txt", { type: "text/plain" });
    expect(validateMediaFile("IMAGE", textFile)).toBe("图片格式不支持。");
  });

  it("accepts MP3 by extension when a mobile browser omits the MIME type", () => {
    const mp3 = new File(["audio"], "voice-note.mp3");
    expect(validateMediaFile("AUDIO", mp3)).toBeNull();
    expect(isSupportedMedia("AUDIO", "voice-note.mp3", "")).toBe(true);
    expect(acceptAttribute("AUDIO")).toContain(".mp3");
  });

  it("uses the configured audio duration limit", () => {
    process.env.MAX_AUDIO_DURATION_SECONDS = "120";
    expect(getAudioDurationLimitSeconds()).toBe(120);
  });
});
