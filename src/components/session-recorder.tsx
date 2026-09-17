"use client";

import { useEffect, useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "paused" | "ready";

export function SessionRecorder({ maxDuration, onReady }: { maxDuration: number; onReady: (file: File, durationSeconds: number) => Promise<void> }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  function stopTimer() { if (timer.current) clearInterval(timer.current); timer.current = null; }
  function releaseStream() { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; }

  useEffect(() => () => { stopTimer(); releaseStream(); }, []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setError("这个浏览器不能直接录音。你可以选择本地音频文件上传。"); return; }
    setError("");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      setSeconds(0);
      const mediaRecorder = new MediaRecorder(stream.current);
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        stopTimer();
        releaseStream();
        const blob = new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" });
        if (!blob.size) { setState("idle"); return; }
        setIsUploading(true);
        try { await onReady(new File([blob], `recording-${Date.now()}.webm`, { type: blob.type || "audio/webm" }), seconds); setState("ready"); }
        catch { setError("录音已完成，但暂时没有上传成功。请重试或保留本地音频文件。"); setState("idle"); }
        finally { setIsUploading(false); }
      };
      mediaRecorder.start();
      setState("recording");
      timer.current = setInterval(() => setSeconds((current) => {
        if (current + 1 >= maxDuration) mediaRecorder.stop();
        return current + 1;
      }), 1000);
    } catch { setError("没有取得麦克风权限。你也可以选择本地音频文件。"); }
  }

  function pauseOrResume() {
    if (!recorder.current) return;
    if (state === "recording") { recorder.current.pause(); stopTimer(); setState("paused"); }
    else if (state === "paused") { recorder.current.resume(); timer.current = setInterval(() => setSeconds((current) => current + 1), 1000); setState("recording"); }
  }
  function stop() { if (recorder.current?.state !== "inactive") recorder.current?.stop(); }
  function discard() {
    stopTimer();
    const activeRecorder = recorder.current;
    if (activeRecorder && activeRecorder.state !== "inactive") activeRecorder.onstop = null;
    activeRecorder?.stop();
    releaseStream();
    chunks.current = [];
    setSeconds(0);
    setState("idle");
  }
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return <section className="recorder" aria-label="录音"><div><p className="recording-time">{time}</p><p className="quiet-copy">最多 {Math.floor(maxDuration / 60)} 分钟。说到哪里都可以。</p></div>{state === "idle" && <button className="button button-primary" type="button" onClick={start}>开始录音</button>}{(state === "recording" || state === "paused") && <div className="record-actions"><button className="button button-secondary" type="button" onClick={pauseOrResume}>{state === "recording" ? "暂停" : "继续"}</button><button className="button button-primary" type="button" onClick={stop}>结束录音</button><button className="text-button danger" type="button" onClick={discard}>取消</button></div>}{isUploading && <p className="quiet-copy">正在保存录音...</p>}{state === "ready" && <p className="saved-copy">录音已保存。还可以再补充文字或照片。</p>}{error && <p className="form-error" role="alert">{error}</p>}</section>;
}
