"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSentenceDisplayDuration,
  splitDialogueSentences,
} from "@/lib/dialogue/splitDialogueSentences";
import type { BrowserVoiceOption, BrowserVoiceSettings } from "@/lib/voice/browserSpeech";
import type { SceneDialogueEntry } from "@/types/avatar";

type PlaybackMode = "auto" | "manual";
type DisplayStyle = "bubble" | "subtitle";

type SceneDialogueOverlayProps = {
  dialogue?: SceneDialogueEntry;
  previousDialogue?: SceneDialogueEntry;
  onDismiss: () => void;
  input: string;
  inputDisabled: boolean;
  loading: boolean;
  voiceInputSupported: boolean;
  voiceInputActive: boolean;
  voiceOutputEnabled: boolean;
  voices: BrowserVoiceOption[];
  voiceSettings: BrowserVoiceSettings;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onToggleVoiceInput: () => void;
  onToggleVoiceOutput: () => void;
  onVoiceSettingsChange: (settings: BrowserVoiceSettings) => void;
  onSpeakSentence: (sentence: string) => Promise<void>;
  onStopSpeech: () => void;
};

const MODE_STORAGE_KEY = "avatar.dialoguePlaybackMode.v1";
const STYLE_STORAGE_KEY = "avatar.dialogueDisplayStyle.v1";

