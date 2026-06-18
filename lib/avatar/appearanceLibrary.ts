export type ScenePresetId =
  | "cc0-lounge"
  | "cozy-study"
  | "night-loft"
  | "soft-studio"
  | "illustrated-bedroom"
  | "cherry-park"
  | "seaside"
  | "sunset-street";

export type ScenePreset = {
  id: ScenePresetId;
  name: string;
  description: string;
  swatch: string;
  imageUrl?: string;
};

export type AvatarPreset = {
  id: string;
  name: string;
  description: string;
  modelUrl: string;
};

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: "cc0-lounge",
    name: "CC0 资产客厅",
    description: "真实 GLB 家具、PBR 木地板与室内 HDRI。",
    swatch: "linear-gradient(135deg,#5f4638,#d8c2a3)",
  },
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
  {
    id: "illustrated-bedroom",
    name: "晴日卧室",
    description: "明亮柔和的插画卧室背景。",
    swatch: "#c9d9e9",
    imageUrl: "/backgrounds/bedroom.png",
  },
  {
    id: "cherry-park",
    name: "樱花公园",
    description: "盛开樱花与公园步道。",
    swatch: "#f3b4cb",
    imageUrl: "/backgrounds/cherry-park.png",
  },
  {
    id: "seaside",
    name: "海滨步道",
    description: "晴空、海面与沿岸木栈道。",
    swatch: "#5bbbe8",
    imageUrl: "/backgrounds/seaside.png",
  },
  {
    id: "sunset-street",
    name: "黄昏街道",
    description: "暖色夕阳下的安静商业街。",
    swatch: "#d78365",
    imageUrl: "/backgrounds/sunset-street.png",
  },
];

export function getScenePreset(id: ScenePresetId) {
  return SCENE_PRESETS.find((preset) => preset.id === id) ?? SCENE_PRESETS[0];
}

export function isImageScenePreset(id: ScenePresetId) {
  return Boolean(getScenePreset(id).imageUrl);
}

const envAvatarPreset = (
  index: number,
  name: string | undefined,
  url: string | undefined
): AvatarPreset | null => {
  if (!url) return null;

  return {
    id: `avatar-${index}`,
    name: name || `Avatar ${index}`,
    description: "通过环境变量配置的 VRM 角色。",
    modelUrl: url,
  };
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "nora",
    name: "Nora",
    description: "当前内置的 VRM 角色。",
    modelUrl: process.env.NEXT_PUBLIC_VRM_MODEL_URL || "/models/nora.vrm",
  },
  envAvatarPreset(2, process.env.NEXT_PUBLIC_VRM_MODEL_NAME_2, process.env.NEXT_PUBLIC_VRM_MODEL_URL_2),
  envAvatarPreset(3, process.env.NEXT_PUBLIC_VRM_MODEL_NAME_3, process.env.NEXT_PUBLIC_VRM_MODEL_URL_3),
  envAvatarPreset(4, process.env.NEXT_PUBLIC_VRM_MODEL_NAME_4, process.env.NEXT_PUBLIC_VRM_MODEL_URL_4),
  envAvatarPreset(5, process.env.NEXT_PUBLIC_VRM_MODEL_NAME_5, process.env.NEXT_PUBLIC_VRM_MODEL_URL_5),
  envAvatarPreset(6, process.env.NEXT_PUBLIC_VRM_MODEL_NAME_6, process.env.NEXT_PUBLIC_VRM_MODEL_URL_6),
].filter((preset): preset is AvatarPreset => preset !== null);
