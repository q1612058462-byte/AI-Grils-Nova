import AvatarFace from "@/components/AvatarFace";
import SceneDialogueOverlay from "@/components/SceneDialogueOverlay";
import { blendMouthOpen } from "@/lib/avatar/expressionState";
import type { BrowserVoiceOption, BrowserVoiceSettings } from "@/lib/voice/browserSpeech";
import type { AvatarExpression, AvatarState, SceneDialogueEntry } from "@/types/avatar";

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
};

const stateLabels: Record<AvatarState, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

const stateHints: Record<AvatarState, string> = {
  idle: "准备好听你说话",
  listening: "正在认真聆听",
  thinking: "Nora 正在组织回应",
  speaking: "正在轻声回应",
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
}: AvatarStageProps) {
  const normalizedMouth = blendMouthOpen(state, mouthOpen);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.06),_transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-5 shadow-glow">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.04)_48%,transparent_100%)]" />
      <div className="absolute -left-12 top-12 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -right-12 bottom-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative flex min-h-[840px] flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
          <span className="h-2 w-2 rounded-full bg-cyan-400/80 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
          <span>Nora</span>
          <span className="text-slate-500">·</span>
          <span>{stateLabels[state]}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
          <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-cyan-100">
            {stateHints[state]}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
            表情: {expression}
          </span>
        </div>

        <div className="relative w-full flex-1">
          <div className="absolute inset-x-[12%] bottom-8 h-8 rounded-full bg-cyan-300/20 blur-3xl" />
          <AvatarFace state={state} expression={expression} mouthOpen={normalizedMouth} speaking={state === "speaking"} />
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

        <p className="max-w-lg text-center text-sm leading-6 text-slate-300">
          当前角色会坐在桌前面向镜头，并根据聆听、思考和说话状态呈现自然肢体反馈、视线、表情与口型。
        </p>
      </div>
    </section>
  );
}
