"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSentenceDisplayDuration,
  splitDialogueSentences,
} from "@/lib/dialogue/splitDialogueSentences";
import type { BrowserVoiceOption, BrowserVoiceSettings } from "@/lib/voice/browserSpeech";
import { uiText, useUiLanguage } from "@/lib/i18n/uiLanguage";
import type { SceneDialogueEntry } from "@/types/avatar";

type PlaybackMode = "auto" | "manual";
type DisplayStyle = "bubble" | "subtitle";

type SceneDialogueOverlayProps = {
  dialogue?: SceneDialogueEntry;
  recentDialogues: SceneDialogueEntry[];
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
  onPrefetchSentence: (sentence: string) => void;
  onStopSpeech: () => void;
  onSentenceChange: (sentence: string, index: number) => void;
};

const MODE_STORAGE_KEY = "avatar.dialoguePlaybackMode.v1";
const STYLE_STORAGE_KEY = "avatar.dialogueDisplayStyle.v1";

export default function SceneDialogueOverlay({
  dialogue,
  recentDialogues,
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
  onPrefetchSentence,
  onStopSpeech,
  onSentenceChange,
}: SceneDialogueOverlayProps) {
  const { language } = useUiLanguage();
  const t = (en: string, zh: string) => uiText(language, en, zh);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("auto");
  const [displayStyle, setDisplayStyle] = useState<DisplayStyle>("subtitle");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const expressionKeyRef = useRef("");
  const prefetchKeyRef = useRef("");
  const sentences = useMemo(
    () => splitDialogueSentences(dialogue?.text ?? ""),
    [dialogue?.text]
  );
  const isUser = dialogue?.speaker === "user";
  const recentSentences = useMemo(
    () => recentDialogues
      .flatMap((entry) => splitDialogueSentences(entry.text))
      .slice(-5),
    [recentDialogues]
  );

  useEffect(() => {
    const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
    const storedStyle = window.localStorage.getItem(STYLE_STORAGE_KEY);
    if (storedMode === "auto" || storedMode === "manual") setPlaybackMode(storedMode);
    if (storedStyle === "bubble" || storedStyle === "subtitle") setDisplayStyle(storedStyle);
  }, []);

  useEffect(() => {
    setSentenceIndex(0);
    expressionKeyRef.current = "";
    prefetchKeyRef.current = "";
  }, [dialogue?.id]);

  useEffect(() => {
    setSentenceIndex((current) => Math.min(current, Math.max(0, sentences.length - 1)));
  }, [sentences.length]);

  useEffect(() => {
    const sentence = sentences[sentenceIndex];
    if (!sentence || isUser) return;
    const expressionKey = `${dialogue?.id ?? "dialogue"}:${sentenceIndex}`;
    if (expressionKeyRef.current !== expressionKey) {
      expressionKeyRef.current = expressionKey;
      onSentenceChange(sentence, sentenceIndex);
    }

    const nextSentence = sentences[sentenceIndex + 1];
    const prefetchKey = `${dialogue?.id ?? "dialogue"}:${sentenceIndex + 1}:${nextSentence ?? ""}`;
    if (
      voiceOutputEnabled &&
      nextSentence &&
      prefetchKeyRef.current !== prefetchKey
    ) {
      prefetchKeyRef.current = prefetchKey;
      onPrefetchSentence(nextSentence);
    }
  }, [
    dialogue?.id,
    isUser,
    onPrefetchSentence,
    onSentenceChange,
    sentenceIndex,
    sentences,
    voiceOutputEnabled,
  ]);

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

  const previousDialoguePanel = recentSentences.length > 0 ? (
    <div className="pointer-events-auto absolute left-4 top-4 max-h-[min(38vh,320px)] w-[min(390px,44%)] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-left shadow-lg backdrop-blur-md [scrollbar-color:rgba(148,163,184,0.35)_transparent] [scrollbar-width:thin]">
      <div className="mb-1 text-[9px] uppercase tracking-[0.2em] text-slate-500">
        Nora · {t("Recent context", "最近 5 句")}
      </div>
      <div className="space-y-1.5">
        {recentSentences.map((sentence, index) => (
          <p
            key={`${index}-${sentence}`}
            className="whitespace-pre-wrap border-l border-white/10 pl-2 text-[11px] leading-5 text-slate-300"
          >
            {sentence}
          </p>
        ))}
      </div>
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
            <p className="animate-pulse text-sm text-slate-300">{t("Preparing a response...", "正在组织回应...")}</p>
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
              placeholder={t("Type here. Enter to send, Shift+Enter for a new line", "在这里输入台词，Enter 发送，Shift+Enter 换行")}
              rows={2}
              disabled={inputDisabled}
              className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-60 sm:text-base"
            />
            <button
              type="button"
              onClick={onToggleVoiceInput}
              disabled={!voiceInputSupported || inputDisabled}
              title={voiceInputSupported ? t("Voice input", "语音输入") : t("Speech recognition is unavailable", "当前浏览器不支持语音识别")}
              className={[
                "flex h-10 w-10 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-35",
                voiceInputActive
                  ? "animate-pulse border-rose-300/40 bg-rose-400/20 text-rose-100"
                  : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20",
              ].join(" ")}
            >
              {voiceInputActive ? <StopIcon /> : <MicrophoneIcon />}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || inputDisabled}
              title={t("Send", "发送")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <LoadingIcon /> : <SendIcon />}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-400">
            <span>
              {voiceInputActive
                ? t("Listening. Review the text before sending.", "正在识别，说完后可检查文字再发送")
                : t("Voice input will not send automatically.", "语音识别不会自动发送")}
            </span>
            <button
              type="button"
              onClick={onToggleVoiceOutput}
              title={voiceOutputEnabled ? t("Disable speech", "关闭回复朗读") : t("Enable speech", "开启回复朗读")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
            >
              <SpeakerIcon active={voiceOutputEnabled} />
            </button>
            <button
              type="button"
              onClick={() => setShowVoiceSettings((current) => !current)}
              title={t("Voice settings", "声音设置")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
            >
              <SlidersIcon />
            </button>
          </div>
          {showVoiceSettings ? (
            <VoiceSettingsPanel
              voices={voices}
              settings={voiceSettings}
              onChange={onVoiceSettingsChange}
              onPreview={() => void onSpeakSentence(t("Hello, I'm Nora. It's lovely to meet you.", "你好，我是 Nora，很高兴陪你聊聊天。"))}
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
      <div className="pointer-events-auto absolute right-4 top-16 flex gap-1 rounded-full border border-white/10 bg-slate-950/75 p-1 text-slate-300 backdrop-blur">
        <button
          type="button"
          onClick={onToggleVoiceOutput}
          title={voiceOutputEnabled ? t("Mute", "关闭声音") : t("Enable voice", "开启声音")}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <SpeakerIcon active={voiceOutputEnabled} />
        </button>
        <button
          type="button"
          onClick={() => setShowVoiceSettings((current) => !current)}
          title={t("Voice settings", "音色设置")}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <SlidersIcon />
        </button>
        <button
          type="button"
          onClick={() => setStyle(displayStyle === "subtitle" ? "bubble" : "subtitle")}
          title={displayStyle === "subtitle" ? t("Use speech bubble", "切换为气泡") : t("Use subtitles", "切换为字幕")}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          {displayStyle === "subtitle" ? <SubtitleIcon /> : <BubbleIcon />}
        </button>
        <button
          type="button"
          onClick={() => setMode(playbackMode === "auto" ? "manual" : "auto")}
          title={playbackMode === "auto" ? t("Use manual playback", "切换为手动") : t("Use automatic playback", "切换为自动")}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          {playbackMode === "auto" ? <AutoIcon /> : <ManualIcon />}
        </button>
      </div>

      {showVoiceSettings ? (
        <div className="pointer-events-auto absolute right-4 top-28 z-30 w-[min(320px,calc(100%-2rem))]">
          <VoiceSettingsPanel
            voices={voices}
            settings={voiceSettings}
            onChange={onVoiceSettingsChange}
            onPreview={() => void onSpeakSentence(t("Hello, I'm Nora. It's lovely to meet you.", "你好，我是 Nora，很高兴陪你聊聊天。"))}
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
            {isUser
              ? "You"
              : voiceOutputEnabled
                ? `Nora · ${t("AI voice", "AI 合成语音")}`
                : "Nora"}
          </div>
          <p className="whitespace-pre-wrap text-left text-sm font-medium leading-7 sm:text-base">
            {sentences[sentenceIndex]}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-400">
            <span>{sentenceIndex + 1} / {sentences.length}</span>
            {playbackMode === "manual" && (
              <button
                type="button"
                onClick={() => {
                  onStopSpeech();
                  if (isLastSentence) onDismiss();
                  else setSentenceIndex((current) => current + 1);
                }}
                className={`rounded-lg border px-3 py-1.5 ${
                  isUser
                    ? "border-amber-300/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
                    : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
                }`}
              >
                {isLastSentence ? t("Finish", "完成并关闭") : t("Next", "确认，下一句")}
              </button>
            )}
            {playbackMode === "auto" && (
              <span>
                {isLastSentence ? t("Closing in", "即将关闭") : t("Next in", "下一句约")}{" "}
                {(getSentenceDisplayDuration(sentences[sentenceIndex]) / 1000).toFixed(1)} {t("sec", "秒")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VoiceSettingsPanel({
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
  const { language } = useUiLanguage();
  const t = (en: string, zh: string) => uiText(language, en, zh);
  return (
    <div className="mt-3 max-h-[min(70vh,560px)] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/90 p-3 text-left text-[11px] text-slate-300 shadow-xl backdrop-blur [scrollbar-color:rgba(148,163,184,0.4)_transparent] [scrollbar-width:thin]">
      <label className="block">
        <span className="mb-1 block text-slate-400">{t("Voice engine", "语音引擎")}</span>
        <select
          value={settings.engine}
          onChange={(event) => onChange({
            ...settings,
            engine: event.target.value === "browser" ? "browser" : "cloud",
          })}
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none"
        >
          <option value="cloud">{t("Natural cloud voice", "自然云端语音")}</option>
          <option value="browser">{t("System browser voice", "系统浏览器语音")}</option>
        </select>
      </label>

      {settings.engine === "cloud" ? (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-slate-400">{t("Cloud provider", "云端供应商")}</span>
            <select
              value={settings.cloudProvider}
              onChange={(event) => {
                const provider = event.target.value === "openai" ? "openai" : "doubao";
                onChange({
                  ...settings,
                  cloudProvider: provider,
                  cloudBaseUrl: "",
                  cloudApiKey: "",
                  cloudModel: provider === "doubao" ? "seed-tts-2.0" : "gpt-4o-mini-tts",
                  cloudVoice: provider === "doubao" ? "zh_female_vv_uranus_bigtts" : "marin",
                });
              }}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none"
            >
              <option value="doubao">{t("Doubao Speech Synthesis 2.0", "豆包语音合成模型 2.0")}</option>
              <option value="openai">{t("OpenAI-compatible speech", "OpenAI 兼容语音")}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-slate-400">TTS Base URL</span>
            <input
              value={settings.cloudBaseUrl}
              onChange={(event) => onChange({ ...settings, cloudBaseUrl: event.target.value })}
              placeholder={t("Optional provider endpoint override", "可选：自定义供应商接口地址")}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none placeholder:text-slate-600"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-slate-400">
              {settings.cloudProvider === "doubao" ? "Doubao API Key" : "TTS API Key"}
            </span>
            <input
              type="password"
              value={settings.cloudApiKey}
              onChange={(event) => onChange({ ...settings, cloudApiKey: event.target.value })}
              placeholder={
                settings.cloudProvider === "doubao"
                  ? t("Enter your Doubao API Key", "填写你的豆包 API Key")
                  : t("Enter your TTS API Key", "填写你的 TTS API Key")
              }
              autoComplete="off"
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none placeholder:text-slate-600"
            />
          </label>
          {settings.cloudProvider === "doubao" ? (
            <>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                <div className="mb-2 text-slate-400">
                  {t(
                    "Legacy console credentials (only needed when API Key is unavailable)",
                    "旧控制台凭证（无法使用 API Key 时填写）"
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={settings.doubaoAppId}
                    onChange={(event) => onChange({ ...settings, doubaoAppId: event.target.value })}
                    placeholder="App ID"
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none"
                  />
                  <input
                    type="password"
                    value={settings.doubaoAccessToken}
                    onChange={(event) => onChange({
                      ...settings,
                      doubaoAccessToken: event.target.value,
                    })}
                    placeholder="Access Token"
                    autoComplete="off"
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-slate-400">Resource ID</span>
                  <input
                    value={settings.doubaoResourceId}
                    onChange={(event) => onChange({
                      ...settings,
                      doubaoResourceId: event.target.value,
                    })}
                    placeholder="seed-tts-2.0"
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-slate-400">Speaker ID</span>
                  <input
                    value={settings.cloudVoice}
                    onChange={(event) => onChange({ ...settings, cloudVoice: event.target.value })}
                    list="doubao-speaker-ids"
                    placeholder="zh_female_vv_uranus_bigtts"
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none"
                  />
                  <datalist id="doubao-speaker-ids">
                    <option value="zh_female_vv_uranus_bigtts">Vivi / Female</option>
                    <option value="zh_female_tianmeixiaoyuan_uranus_bigtts">
                      Sweet Campus / Female
                    </option>
                  </datalist>
                </label>
              </div>
            </>
          ) : (
            <>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-slate-400">{t("Model", "模型")}</span>
              <input
                value={settings.cloudModel}
                onChange={(event) => onChange({ ...settings, cloudModel: event.target.value })}
                placeholder="gpt-4o-mini-tts"
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-400">{t("Voice", "音色")}</span>
              <input
                value={settings.cloudVoice}
                onChange={(event) => onChange({ ...settings, cloudVoice: event.target.value })}
                list="cloud-tts-voices"
                placeholder="marin"
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none"
              />
              <datalist id="cloud-tts-voices">
                {["marin", "cedar", "coral", "sage", "alloy", "ash", "ballad", "echo", "fable", "nova", "onyx", "shimmer", "verse"].map((voice) => (
                  <option key={voice} value={voice} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-slate-400">{t("Speaking style", "说话风格")}</span>
            <textarea
              value={settings.cloudInstructions}
              onChange={(event) => onChange({ ...settings, cloudInstructions: event.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-slate-900 px-2 py-2 leading-4 text-slate-100 outline-none"
            />
          </label>
            </>
          )}
        </div>
      ) : (
        <label className="mt-3 block">
          <span className="mb-1 block text-slate-400">{t("System voice", "系统音色")}</span>
          <select
            value={settings.voiceURI}
            onChange={(event) => onChange({ ...settings, voiceURI: event.target.value })}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-slate-100 outline-none"
          >
            <option value="">{t("Automatic voice", "自动选择中文音色")}</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang}){voice.localService ? "" : ` · ${t("Online", "在线")}`}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="mt-3 block">
        <span className="flex justify-between text-slate-400">
          <span>{t("Rate", "语速")}</span>
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
      {settings.engine === "browser" ? (
        <label className="mt-3 block">
          <span className="flex justify-between text-slate-400">
            <span>{t("Pitch", "音高")}</span>
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
      ) : null}
      <p className="mt-2 leading-4 text-slate-500">
        {settings.engine === "cloud"
          ? settings.cloudProvider === "doubao"
            ? t(
                "Doubao 2.0 audio is generated sentence by sentence. Use the Speaker ID enabled for your Volcengine account.",
                "豆包 2.0 按句生成语音，请填写火山引擎账号已开通的 Speaker ID。"
              )
            : t(
                "Cloud audio is AI-generated sentence by sentence. If it is unavailable, Nora falls back to the system voice.",
                "云端音频是按句生成的 AI 合成语音。服务不可用时，Nora 会自动回退到系统语音。"
              )
          : t(
              "Voices are provided by your operating system and browser. Edge often provides more online voices.",
              "音色来自操作系统和浏览器。Edge 通常会提供更多在线中文音色。"
            )}
      </p>
      <button
        type="button"
        onClick={onPreview}
        className="mt-3 w-full rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-cyan-100 hover:bg-cyan-400/20"
      >
        {t("Preview", "试听当前设置")}
      </button>
    </div>
  );
}

function MicrophoneIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></svg>;
}

function StopIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
}

function SendIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m4 4 17 8-17 8 3-8-3-8Z" /><path d="M7 12h14" /></svg>;
}

function LoadingIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12a8 8 0 1 1-2.34-5.66" /></svg>;
}

function SpeakerIcon({ active }: { active: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 10v4h4l4 4V6L9 10H5Z" />{active ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /> : <path d="m17 10 4 4m0-4-4 4" />}</svg>;
}

function SlidersIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6" /></svg>;
}

function SubtitleIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M6 14h5M13 14h5M6 17h8" /></svg>;
}

function BubbleIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5h16v11H9l-5 4V5Z" /></svg>;
}

function AutoIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 5v14l11-7L8 5Z" /></svg>;
}

function ManualIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 4v16M17 4v16" /></svg>;
}
