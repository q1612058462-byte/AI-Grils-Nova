export type VrmAnimationPreset = {
  name: string;
  url: string;
};

export function getConfiguredVrmAnimations(): VrmAnimationPreset[] {
  return [
    {
      name: "Angry",
      url: "/animations/angry.vrma",
    },
    {
      name: "Blush",
      url: "/animations/blush.vrma",
    },
    {
      name: "Goodbye",
      url: "/animations/goodbye.vrma",
    },
    {
      name: "Relax",
      url: "/animations/relax.vrma",
    },
  ];
}
