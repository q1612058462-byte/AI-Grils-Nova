"use client";

import { useEffect, useState } from "react";
import { VoiceSettingsPanel } from "@/components/SceneDialogueOverlay";
import {
  AVATAR_PRESETS,
  SCENE_PRESETS,
  type ScenePresetId,
} from "@/lib/avatar/appearanceLibrary";
import type { ModelApiSettings } from "@/lib/model/modelApiSettings";
import type { BrowserVoiceOption, BrowserVoiceSettings } from "@/lib/voice/browserSpeech";
import { uiText, useUiLanguage } from "@/lib/i18n/uiLanguage";
import type { AvatarConversation, AvatarState } from "@/types/avatar";

type Panel = "appearance" | "settings" | "sessions" | "guide" | "about" | null;

type SceneControlDockProps = {
  state: AvatarState;
  sessions: AvatarConversation[];
  activeSession: AvatarConversation;
  busy: boolean;
  onCreateSession: () => void;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  scenePresetId: ScenePresetId;
  avatarModelUrl: string;
  customBackgroundUrl?: string | null;
  onScenePresetChange: (id: ScenePresetId) => void;
  onAvatarModelChange: (url: string) => void;
  onBackgroundUpload: (url: string | null) => void;
  modelApiSettings: ModelApiSettings;
  onModelApiSettingsChange: (settings: ModelApiSettings) => void;
  voices: BrowserVoiceOption[];
  voiceSettings: BrowserVoiceSettings;
  onVoiceSettingsChange: (settings: BrowserVoiceSettings) => void;
  onVoicePreview: () => void;
  historyOpen: boolean;
  onHistoryToggle: () => void;
};

const stateLabels: Record<AvatarState, [string, string]> = {
  idle: ["Idle", "待机"],
  listening: ["Listening", "聆听"],
  thinking: ["Thinking", "思考"],
  speaking: ["Speaking", "回应"],
};