export default function SceneDialogueOverlay({
  dialogue,
  previousDialogue,
  onDismiss,
  input,
  inputDisabled,
  loading,
  voiceInputSupported,
  voiceInputActive,
  voiceOutputEnabled,
  voices,
  voiceSettings,
  onInputChange,
  onSubmit,
  onToggleVoiceInput,
  onToggleVoiceOutput,
  onVoiceSettingsChange,
  onSpeakSentence,
  onStopSpeech,
}: SceneDialogueOverlayProps) {
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("auto");
  const [displayStyle, setDisplayStyle] = useState<DisplayStyle>("subtitle");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const sentences = useMemo(
    () => splitDialogueSentences(dialogue?.text ?? ""),
    [dialogue?.text]
  );
  const isUser = dialogue?.speaker === "user";
  const previousSentence = useMemo(() => {
    const previousSentences = splitDialogueSentences(previousDialogue?.text ?? "");
    return previousSentences.at(-1) ?? "";
  }, [previousDialogue?.text]);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
    const storedStyle = window.localStorage.getItem(STYLE_STORAGE_KEY);
    if (storedMode === "auto" || storedMode === "manual") setPlaybackMode(storedMode);
    if (storedStyle === "bubble" || storedStyle === "subtitle") setDisplayStyle(storedStyle);
  }, []);

  useEffect(() => {
    setSentenceIndex(0);
  }, [dialogue?.id]);

  useEffect(() => {
    setSentenceIndex((current) => Math.min(current, Math.max(0, sentences.length - 1)));
  }, [sentences.length]);

  useEffect(() => {
    if (
      playbackMode !== "auto" ||
      sentences.length === 0 ||
      loading ||
      (voiceOutputEnabled && !isUser)
    ) return;

    const timer = window.setTimeout(() => {
      if (sentenceIndex >= sentences.length - 1) {
        onDismiss();
        return;
      }
      setSentenceIndex((current) => Math.min(current + 1, sentences.length - 1));
    }, getSentenceDisplayDuration(sentences[sentenceIndex]));

    return () => window.clearTimeout(timer);
  }, [
    isUser,
    loading,
    onDismiss,
    playbackMode,
    sentenceIndex,
    sentences,
    voiceOutputEnabled,
  ]);

  useEffect(() => {
    const sentence = sentences[sentenceIndex];
    if (
      !dialogue ||
      isUser ||
      loading ||
      !voiceOutputEnabled ||
      !sentence
    ) return;

    let active = true;
    let advanceTimer = 0;

    void onSpeakSentence(sentence).then(() => {
      if (!active || playbackMode !== "auto") return;
      advanceTimer = window.setTimeout(() => {
        if (sentenceIndex >= sentences.length - 1) onDismiss();
        else setSentenceIndex((current) => Math.min(current + 1, sentences.length - 1));
      }, 250);
    });

    return () => {
      active = false;
      window.clearTimeout(advanceTimer);
      onStopSpeech();
    };
  }, [
    dialogue,
    isUser,
    loading,
    onDismiss,
    onSpeakSentence,
    onStopSpeech,
    playbackMode,
    sentenceIndex,
    sentences,
    voiceOutputEnabled,
    voiceSettings,
  ]);

  const setMode = (mode: PlaybackMode) => {
    setPlaybackMode(mode);
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  };

  const setStyle = (style: DisplayStyle) => {
    setDisplayStyle(style);
    window.localStorage.setItem(STYLE_STORAGE_KEY, style);
  };

  const previousDialoguePanel = previousSentence ? (
    <div className="absolute left-4 top-4 max-w-[min(360px,42%)] rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-left shadow-lg backdrop-blur-md">
      <div className="mb-1 text-[9px] uppercase tracking-[0.2em] text-slate-500">
        Nora · 上一句
      </div>
      <p className="line-clamp-3 text-[11px] leading-5 text-slate-300">
        {previousSentence}
      </p>
    </div>
  ) : null;

  if (sentences.length === 0) {
    if (dialogue) {
      return (
        <div className="pointer-events-none absolute inset-0 z-20">
          {previousDialoguePanel}
          <div className="absolute inset-x-[8%] bottom-14 rounded-2xl border border-white/15 bg-slate-950/80 px-6 py-4 text-center shadow-2xl backdrop-blur-md">
            <div className="mb-1 text-[10px] uppercase tracking-[0.24em] text-cyan-200/80">
              Nora
            </div>
            <p className="animate-pulse text-sm text-slate-300">正在组织回应...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="pointer-events-none absolute inset-0 z-20">
        {previousDialoguePanel}
        <form
          className="pointer-events-auto absolute inset-x-[8%] bottom-14 rounded-2xl border border-white/15 bg-slate-950/80 px-5 py-4 shadow-2xl backdrop-blur-md"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-amber-200/90">
            You
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="在这里输入台词，Enter 发送，Shift+Enter 换行"
              rows={2}
              disabled={inputDisabled}
              className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-60 sm:text-base"
            />
            <button
              type="button"
              onClick={onToggleVoiceInput}
              disabled={!voiceInputSupported || inputDisabled}
              title={voiceInputSupported ? "语音输入" : "当前浏览器不支持语音识别"}
              className={[
                "rounded-xl border px-3 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-35",
                voiceInputActive
                  ? "animate-pulse border-rose-300/40 bg-rose-400/20 text-rose-100"
                  : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20",
              ].join(" ")}
            >
              {voiceInputActive ? "停止" : "语音"}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || inputDisabled}
              className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-100 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "回复中..." : "发送"}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-400">
            <span>{voiceInputActive ? "正在识别，说完后可检查文字再发送" : "语音识别不会自动发送"}</span>
            <button
              type="button"
              onClick={onToggleVoiceOutput}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
            >
              回复朗读：{voiceOutputEnabled ? "开" : "关"}
            </button>
            <button
              type="button"
              onClick={() => setShowVoiceSettings((current) => !current)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
            >
              声音设置
            </button>
          </div>
          {showVoiceSettings ? (
            <VoiceSettingsPanel
              voices={voices}
              settings={voiceSettings}
              onChange={onVoiceSettingsChange}
              onPreview={() => void onSpeakSentence("你好，我是 Nora，很高兴陪你聊聊天。")}
            />
          ) : null}
        </form>
      </div>
    );
  }

  const isLastSentence = sentenceIndex >= sentences.length - 1;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {previousDialoguePanel}
      <div className="pointer-events-auto absolute right-4 top-4 flex gap-1 rounded-xl border border-white/10 bg-slate-950/75 p-1 text-[10px] text-slate-300 backdrop-blur">
        <button
          type="button"
          onClick={onToggleVoiceOutput}
          className="rounded-lg px-2 py-1 hover:bg-white/10"
        >
          声音 {voiceOutputEnabled ? "开" : "关"}
        </button>
        <button
          type="button"
          onClick={() => setShowVoiceSettings((current) => !current)}
          className="rounded-lg px-2 py-1 hover:bg-white/10"
        >
          音色
        </button>
        <button
          type="button"
          onClick={() => setStyle(displayStyle === "subtitle" ? "bubble" : "subtitle")}
          className="rounded-lg px-2 py-1 hover:bg-white/10"
        >
          {displayStyle === "subtitle" ? "字幕" : "气泡"}
        </button>
        <button
          type="button"
          onClick={() => setMode(playbackMode === "auto" ? "manual" : "auto")}
          className="rounded-lg px-2 py-1 hover:bg-white/10"
        >
          {playbackMode === "auto" ? "自动" : "手动"}
        </button>
      </div>

      {showVoiceSettings ? (
        <div className="pointer-events-auto absolute right-4 top-16 z-30 w-[min(320px,calc(100%-2rem))]">
          <VoiceSettingsPanel
            voices={voices}
            settings={voiceSettings}
            onChange={onVoiceSettingsChange}
            onPreview={() => void onSpeakSentence("你好，我是 Nora，很高兴陪你聊聊天。")}
          />
        </div>
      ) : null}

      <div
        className={
          displayStyle === "bubble"
            ? "absolute left-[56%] top-[18%] w-[min(360px,38%)]"
            : "absolute inset-x-[8%] bottom-14"
        }
      >
        <div
          className={[
            "pointer-events-auto relative border text-slate-50 shadow-2xl backdrop-blur-md",
            displayStyle === "bubble"
              ? "rounded-[1.5rem] border-white/20 bg-white/15 px-5 py-4"
              : "rounded-2xl border-white/15 bg-slate-950/80 px-6 py-4 text-center",
          ].join(" ")}
        >
          {displayStyle === "bubble" && (
            <span className="absolute -bottom-3 left-8 h-6 w-6 rotate-45 border-b border-r border-white/20 bg-white/15" />
          )}
          <div
            className={`mb-1 text-[10px] uppercase tracking-[0.24em] ${
              isUser ? "text-amber-200/90" : "text-cyan-200/80"
            }`}
          >
            {isUser ? "You" : "Nora"}
          </div>
          <p className="text-sm font-medium leading-7 sm:text-base">
            {sentences[sentenceIndex]}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-400">
            <span>{sentenceIndex + 1} / {sentences.length}</span>
            {playbackMode === "manual" && (
              <button
                type="button"
                onClick={() => {
                  if (isLastSentence) onDismiss();
                  else setSentenceIndex((current) => current + 1);
                }}
                className={`rounded-lg border px-3 py-1.5 ${
                  isUser
                    ? "border-amber-300/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
                    : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
                }`}
              >
                {isLastSentence ? "完成并关闭" : "确认，下一句"}
              </button>
            )}
            {playbackMode === "auto" && (
              <span>
                {isLastSentence ? "即将关闭" : "下一句"}约{" "}
                {(getSentenceDisplayDuration(sentences[sentenceIndex]) / 1000).toFixed(1)} 秒
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceSettingsPanel({
  voices,
  settings,
  onChange,
  onPreview,
}: {
  voices: BrowserVoiceOption[];
  settings: BrowserVoiceSettings;
  onChange: (settings: BrowserVoiceSettings) => void;
  onPreview: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/90 p-3 text-left text-[11px] text-slate-300 shadow-xl backdrop-blur">
      <label className="block">
        <span className="mb-1 block text-slate-400">系统音色</span>
        <select
          value={settings.voiceURI}
          onChange={(event) => onChange({ ...settings, voiceURI: event.target.value })}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none"
        >
          <option value="">自动选择中文音色</option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} ({voice.lang}){voice.localService ? "" : " · 在线"}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block">
        <span className="flex justify-between text-slate-400">
          <span>语速</span>
          <span>{settings.rate.toFixed(2)}x</span>
        </span>
        <input
          type="range"
          min="0.5"
          max="1.6"
          step="0.05"
          value={settings.rate}
          onChange={(event) => onChange({ ...settings, rate: Number(event.target.value) })}
          className="mt-1 w-full accent-cyan-400"
        />
      </label>
      <label className="mt-3 block">
        <span className="flex justify-between text-slate-400">
          <span>音高</span>
          <span>{settings.pitch.toFixed(2)}</span>
        </span>
        <input
          type="range"
          min="0.5"
          max="1.6"
          step="0.05"
          value={settings.pitch}
          onChange={(event) => onChange({ ...settings, pitch: Number(event.target.value) })}
          className="mt-1 w-full accent-cyan-400"
        />
      </label>
      <p className="mt-2 leading-4 text-slate-500">
        音色来自操作系统和浏览器。Edge 通常会提供更多在线中文音色。
      </p>
      <button
        type="button"
        onClick={onPreview}
        className="mt-3 w-full rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-cyan-100 hover:bg-cyan-400/20"
      >
        试听当前设置
      </button>
    </div>
  );
}
