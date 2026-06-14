"use client";

import { useState } from "react";
import TranscriptPanel from "@/components/TranscriptPanel";
import {
  AVATAR_PRESETS,
  SCENE_PRESETS,
  type ScenePresetId,
} from "@/lib/avatar/appearanceLibrary";
import type { AvatarConversation, AvatarState } from "@/types/avatar";

type Panel = "appearance" | "sessions" | "history" | "about" | null;

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
  onScenePresetChange: (id: ScenePresetId) => void;
  onAvatarModelChange: (url: string) => void;
};

const stateLabels: Record<AvatarState, string> = {
  idle: "待机",
  listening: "聆听",
  thinking: "思考",
  speaking: "回应",
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
  onScenePresetChange,
  onAvatarModelChange,
}: SceneControlDockProps) {
  const [panel, setPanel] = useState<Panel>(null);

  return (
    <>
      <div className="pointer-events-auto absolute right-4 top-4 z-40 flex items-center gap-2">
        <div className="hidden max-w-48 items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 shadow-xl backdrop-blur sm:flex">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
          <span className="truncate">{activeSession.title}</span>
          <span className="text-slate-500">·</span>
          <span className="text-cyan-200">{stateLabels[state]}</span>
        </div>
        <DockButton label="场景与角色" onClick={() => setPanel("appearance")}>
          <AppearanceIcon />
        </DockButton>
        <DockButton label="会话" onClick={() => setPanel("sessions")}>
          <ChatIcon />
        </DockButton>
        <DockButton label="历史" onClick={() => setPanel("history")}>
          <HistoryIcon />
        </DockButton>
        <DockButton label="说明" onClick={() => setPanel("about")}>
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
                    ? "场景与角色"
                    : panel === "sessions"
                      ? "会话管理"
                      : panel === "history"
                        ? "对话历史"
                        : "关于页面"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {panel === "appearance"
                    ? "选择场景风格或切换 VRM 角色。"
                    : panel === "sessions"
                    ? "每个会话拥有独立上下文和字幕记录。"
                    : panel === "history"
                      ? activeSession.title
                      : "Nora 数字人对话场景"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label="关闭"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {panel === "appearance" ? (
                <AppearancePanel
                  scenePresetId={scenePresetId}
                  avatarModelUrl={avatarModelUrl}
                  onScenePresetChange={onScenePresetChange}
                  onAvatarModelChange={onAvatarModelChange}
                />
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
              ) : panel === "history" ? (
                <TranscriptPanel messages={activeSession.messages} embedded />
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

function AppearancePanel({
  scenePresetId,
  avatarModelUrl,
  onScenePresetChange,
  onAvatarModelChange,
}: {
  scenePresetId: ScenePresetId;
  avatarModelUrl: string;
  onScenePresetChange: (id: ScenePresetId) => void;
  onAvatarModelChange: (url: string) => void;
}) {
  const [customUrl, setCustomUrl] = useState(
    AVATAR_PRESETS.some((preset) => preset.modelUrl === avatarModelUrl) ? "" : avatarModelUrl
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">场景</h3>
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
              <span className="block h-20" style={{ background: preset.swatch }} />
              <span className="block p-3">
                <span className="block text-sm text-white">{preset.name}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">{preset.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">角色</h3>
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
              <span className="mt-1 block text-xs text-slate-400">{preset.description}</span>
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
          <label className="text-xs text-slate-400">自定义 VRM 地址</label>
          <div className="mt-2 flex gap-2">
            <input
              value={customUrl}
              onChange={(event) => setCustomUrl(event.target.value)}
              placeholder="/models/another.vrm 或 https://..."
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            />
            <button
              type="submit"
              disabled={!customUrl.trim()}
              className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-4 text-sm text-cyan-100 disabled:opacity-40"
            >
              加载
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            推荐将获得授权的 VRM 文件放入 public/models，使用同源地址可避免跨域问题。
          </p>
        </form>
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
  return (
    <div>
      <button
        type="button"
        onClick={onCreate}
        disabled={busy}
        className="mb-4 w-full rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-40"
      >
        + 新建会话
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
                    {session.messages.length} 条消息 · {formatTime(session.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const title = window.prompt("会话名称", session.title)?.trim();
                    if (title) onRename(session.id, title);
                  }}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  重命名
                </button>
                <button
                  type="button"
                  disabled={busy || sessions.length === 1}
                  onClick={() => {
                    if (window.confirm(`删除会话“${session.title}”？`)) onDelete(session.id);
                  }}
                  className="rounded-lg px-2 py-1 text-xs text-rose-300 hover:bg-rose-400/10 disabled:opacity-30"
                >
                  删除
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {busy ? <p className="mt-3 text-xs text-amber-200/80">回复生成期间暂不能切换会话。</p> : null}
    </div>
  );
}

function AboutPanel() {
  return (
    <div className="space-y-4 text-sm leading-7 text-slate-300">
      <p>
        Nora 是一个支持 OpenAI 兼容模型的网页数字人原型。对话会以字幕或气泡形式进入场景，并可配合语音输入、逐句朗读、表情和口型反馈。
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-medium text-white">场景操作</h3>
        <p className="mt-2">拖动画面旋转镜头，滚轮缩放，右键拖动平移视角。姿势调试模式下可选择和拖动骨骼节点。</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-medium text-white">会话与隐私</h3>
        <p className="mt-2">会话记录保存在当前浏览器的本地存储中。不同会话使用各自的消息历史作为模型上下文。</p>
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

function formatTime(value: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function ChatIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 5h14v10H9l-4 4V5Z" /></svg>;
}

function AppearanceIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5h16v14H4z" /><path d="m4 15 4-4 3 3 3-4 6 6M16.5 8h.01" /></svg>;
}

function HistoryIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6" /><path d="M4 4v4.6h4.6M12 7v5l3 2" /></svg>;
}

function InfoIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}