export default function SceneControlDock({
  state,
  sessions,
  activeSession,
  busy,
  onCreateSession,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  scenePresetId,
  avatarModelUrl,
  customBackgroundUrl,
  onScenePresetChange,
  onAvatarModelChange,
  onBackgroundUpload,
  modelApiSettings,
  onModelApiSettingsChange,
  voices,
  voiceSettings,
  onVoiceSettingsChange,
  onVoicePreview,
  historyOpen,
  onHistoryToggle,
}: SceneControlDockProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const { language, setLanguage } = useUiLanguage();
  const t = (en: string, zh: string) => uiText(language, en, zh);

  return (
    <>
      <div className="pointer-events-auto absolute right-4 top-4 z-40 flex items-center gap-2">
        <div className="hidden max-w-48 items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 shadow-xl backdrop-blur sm:flex">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
          <span className="truncate">{activeSession.title}</span>
          <span className="text-slate-500">·</span>
          <span className="text-cyan-200">{uiText(language, ...stateLabels[state])}</span>
        </div>
        <DockButton label={t("Scene & avatar", "场景与角色")} onClick={() => setPanel("appearance")}>
          <AppearanceIcon />
        </DockButton>
        <DockButton label={t("Settings", "设置")} onClick={() => setPanel("settings")}>
          <SettingsIcon />
        </DockButton>
        <DockButton label={t("Guide", "使用文档")} onClick={() => setPanel("guide")}>
          <GuideIcon />
        </DockButton>
        <DockButton label={t("Sessions", "会话")} onClick={() => setPanel("sessions")}>
          <ChatIcon />
        </DockButton>
        <DockButton
          label={t("History", "历史")}
          onClick={() => {
            setPanel(null);
            onHistoryToggle();
          }}
        >
          <HistoryIcon />
        </DockButton>
        <DockButton
          label={t("Switch to Chinese", "切换为英文")}
          onClick={() => setLanguage(language === "en" ? "zh" : "en")}
        >
          <span className="text-[11px] font-semibold">{language === "en" ? "中" : "EN"}</span>
        </DockButton>
        <DockButton label={t("About", "说明")} onClick={() => setPanel("about")}>
          <InfoIcon />
        </DockButton>
      </div>

      {panel ? (
        <div
          className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPanel(null);
          }}
        >
          <section className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-950/95 shadow-2xl">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="font-medium text-white">
                  {panel === "appearance"
                    ? t("Scene & avatar", "场景与角色")
                    : panel === "settings"
                      ? t("Settings", "设置")
                    : panel === "guide"
                      ? t("User guide", "使用文档")
                    : panel === "sessions"
                      ? t("Session management", "会话管理")
                      : t("About", "关于页面")}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {panel === "appearance"
                    ? t("Choose a scene or VRM avatar.", "选择场景风格或切换 VRM 角色。")
                    : panel === "settings"
                      ? t("Configure the model API and generation parameters.", "配置模型 API 与生成参数。")
                    : panel === "guide"
                      ? t("How to use Nora and where your data is stored.", "了解如何使用 Nora，以及数据保存在哪里。")
                    : panel === "sessions"
                    ? t("Each session has independent context and subtitles.", "每个会话拥有独立上下文和字幕记录。")
                    : t("Nora digital avatar scene", "Nora 数字人对话场景")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label={t("Close", "关闭")}
              >
                <CloseIcon />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {panel === "appearance" ? (
                <AppearancePanel
                  scenePresetId={scenePresetId}
                  avatarModelUrl={avatarModelUrl}
                  customBackgroundUrl={customBackgroundUrl}
                  onScenePresetChange={onScenePresetChange}
                  onAvatarModelChange={onAvatarModelChange}
                  onBackgroundUpload={onBackgroundUpload}
                />
              ) : panel === "settings" ? (
                <UserSettingsPanel
                  modelSettings={modelApiSettings}
                  onModelSave={onModelApiSettingsChange}
                  voices={voices}
                  voiceSettings={voiceSettings}
                  onVoiceSettingsChange={onVoiceSettingsChange}
                  onVoicePreview={onVoicePreview}
                />
              ) : panel === "guide" ? (
                <GuidePanel />
              ) : panel === "sessions" ? (
                <SessionManager
                  sessions={sessions}
                  activeSessionId={activeSession.id}
                  busy={busy}
                  onCreate={onCreateSession}
                  onSelect={(id) => {
                    onSelectSession(id);
                    setPanel(null);
                  }}
                  onRename={onRenameSession}
                  onDelete={onDeleteSession}
                />
              ) : (
                <AboutPanel />
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function UserSettingsPanel({
  modelSettings,
  onModelSave,
  voices,
  voiceSettings,
  onVoiceSettingsChange,
  onVoicePreview,
}: {
  modelSettings: ModelApiSettings;
  onModelSave: (settings: ModelApiSettings) => void;
  voices: BrowserVoiceOption[];
  voiceSettings: BrowserVoiceSettings;
  onVoiceSettingsChange: (settings: BrowserVoiceSettings) => void;
  onVoicePreview: () => void;
}) {
  const { language } = useUiLanguage();
  const t = (en: string, zh: string) => uiText(language, en, zh);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <h3 className="mb-3 text-sm font-medium text-white">
          {t("Model API", "模型 API")}
        </h3>
        <ModelSettingsPanel settings={modelSettings} onSave={onModelSave} />
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <h3 className="mb-3 text-sm font-medium text-white">
          {t("Voice and TTS", "声音与语音")}
        </h3>
        <VoiceSettingsPanel
          voices={voices}
          settings={voiceSettings}
          onChange={onVoiceSettingsChange}
          onPreview={onVoicePreview}
        />
      </section>
      <p className="rounded-2xl border border-cyan-300/10 bg-cyan-300/5 px-4 py-3 text-xs leading-5 text-cyan-100/75">
        {t(
          "These model and voice settings are saved only in this browser. Different users can keep different API keys, models, voices, speed, and pitch without changing the deployment.",
          "这些模型和声音设置只保存在当前浏览器。不同用户可以各自保存 API Key、模型、音色、语速和音高，不需要修改部署配置。"
        )}
      </p>
    </div>
  );
}

function ModelSettingsPanel({
  settings,
  onSave,
}: {
  settings: ModelApiSettings;
  onSave: (settings: ModelApiSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const { language } = useUiLanguage();
  const t = (en: string, zh: string) => uiText(language, en, zh);

  useEffect(() => setDraft(settings), [settings]);

  const update = <Key extends keyof ModelApiSettings>(
    key: Key,
    value: ModelApiSettings[Key]
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
        setSaved(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsField label="Base URL" className="sm:col-span-2">
          <input
            value={draft.baseUrl}
            onChange={(event) => update("baseUrl", event.target.value)}
            placeholder={t("Leave blank to use .env", "留空使用 .env，例如 https://api.deepseek.com")}
            className={inputClassName}
          />
        </SettingsField>
        <SettingsField label={t("Model", "模型名称")}>
          <input
            value={draft.model}
            onChange={(event) => update("model", event.target.value)}
            placeholder={t("Leave blank to use .env", "留空使用 .env")}
            className={inputClassName}
          />
        </SettingsField>
        <SettingsField label="API Key">
          <input
            type="password"
            value={draft.apiKey}
            onChange={(event) => update("apiKey", event.target.value)}
            placeholder={t("Leave blank to use the server key", "留空使用服务端密钥")}
            autoComplete="off"
            className={inputClassName}
          />
        </SettingsField>
        <SettingsField label={`Temperature · ${draft.temperature.toFixed(2)}`}>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={draft.temperature}
            onChange={(event) => update("temperature", Number(event.target.value))}
            className="w-full accent-cyan-400"
          />
        </SettingsField>
        <SettingsField label={`Top P · ${draft.topP.toFixed(2)}`}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={draft.topP}
            onChange={(event) => update("topP", Number(event.target.value))}
            className="w-full accent-cyan-400"
          />
        </SettingsField>
        <SettingsField label={t("Max output tokens", "最大输出 Tokens")}>
          <input
            type="number"
            min="1"
            max="8192"
            value={draft.maxTokens}
            onChange={(event) => update("maxTokens", Number(event.target.value))}
            className={inputClassName}
          />
        </SettingsField>
      </div>
      <div className="rounded-2xl border border-amber-300/10 bg-amber-300/5 px-4 py-3 text-xs leading-5 text-amber-100/70">
        {t(
          "The API key entered here is stored only in this browser's localStorage. Use server-side .env on shared devices.",
          "页面填写的 API Key 仅保存在当前浏览器的 localStorage。公共设备上建议使用服务端 `.env`。"
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          title={t("Save model settings", "保存模型设置")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
        >
          {saved ? <CheckIcon /> : <SaveIcon />}
        </button>
      </div>
    </form>
  );
}

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40";

function SettingsField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function AppearancePanel({
  scenePresetId,
  avatarModelUrl,
  customBackgroundUrl,
  onScenePresetChange,
  onAvatarModelChange,
  onBackgroundUpload,
}: {
  scenePresetId: ScenePresetId;
  avatarModelUrl: string;
  customBackgroundUrl?: string | null;
  onScenePresetChange: (id: ScenePresetId) => void;
  onAvatarModelChange: (url: string) => void;
  onBackgroundUpload: (url: string | null) => void;
}) {
  const { language } = useUiLanguage();
  const t = (en: string, zh: string) => uiText(language, en, zh);
  const [customUrl, setCustomUrl] = useState(
    AVATAR_PRESETS.some((preset) => preset.modelUrl === avatarModelUrl) ? "" : avatarModelUrl
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{t("Scenes", "场景")}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {SCENE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onScenePresetChange(preset.id)}
              className={`overflow-hidden rounded-2xl border text-left transition ${
                scenePresetId === preset.id
                  ? "border-cyan-300/60 bg-cyan-400/10"
                  : "border-white/10 bg-white/5 hover:border-white/25"
              }`}
            >
              <span
                className="block h-20 bg-cover bg-center"
                style={{
                  background: preset.imageUrl
                    ? `url("${preset.imageUrl}") center / cover`
                    : preset.swatch,
                }}
              />
              <span className="block p-3">
                <span className="block text-sm text-white">
                  {language === "en" ? sceneEnglish[preset.id].name : preset.name}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  {language === "en" ? sceneEnglish[preset.id].description : preset.description}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="text-xs text-slate-400">{t("Upload background image", "上传背景图片")}</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onBackgroundUpload(URL.createObjectURL(file));
              event.currentTarget.value = "";
            }}
            className="mt-2 block w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400/15 file:px-3 file:py-1.5 file:text-cyan-100"
          />
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              {customBackgroundUrl
                ? t("Custom image is active for this browser session.", "当前浏览器会话正在使用自定义背景。")
                : t("PNG, JPG, or WebP files work best.", "推荐使用 PNG、JPG 或 WebP 图片。")}
            </span>
            {customBackgroundUrl ? (
              <button
                type="button"
                onClick={() => onBackgroundUpload(null)}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                {t("Clear", "清除")}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{t("Avatars", "角色")}</h3>
        <div className="space-y-2">
          {AVATAR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onAvatarModelChange(preset.modelUrl)}
              className={`w-full rounded-2xl border p-4 text-left ${
                avatarModelUrl === preset.modelUrl
                  ? "border-cyan-300/50 bg-cyan-400/10"
                  : "border-white/10 bg-white/5 hover:border-white/25"
              }`}
            >
              <span className="block text-sm text-white">{preset.name}</span>
              <span className="mt-1 block text-xs text-slate-400">
                {language === "en" ? "Installed VRM avatar." : preset.description}
              </span>
            </button>
          ))}
        </div>
        <form
          className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const url = customUrl.trim();
            if (url) onAvatarModelChange(url);
          }}
        >
          <label className="text-xs text-slate-400">{t("Custom VRM URL", "自定义 VRM 地址")}</label>
          <div className="mt-2 flex gap-2">
            <input
              value={customUrl}
              onChange={(event) => setCustomUrl(event.target.value)}
              placeholder="/models/another.vrm or https://..."
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            />
            <button
              type="submit"
              disabled={!customUrl.trim()}
              className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-4 text-sm text-cyan-100 disabled:opacity-40"
            >
              {t("Load", "加载")}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {t(
              "Place licensed VRM files in public/models. Same-origin URLs avoid CORS issues.",
              "推荐将获得授权的 VRM 文件放入 public/models，使用同源地址可避免跨域问题。"
            )}
          </p>
        </form>
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="text-xs text-slate-400">{t("Upload VRM file", "上传 VRM 文件")}</label>
          <input
            type="file"
            accept=".vrm,model/gltf-binary"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onAvatarModelChange(URL.createObjectURL(file));
              event.currentTarget.value = "";
            }}
            className="mt-2 block w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400/15 file:px-3 file:py-1.5 file:text-cyan-100"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {t(
              "Uploaded VRM files are temporary previews. Put final models in public/models or configure them in .env.",
              "上传的 VRM 只用于临时预览。最终模型建议放入 public/models 或在 .env 中配置。"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function SessionManager({
  sessions,
  activeSessionId,
  busy,
  onCreate,
  onSelect,
  onRename,
  onDelete,
}: {
  sessions: AvatarConversation[];
  activeSessionId: string;
  busy: boolean;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const { language } = useUiLanguage();
  const t = (en: string, zh: string) => uiText(language, en, zh);
  return (
    <div>
      <button
        type="button"
        onClick={onCreate}
        disabled={busy}
        title={t("New session", "新建会话")}
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-40"
      >
        <PlusIcon />
      </button>
      <div className="space-y-2">
        {[...sessions].sort((a, b) => b.updatedAt - a.updatedAt).map((session) => {
          const active = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              className={`rounded-2xl border p-3 ${
                active
                  ? "border-cyan-300/35 bg-cyan-400/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy || active}
                  onClick={() => onSelect(session.id)}
                  className="min-w-0 flex-1 text-left disabled:cursor-default"
                >
                  <span className="block truncate text-sm text-slate-100">{session.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {session.messages.length} {t("messages", "条消息")} · {formatTime(session.updatedAt, language)}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const title = window.prompt(t("Session name", "会话名称"), session.title)?.trim();
                    if (title) onRename(session.id, title);
                  }}
                  title={t("Rename", "重命名")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  disabled={busy || sessions.length === 1}
                  onClick={() => {
                    if (window.confirm(t(`Delete session "${session.title}"?`, `删除会话“${session.title}”？`))) onDelete(session.id);
                  }}
                  title={t("Delete", "删除")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-rose-300 hover:bg-rose-400/10 disabled:opacity-30"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {busy ? <p className="mt-3 text-xs text-amber-200/80">{t("Sessions are locked while generating a reply.", "回复生成期间暂不能切换会话。")}</p> : null}
    </div>
  );
}

function AboutPanel() {
  const { language } = useUiLanguage();
  const t = (en: string, zh: string) => uiText(language, en, zh);
  return (
    <div className="space-y-4 text-sm leading-7 text-slate-300">
      <p>
        {t(
          "Nora is a web-based digital avatar supporting OpenAI-compatible models, scene subtitles, speech input, sentence playback, expressions, and lip sync.",
          "Nora 是一个支持 OpenAI 兼容模型的网页数字人原型。对话会以字幕或气泡形式进入场景，并可配合语音输入、逐句朗读、表情和口型反馈。"
        )}
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-medium text-white">{t("Scene controls", "场景操作")}</h3>
        <p className="mt-2">{t("Use the wheel or pinch gesture to zoom. Camera rotation and panning may be enabled by environment settings.", "使用滚轮或双指缩放。镜头旋转和平移可通过环境配置开启。")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-medium text-white">{t("Sessions & privacy", "会话与隐私")}</h3>
        <p className="mt-2">{t("Sessions are stored in this browser. Each session uses its own message history as model context.", "会话记录保存在当前浏览器的本地存储中。不同会话使用各自的消息历史作为模型上下文。")}</p>
      </div>
    </div>
  );
}

function GuidePanel() {
  const { language } = useUiLanguage();
  const t = (en: string, zh: string) => uiText(language, en, zh);
  const items = [
    [
      t("Scene & Avatar", "场景与角色"),
      t(
        "Choose a background, upload a temporary image, switch VRM avatars, or upload a local VRM preview.",
        "选择背景、临时上传图片、切换 VRM 角色，或上传本地 VRM 进行预览。"
      ),
    ],
    [
      t("User Settings", "用户设置"),
      t(
        "Configure the OpenAI-compatible chat model and the TTS voice. These values are stored in this browser's localStorage.",
        "配置 OpenAI 兼容聊天模型和 TTS 声音。这些值保存在当前浏览器的 localStorage。"
      ),
    ],
    [
      t("Sessions", "会话"),
      t(
        "Create separate conversations. Each session keeps its own context and subtitle history.",
        "创建独立会话。每个会话都有自己的上下文和字幕历史。"
      ),
    ],
    [
      t("History Drawer", "历史抽屉"),
      t(
        "Open the right-side drawer to review the full conversation while continuing to type.",
        "打开右侧抽屉查看完整对话，同时可以继续输入。"
      ),
    ],
    [
      t("Voice Controls", "语音控制"),
      t(
        "Use the microphone for speech input, toggle speech playback, and preview voice settings before chatting.",
        "使用麦克风语音输入，开关语音播放，并在聊天前试听声音设置。"
      ),
    ],
    [
      t("Privacy", "隐私"),
      t(
        "Browser overrides, voice settings, session history, and uploaded temporary files stay in the current browser. Server-side .env variables remain the safer default for shared deployments.",
        "浏览器覆盖配置、声音设置、会话历史和临时上传文件都留在当前浏览器。共享部署时，服务端 .env 仍是更安全的默认方式。"
      ),
    ],
  ] as const;

  return (
    <div className="space-y-4 text-sm leading-6 text-slate-300">
      <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4">
        <h3 className="font-medium text-cyan-100">{t("Quick Start", "快速开始")}</h3>
        <p className="mt-2">
          {t(
            "Open User Settings, enter your model provider, choose a voice, then send a message in the subtitle box. Nora will answer sentence by sentence in the scene.",
            "打开用户设置，填写模型服务，选择声音，然后在字幕框里发送消息。Nora 会在场景里逐句回应。"
          )}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(([title, body]) => (
          <section key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <h3 className="font-medium text-white">{title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

function DockButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-slate-200 shadow-xl backdrop-blur transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-100"
    >
      {children}
    </button>
  );
}

function formatTime(value: number, language: "en" | "zh") {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

const sceneEnglish: Record<ScenePresetId, { name: string; description: string }> = {
  "cc0-lounge": {
    name: "CC0 Asset Lounge",
    description: "Real GLB furniture, PBR wood flooring, and an indoor HDRI.",
  },
  "cozy-study": {
    name: "Cozy Study",
    description: "Wood desk, bookshelves, warm lighting, and soft daylight.",
  },
  "night-loft": {
    name: "Night Loft",
    description: "City lights, large windows, and blue-violet ambience.",
  },
  "soft-studio": {
    name: "Soft Studio",
    description: "A clean cyclorama and softboxes focused on the avatar.",
  },
  "illustrated-bedroom": {
    name: "Sunny Bedroom",
    description: "A bright and softly illustrated bedroom.",
  },
  "cherry-park": {
    name: "Cherry Blossom Park",
    description: "A garden path surrounded by blooming cherry trees.",
  },
  seaside: {
    name: "Seaside Walk",
    description: "Blue skies, the ocean, and a sunny coastal promenade.",
  },
  "sunset-street": {
    name: "Sunset Street",
    description: "A quiet shopping street under warm evening light.",
  },
};

function ChatIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 5h14v10H9l-4 4V5Z" /></svg>;
}

function AppearanceIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5h16v14H4z" /><path d="m4 15 4-4 3 3 3-4 6 6M16.5 8h.01" /></svg>;
}

function SettingsIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.38.35.72.6 1 .3.3.7.4 1.1.4h.1v4h-.1c-.4 0-.8.1-1.1.4-.25.28-.46.62-.6 1Z" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>;
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m4 16-.5 4.5L8 20l11-11-4-4L4 16Z" /><path d="m13.5 6.5 4 4" /></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>;
}

function SaveIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 4h12l2 2v14H5V4Z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6" /></svg>;
}

function HistoryIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6" /><path d="M4 4v4.6h4.6M12 7v5l3 2" /></svg>;
}

function InfoIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></svg>;
}

function GuideIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 4.5h10a4 4 0 0 1 4 4v11H9a4 4 0 0 0-4-4v-11Z" /><path d="M5 15.5V4.5M9 8h6M9 11h6" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}
