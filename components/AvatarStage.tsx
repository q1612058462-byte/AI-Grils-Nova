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

type AvatarStageProps = {
  state: AvatarState;
  mouthOpen: number;
  expression: AvatarExpression;
  dialogue?: SceneDialogueEntry;
  previousDialogue?: SceneDialogueEntry;
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
  onStopSpeech: () => void;
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
  previousDialogue,
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
  onStopSpeech,
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

  return (
    <section className="relative h-dvh w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.06),_transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.04)_48%,transparent_100%)]" />
      <div className="absolute -left-12 top-12 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -right-12 bottom-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative h-full w-full">
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
        />
        <SceneDialogueOverlay
          dialogue={dialogue}
          previousDialogue={previousDialogue}
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
          onStopSpeech={onStopSpeech}
        />
      </div>
    </section>
  );
}
