import { cloneDeskPose, type DeskPose, type PoseDebugBoneName } from "@/lib/avatar/deskPose";
import type { AvatarExpression } from "@/types/avatar";

export type ReferencePreset = {
  id: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  source: "VRMA Clip" | "VRMA Ref." | "Mixamo Ref." | "VRM Preset" | "Custom";
  expression: AvatarExpression;
  pose: PosePatch;
  vrmaUrl?: string;
};

export type PosePatch = Partial<Record<PoseDebugBoneName, Partial<DeskPose[PoseDebugBoneName]>>>;

function createPreset(
  id: string,
  nameZh: string,
  nameEn: string,
  descriptionZh: string,
  source: ReferencePreset["source"],
  expression: AvatarExpression,
  pose: PosePatch
): ReferencePreset {
  return { id, nameZh, nameEn, descriptionZh, source, expression, pose };
}

function createVrmaPreset(
  id: string,
  name: string,
  descriptionZh: string,
  expression: AvatarExpression,
  vrmaUrl: string
): ReferencePreset {
  return {
    id,
    nameZh: name,
    nameEn: name,
    descriptionZh,
    source: "VRMA Clip",
    expression,
    pose: {},
    vrmaUrl,
  };
}

export function applyReferencePreset(basePose: DeskPose, preset: ReferencePreset): DeskPose {
  const pose = cloneDeskPose(basePose);

  for (const [bone, target] of Object.entries(preset.pose)) {
    const boneName = bone as PoseDebugBoneName;
    pose[boneName] = {
      x: target.x ?? pose[boneName].x,
      y: target.y ?? pose[boneName].y,
      z: target.z ?? pose[boneName].z,
    };
  }

  return pose;
}

export const REFERENCE_PRESETS: ReferencePreset[] = [
  createPreset(
    "default-back-hands-2",
    "默认背手2",
    "Default Back Hands 2",
    "启动时使用的默认姿势。",
    "VRM Preset",
    "smile",
    {}
  ),
];

export const VRMA_REFERENCE_PRESETS: ReferencePreset[] = [
  createVrmaPreset(
    "vrma-angry",
    "Angry",
    "点击后播放一次。",
    "serious",
    "/animations/angry.vrma"
  ),
  createVrmaPreset(
    "vrma-blush",
    "Blush",
    "点击后播放一次。",
    "smile",
    "/animations/blush.vrma"
  ),
  createVrmaPreset(
    "vrma-goodbye",
    "Goodbye",
    "点击后播放一次。",
    "smile",
    "/animations/goodbye.vrma"
  ),
  createVrmaPreset(
    "vrma-relax",
    "Relax",
    "点击后播放一次。",
    "smile",
    "/animations/relax.vrma"
  ),
];

export const REFERENCE_SOURCES = [
  {
    name: "VRM Animation / VRMA",
    url: "https://vrm.dev/en/vrma/",
  },
  {
    name: "tk256ailab/vrm-viewer MIT VRMA samples",
    url: "https://github.com/tk256ailab/vrm-viewer",
  },
] as const;
