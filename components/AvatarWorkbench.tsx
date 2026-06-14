"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AvatarStage from "@/components/AvatarStage";
import StatusBadge from "@/components/StatusBadge";
import TranscriptPanel from "@/components/TranscriptPanel";
import { deriveExpressionFromText } from "@/lib/avatar/expressionMapper";
import { startFakeLipSync } from "@/lib/avatar/lipSync";
import {
  createBrowserSpeechRecognition,
  getBrowserVoices,
  speakWithBrowser,
  supportsBrowserSpeechRecognition,
  type BrowserSpeechRecognition,
  type BrowserVoiceOption,
  type BrowserVoiceSettings,
} from "@/lib/voice/browserSpeech";
import type { AvatarExpression, AvatarState, TranscriptEntry } from "@/types/avatar";

const VOICE_OUTPUT_STORAGE_KEY = "avatar.voiceOutputEnabled.v1";
const VOICE_SETTINGS_STORAGE_KEY = "avatar.voiceSettings.v1";
const DEFAULT_VOICE_SETTINGS: BrowserVoiceSettings = {
  voiceURI: "",
  rate: 0.95,
  pitch: 1.05,
};

export default function AvatarWorkbench() {
  const [state, setState] = useState<AvatarState>("idle");
  const [expression, setExpression] = useState<AvatarExpression>("comfort");
  const [mouthOpen, setMouthOpen] = useState(0);
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [dialogueQueue, setDialogueQueue] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modelInput, setModelInput] = useState("");
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [voiceInputSupported, setVoiceInputSupported] = useState(false);
  const [voiceInputActive, setVoiceInputActive] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [voices, setVoices] = useState<BrowserVoiceOption[]>([]);
  const [voiceSettings, setVoiceSettings] = useState(DEFAULT_VOICE_SETTINGS);

  const lipSyncStopRef = useRef<(() => void) | null>(null);
  const modelAbortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechCancelRef = useRef<(() => void) | null>(null);

  const nextId = useMemo(() => {
    let counter = 0;
    return () => `${Date.now()}-${counter += 1}`;
  }, []);

  const stopLipSync = useCallback(() => {
    lipSyncStopRef.current?.();
    lipSyncStopRef.current = null;
    setMouthOpen(0);
  }, []);

  const stopVoiceInput = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      recognition.stop();
    }
    setVoiceInputActive(false);
    setState((current) => current === "listening" ? "idle" : current);
  }, []);

  const cancelSpeech = useCallback(() => {
    speechCancelRef.current?.();
    speechCancelRef.current = null;
    stopLipSync();
    setState((current) => current === "speaking" ? "idle" : current);
  }, [stopLipSync]);

  useEffect(() => {
    setVoiceInputSupported(supportsBrowserSpeechRecognition());
    const storedVoiceOutput = window.localStorage.getItem(VOICE_OUTPUT_STORAGE_KEY);
    if (storedVoiceOutput === "false") setVoiceOutputEnabled(false);
    const storedVoiceSettings = window.localStorage.getItem(VOICE_SETTINGS_STORAGE_KEY);
    if (storedVoiceSettings) {
      try {
        const parsed = JSON.parse(storedVoiceSettings) as Partial<BrowserVoiceSettings>;
        setVoiceSettings({
          voiceURI: typeof parsed.voiceURI === "string" ? parsed.voiceURI : "",
          rate: typeof parsed.rate === "number" ? parsed.rate : DEFAULT_VOICE_SETTINGS.rate,
          pitch: typeof parsed.pitch === "number" ? parsed.pitch : DEFAULT_VOICE_SETTINGS.pitch,
        });
      } catch {
        window.localStorage.removeItem(VOICE_SETTINGS_STORAGE_KEY);
      }
    }

    const refreshVoices = () => setVoices(getBrowserVoices());
    refreshVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", refreshVoices);

    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", refreshVoices);
      lipSyncStopRef.current?.();
      modelAbortRef.current?.abort();
      recognitionRef.current?.abort();
      speechCancelRef.current?.();
    };
  }, []);

  const activeDialogue = useMemo(
    () => messages.find((entry) => entry.id === dialogueQueue[0]),
    [dialogueQueue, messages]
  );
  const previousNoraDialogue = useMemo(
    () => [...messages].reverse().find(
      (entry) =>
        entry.speaker === "nora" &&
        entry.id !== dialogueQueue[0] &&
        entry.text.trim()
    ),
    [dialogueQueue, messages]
  );

  const dismissActiveDialogue = useCallback(() => {
    cancelSpeech();
    setDialogueQueue((current) => current.slice(1));
  }, [cancelSpeech]);

  const toggleVoiceInput = useCallback(() => {
    if (voiceInputActive) {
      stopVoiceInput();
      return;
    }
    if (!voiceInputSupported || state !== "idle" || isModelLoading) return;

    const baseInput = modelInput.trim();
    const recognition = createBrowserSpeechRecognition({
      onTranscript: (transcript) => {
        const separator = baseInput && transcript ? " " : "";
        setModelInput(`${baseInput}${separator}${transcript}`);
      },
      onError: (message) => setError(message),
      onEnd: () => {
        recognitionRef.current = null;
        setVoiceInputActive(false);
        setState((current) => current === "listening" ? "idle" : current);
      },
    });

    if (!recognition) {
      setVoiceInputSupported(false);
      setError("当前浏览器不支持语音识别，请使用最新版 Chrome 或 Edge。");
      return;
    }

    setError(null);
    recognitionRef.current = recognition;
    setVoiceInputActive(true);
    setState("listening");

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceInputActive(false);
      setState("idle");
      setError("无法启动语音识别，请检查麦克风权限。");
    }
  }, [
    isModelLoading,
    modelInput,
    state,
    stopVoiceInput,
    voiceInputActive,
    voiceInputSupported,
  ]);

  const toggleVoiceOutput = useCallback(() => {
    setVoiceOutputEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(VOICE_OUTPUT_STORAGE_KEY, String(next));
      if (!next) cancelSpeech();
      return next;
    });
  }, [cancelSpeech]);

  const updateVoiceSettings = useCallback((settings: BrowserVoiceSettings) => {
    const normalized = {
      voiceURI: settings.voiceURI,
      rate: Math.min(1.6, Math.max(0.5, settings.rate)),
      pitch: Math.min(1.6, Math.max(0.5, settings.pitch)),
    };
    setVoiceSettings(normalized);
    window.localStorage.setItem(VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  const speakSentence = useCallback(async (text: string) => {
    cancelSpeech();
    const playback = speakWithBrowser(text, voiceSettings, {
      onStart: () => {
        setState("speaking");
        lipSyncStopRef.current?.();
        lipSyncStopRef.current = startFakeLipSync(setMouthOpen);
      },
      onEnd: () => {
        speechCancelRef.current = null;
        stopLipSync();
        setState("idle");
      },
    });

    if (!playback) {
      setError("当前浏览器不支持语音朗读，文字回复仍可正常使用。");
      setState("idle");
      return;
    }

    speechCancelRef.current = playback.cancel;
    await playback.promise;
  }, [cancelSpeech, stopLipSync, voiceSettings]);

  const handleModelSubmit = async () => {
    const prompt = modelInput.trim();
    if (!prompt || isModelLoading || (state !== "idle" && state !== "listening")) return;

    stopVoiceInput();
    cancelSpeech();

    const history = messages
      .filter((entry) => entry.speaker === "user" || entry.speaker === "nora")
      .slice(-20)
      .map((entry) => ({
        role: entry.speaker === "user" ? "user" as const : "assistant" as const,
        content: entry.text,
      }));

    const userId = nextId();
    const assistantId = nextId();
    setMessages((current) => [
      ...current,
      { id: userId, speaker: "user", text: prompt },
      { id: assistantId, speaker: "nora", text: "" },
    ]);
    setDialogueQueue([assistantId]);
    setModelInput("");
    setError(null);
    setIsModelLoading(true);
    setState("thinking");
    setExpression("serious");

    const controller = new AbortController();
    modelAbortRef.current = controller;
    let reply = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null) as
          | { error?: string; details?: string }
          | null;
        throw new Error(payload?.details || payload?.error || `模型请求失败：${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";

        for (const eventBlock of events) {
          for (const line of eventBlock.split(/\r?\n/)) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;

            const chunk = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string | null } }>;
            };
            const delta = chunk.choices?.[0]?.delta?.content ?? "";
            if (!delta) continue;

            reply += delta;
            setMessages((current) =>
              current.map((entry) =>
                entry.id === assistantId ? { ...entry, text: reply } : entry
              )
            );
            setExpression(deriveExpressionFromText(reply, "comfort"));
          }
        }
      }

      if (!reply.trim()) throw new Error("模型返回了空回复。");

      setState("idle");
    } catch (requestError) {
      if (controller.signal.aborted) return;
      const message = requestError instanceof Error ? requestError.message : "模型请求失败";
      setError(message);
      setMessages((current) => current.filter((entry) => entry.id !== assistantId));
      setDialogueQueue((current) => current.filter((id) => id !== assistantId));
      setState("idle");
    } finally {
      if (!controller.signal.aborted) {
        setIsModelLoading(false);
        modelAbortRef.current = null;
      }
    }
  };

  const inputDisabled = isModelLoading || (state !== "idle" && state !== "listening");

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,#020617_0%,#020617_50%,#010409_100%)]" />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 pb-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-cyan-300/75">Avatar MVP</p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-white sm:text-4xl">
              Nora - AI Digital Human MVP
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              支持通用 OpenAI 兼容模型、场景字幕、浏览器语音输入与回复朗读。
            </p>
          </div>
          <StatusBadge state={state} />
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_420px]">
          <div className="flex min-h-[70vh] flex-col gap-4">
            <AvatarStage
              state={state}
              mouthOpen={mouthOpen}
              expression={expression}
              dialogue={activeDialogue}
              previousDialogue={previousNoraDialogue}
              onDismissDialogue={dismissActiveDialogue}
              modelInput={modelInput}
              modelInputDisabled={inputDisabled}
              modelLoading={isModelLoading}
              voiceInputSupported={voiceInputSupported}
              voiceInputActive={voiceInputActive}
              voiceOutputEnabled={voiceOutputEnabled}
              voices={voices}
              voiceSettings={voiceSettings}
              onModelInputChange={setModelInput}
              onModelSubmit={() => {
                void handleModelSubmit();
              }}
              onToggleVoiceInput={toggleVoiceInput}
              onToggleVoiceOutput={toggleVoiceOutput}
              onVoiceSettingsChange={updateVoiceSettings}
              onSpeakSentence={speakSentence}
              onStopSpeech={cancelSpeech}
            />

            {error ? (
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <strong className="mr-2">提示</strong>
                {error}
              </div>
            ) : null}
          </div>

          <TranscriptPanel messages={messages} />
        </div>
      </div>
    </main>
  );
}
