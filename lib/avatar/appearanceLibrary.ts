export type ScenePresetId = "cozy-study" | "night-loft" | "soft-studio";

export type ScenePreset = {
  id: ScenePresetId;
  name: string;
  description: string;
  swatch: string;
};

export type AvatarPreset = {
  id: string;
  name: string;
  description: string;
  modelUrl: string;
};

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: "cozy-study",
    name: "温暖书房",
    description: "木质桌面、书架、暖灯和柔和日光。",
    swatch: "linear-gradient(135deg,#8b6248,#d8bd99)",
  },
  {
    id: "night-loft",
    name: "夜景公寓",
    description: "城市夜景、玻璃窗与蓝紫色氛围灯。",
    swatch: "linear-gradient(135deg,#111827,#4338ca)",
  },
  {
    id: "soft-studio",
    name: "极简摄影棚",
    description: "干净的弧形背景与柔光箱，突出角色本身。",
    swatch: "linear-gradient(135deg,#d8d4ce,#f4eee5)",
  },
];

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "nora",
    name: "Nora",
    description: "当前内置的 VRM 角色。",
    modelUrl: process.env.NEXT_PUBLIC_VRM_MODEL_URL || "/models/nora.vrm",
  },
  process.env.NEXT_PUBLIC_VRM_MODEL_URL_2
    ? {
        id: "avatar-2",
        name: process.env.NEXT_PUBLIC_VRM_MODEL_NAME_2 || "角色 2",
        description: "通过环境变量配置的 VRM 角色。",
        modelUrl: process.env.NEXT_PUBLIC_VRM_MODEL_URL_2,
      }
    : null,
  process.env.NEXT_PUBLIC_VRM_MODEL_URL_3
    ? {
        id: "avatar-3",
        name: process.env.NEXT_PUBLIC_VRM_MODEL_NAME_3 || "角色 3",
        description: "通过环境变量配置的 VRM 角色。",
        modelUrl: process.env.NEXT_PUBLIC_VRM_MODEL_URL_3,
      }
    : null,
].filter((preset): preset is AvatarPreset => preset !== null);
