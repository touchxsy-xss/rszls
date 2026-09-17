import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isSupportedMedia } from "./media-formats";
import type { MediaKind } from "./media-types";

export type { MediaKind } from "@/lib/media-types";

const config = {
  AUDIO: { env: "MAX_AUDIO_MB", defaultMegabytes: 200 },
  IMAGE: { env: "MAX_IMAGE_MB", defaultMegabytes: 10 },
  VIDEO: { env: "MAX_VIDEO_MB", defaultMegabytes: 100 },
} as const;

export function getMediaLimitBytes(kind: MediaKind) {
  const value = Number(process.env[config[kind].env] ?? config[kind].defaultMegabytes);
  return Math.max(1, value) * 1024 * 1024;
}

export function getAudioDurationLimitSeconds() {
  const value = Number(process.env.MAX_AUDIO_DURATION_SECONDS ?? 1800);
  return Math.max(1, value);
}

export function validateMediaFile(kind: MediaKind, file: File) {
  if (!isSupportedMedia(kind, file.name, file.type)) return `${kind === "AUDIO" ? "音频" : kind === "IMAGE" ? "图片" : "视频"}格式不支持。`;
  if (file.size === 0) return "不能上传空文件。";
  if (file.size > getMediaLimitBytes(kind)) return `文件超过当前限制（${Math.round(getMediaLimitBytes(kind) / 1024 / 1024)} MB）。`;
  return null;
}

function privateRoot() {
  return path.resolve(process.cwd(), "data/private-media");
}

function extensionFor(file: File) {
  const extension = path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, "");
  return extension || ".bin";
}

export async function storePrivateMedia(userId: string, file: File) {
  const key = path.posix.join(userId, `${randomUUID()}${extensionFor(file)}`);
  const destination = path.join(privateRoot(), key);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await file.arrayBuffer()));
  return key;
}

export async function readPrivateMedia(storageKey: string) {
  const root = privateRoot();
  const destination = path.resolve(root, storageKey);
  if (!destination.startsWith(`${root}${path.sep}`)) throw new Error("Invalid private media key.");
  return readFile(destination);
}

export async function removePrivateMedia(storageKey: string) {
  const root = privateRoot();
  const destination = path.resolve(root, storageKey);
  if (!destination.startsWith(`${root}${path.sep}`)) throw new Error("Invalid private media key.");
  try {
    await unlink(destination);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
