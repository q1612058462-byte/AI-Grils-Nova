import type { AvatarExpression, AvatarState } from "@/types/avatar";

export const DEFAULT_EXPRESSIONS: Record<AvatarState, AvatarExpression> = {
  idle: "neutral",
  listening: "smile",
  thinking: "serious",
  speaking: "neutral",
};

export function clampMouthOpen(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function blendMouthOpen(state: AvatarState, rawValue: number) {
  const value = clampMouthOpen(rawValue);
  if (state === "speaking") {
    return Math.max(0.08, value);
  }
  return value * 0.2;
}

export function isSpeakingState(state: AvatarState) {
  return state === "speaking";
}
