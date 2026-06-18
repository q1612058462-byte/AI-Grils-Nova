import type { AvatarState } from "@/types/avatar";

export type VrmAnimationPreset = {
  state: AvatarState;
  name: string;
  url: string;
};

function envUrl(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getConfiguredVrmAnimations(): VrmAnimationPreset[] {
  const presets: VrmAnimationPreset[] = [
    {
      state: "idle",
      name: "Idle",
      url: envUrl(process.env.NEXT_PUBLIC_VRMA_IDLE_URL) ?? "",
    },
    {
      state: "listening",
      name: "Listening",
      url: envUrl(process.env.NEXT_PUBLIC_VRMA_LISTENING_URL) ?? "",
    },
    {
      state: "thinking",
      name: "Thinking",
      url: envUrl(process.env.NEXT_PUBLIC_VRMA_THINKING_URL) ?? "",
    },
    {
      state: "speaking",
      name: "Speaking",
      url: envUrl(process.env.NEXT_PUBLIC_VRMA_SPEAKING_URL) ?? "",
    },
  ];
  return presets.filter((preset) => preset.url);
}
