export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

export type AvatarExpression =
  | "neutral"
  | "smile"
  | "happy"
  | "serious"
  | "comfort"
  | "surprised";

export type TranscriptSpeaker = "user" | "nora" | "system";

export type TranscriptEntry = {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
};

export type SceneDialogueEntry = Pick<TranscriptEntry, "id" | "speaker" | "text">;
