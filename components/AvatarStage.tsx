 "use client";

import AvatarFace from "@/components/AvatarFace";
import SceneControlDock from "@/components/SceneControlDock";
import SceneDialogueOverlay from "@/components/SceneDialogueOverlay";
import { blendMouthOpen } from "@/lib/avatar/expressionState";
import type { ScenePresetId } from "@/lib/avatar/appearanceLibrary";
import type { ModelApiSettings } from "@/lib/model/modelApiSettings";
import type { BrowserVoiceOption, BrowserVoiceSettings } from "@/lib/voice/browserSpeech";
import type {
  AvatarConversation,
  AvatarExpression,
  AvatarState,
  SceneDialogueEntry,
} from "@/types/avatar";
import { useState } from "react";
import TranscriptPanel from "@/components/TranscriptPanel";
import { uiText, useUiLanguage } from "@/lib/i18n/uiLanguage";

type AvatarStageProps = {
  state: AvatarState;
  mouthOpen: number;
  expression: AvatarExpression;
  dialogue?: SceneDialogueEntry;
  recentDialogues: SceneDialogueEntry[];
  onDismissDialogue: () => void;
  modelInput: string;
  modelInputDisabled: boolean;
  modelLoading: boolean;
  voiceInputSupported: boolean;
  voiceInputActive: boolean;
  voiceOutputEnabled: boolean;
  voices: BrowserVoiceOption[];
  voiceSettings: BrowserVoiceSettings;
  onModelInputChange: (value: string) => void;
  onModelSubmit: () => void;
  onToggleVoiceInput: () => void;
  onToggleVoiceOutput: () => void;
  onVoiceSettingsChange: (settings: BrowserVoiceSettings) => void;
  onSpeakSentence: (sentence: string) => Promise<void>;
  onPrefetchSentence: (sentence: string) => void;
  onStopSpeech: () => void;
  onSentenceChange: (sentence: string, index: number) => void;
  sessions: AvatarConversation[];
  activeSession: AvatarConversation;
  sessionBusy: boolean;
  onCreateSession: () => void;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  scenePresetId: ScenePresetId;
  avatarModelUrl: string;
  onScenePresetChange: (id: ScenePresetId) => void;
  onAvatarModelChange: (url: string) => void;
  modelApiSettings: ModelApiSettings;
  onModelApiSettingsChange: (settings: ModelApiSettings) => void;
};

export default function AvatarStage({
  state,
  mouthOpen,
  expression,
  dialogue,
  recentDialogues,
  onDismissDialogue,
  modelInput,
  modelInputDisabled,
  modelLoading,
  voiceInputSupported,
  voiceInputActive,
  voiceOutputEnabled,
  voices,
  voiceSettings,
  onModelInputChange,
  onModelSubmit,
  onToggleVoiceInput,
  onToggleVoiceOutput,
  onVoiceSettingsChange,
  onSpeakSentence,
  onPrefetchSentence,
  onStopSpeech,
  onSentenceChange,
  sessions,
  activeSession,
  sessionBusy,
  onCreateSession,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  scenePresetId,
  avatarModelUrl,
  onScenePresetChange,
  onAvatarModelChange,
  modelApiSettings,
  onModelApiSettingsChange,
}: AvatarStageProps) {
  const normalizedMouth = blendMouthOpen(state, mouthOpen);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { language } = useUiLanguage();
  const t = (en: string, zh: string) => uiText(language, en, zh);

  return (
    <section className="relative h-dvh w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.06),_transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.04)_48%,transparent_100%)]" />
      <div className="absolute -left-12 top-12 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -right-12 bottom-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative flex h-full w-full">
        <div className="relative min-w-0 flex-1 transition-[width] duration-300">
        <div className="absolute inset-x-[12%] bottom-8 h-8 rounded-full bg-cyan-300/20 blur-3xl" />
        <AvatarFace
          state={state}
          expression={expression}
          mouthOpen={normalizedMouth}
          speaking={state === "speaking"}
          scenePresetId={scenePresetId}
          modelUrl={avatarModelUrl}
        />
        <SceneControlDock
          state={state}
          sessions={sessions}
          activeSession={activeSession}
          busy={sessionBusy}
          onCreateSession={onCreateSession}
          onSelectSession={onSelectSession}
          onRenameSession={onRenameSession}
          onDeleteSession={onDeleteSession}
          scenePresetId={scenePresetId}
          avatarModelUrl={avatarModelUrl}
          onScenePresetChange={onScenePresetChange}
          onAvatarModelChange={onAvatarModelChange}
          modelApiSettings={modelApiSettings}
          onModelApiSettingsChange={onModelApiSettingsChange}
          historyOpen={historyOpen}
          onHistoryToggle={() => setHistoryOpen((current) => !current)}
        />
        <SceneDialogueOverlay
          dialogue={dialogue}
          recentDialogues={recentDialogues}
          onDismiss={onDismissDialogue}
          input={modelInput}
          inputDisabled={modelInputDisabled}
          loading={modelLoading}
          voiceInputSupported={voiceInputSupported}
          voiceInputActive={voiceInputActive}
          voiceOutputEnabled={voiceOutputEnabled}
          voices={voices}
          voiceSettings={voiceSettings}
          onInputChange={onModelInputChange}
          onSubmit={onModelSubmit}
          onToggleVoiceInput={onToggleVoiceInput}
          onToggleVoiceOutput={onToggleVoiceOutput}
          onVoiceSettingsChange={onVoiceSettingsChange}
          onSpeakSentence={onSpeakSentence}
          onPrefetchSentence={onPrefetchSentence}
          onStopSpeech={onStopSpeech}
          onSentenceChange={onSentenceChange}
        />
        </div>
        <aside
          className={[
            "relative z-40 flex h-full shrink-0 flex-col overflow-hidden border-l border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl transition-[width] duration-300",
            historyOpen ? "w-[clamp(320px,32vw,440px)]" : "w-0 border-l-0",
          ].join(" ")}
          aria-hidden={!historyOpen}
        >
          <div className="flex h-full min-h-0 min-w-[320px] flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <h2 className="font-medium text-white">{t("Conversation history", "对话历史")}</h2>
                <p className="mt-1 truncate text-xs text-slate-400">{activeSession.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label={t("Close history", "关闭历史")}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain p-5 [scrollbar-color:rgba(148,163,184,0.45)_transparent] [scrollbar-width:thin]">
              <TranscriptPanel messages={activeSession.messages} embedded />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
