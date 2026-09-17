import type { MediaKind } from "./media-types";

type MediaFormat = { extension: string; mimeTypes: readonly string[] };

const formats: Record<MediaKind, readonly MediaFormat[]> = {
  AUDIO: [
    { extension: ".mp3", mimeTypes: ["audio/mpeg", "audio/mp3"] },
    { extension: ".m4a", mimeTypes: ["audio/mp4", "audio/x-m4a"] },
    { extension: ".aac", mimeTypes: ["audio/aac"] },
    { extension: ".wav", mimeTypes: ["audio/wav", "audio/x-wav"] },
    { extension: ".ogg", mimeTypes: ["audio/ogg"] },
    { extension: ".webm", mimeTypes: ["audio/webm"] },
  ],
  IMAGE: [
    { extension: ".jpg", mimeTypes: ["image/jpeg"] },
    { extension: ".jpeg", mimeTypes: ["image/jpeg"] },
    { extension: ".png", mimeTypes: ["image/png"] },
    { extension: ".heic", mimeTypes: ["image/heic"] },
    { extension: ".heif", mimeTypes: ["image/heif"] },
    { extension: ".webp", mimeTypes: ["image/webp"] },
  ],
  VIDEO: [
    { extension: ".mp4", mimeTypes: ["video/mp4"] },
    { extension: ".mov", mimeTypes: ["video/quicktime"] },
    { extension: ".m4v", mimeTypes: ["video/x-m4v", "video/mp4"] },
    { extension: ".webm", mimeTypes: ["video/webm"] },
  ],
};

export function acceptAttribute(kind: MediaKind) {
  const extensions = formats[kind].map((format) => format.extension);
  const mimeTypes = formats[kind].flatMap((format) => format.mimeTypes);
  return [...extensions, ...mimeTypes, `${kind.toLowerCase()}/*`].join(",");
}

export function isSupportedMedia(kind: MediaKind, fileName: string, mimeType: string) {
  const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return formats[kind].some((format) => format.extension === extension || format.mimeTypes.includes(mimeType.toLowerCase()));
}
