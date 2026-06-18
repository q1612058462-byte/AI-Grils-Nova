import { VRMHumanBoneName } from "@pixiv/three-vrm";
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
    "default-welcome",
    "默认欢迎",
    "Default Welcome",
    "角色进入场景时使用的默认欢迎姿势。",
    "VRM Preset",
    "smile",
    {}
  ),
  createPreset(
    "attentive",
    "认真倾听",
    "Attentive Listening",
    "身体轻微前倾，头部侧倾，双手保持稳定。",
    "VRMA Ref.",
    "smile",
    {
      [VRMHumanBoneName.Spine]: { x: 2.5, y: -0.8 },
      [VRMHumanBoneName.Chest]: { x: 2.2, y: -1.2 },
      [VRMHumanBoneName.Neck]: { x: 1.5, z: 1.2 },
      [VRMHumanBoneName.Head]: { x: 2.5, y: -2, z: 2.2 },
    }
  ),
  createPreset(
    "thinking",
    "托腮思考",
    "Thinking",
    "右手抬到脸侧，头部略微低下并转向一侧。",
    "VRMA Ref.",
    "neutral",
    {
      [VRMHumanBoneName.Head]: { x: 5, y: -4, z: -2 },
      [VRMHumanBoneName.Neck]: { x: 2, y: -2 },
      [VRMHumanBoneName.RightShoulder]: { x: 1, y: 0, z: 4 },
      [VRMHumanBoneName.RightUpperArm]: { x: -32, y: 8, z: 8 },
      [VRMHumanBoneName.RightLowerArm]: { x: -18, y: 105, z: -12 },
      [VRMHumanBoneName.RightHand]: { x: -8, y: 8, z: -16 },
    }
  ),
  createPreset(
    "greeting",
    "挥手问候",
    "Greeting Wave",
    "右手抬起到肩部外侧，适合作为开场问候。",
    "Mixamo Ref.",
    "happy",
    {
      [VRMHumanBoneName.RightShoulder]: { x: 0, y: 0, z: 3 },
      [VRMHumanBoneName.RightUpperArm]: { x: -8, y: 8, z: 28 },
      [VRMHumanBoneName.RightLowerArm]: { x: -5, y: 82, z: -8 },
      [VRMHumanBoneName.RightHand]: { x: 3, y: 4, z: 8 },
      [VRMHumanBoneName.Head]: { z: 2.5 },
    }
  ),
  createPreset(
    "explaining",
    "展开说明",
    "Open Explanation",
    "双手向外展开，用于解释或强调重点。",
    "Mixamo Ref.",
    "smile",
    {
      [VRMHumanBoneName.LeftUpperArm]: { x: -12, y: -8, z: 18 },
      [VRMHumanBoneName.LeftLowerArm]: { x: -4, y: -42, z: 4 },
      [VRMHumanBoneName.LeftHand]: { x: 2, y: -8, z: 6 },
      [VRMHumanBoneName.RightUpperArm]: { x: -12, y: 8, z: -18 },
      [VRMHumanBoneName.RightLowerArm]: { x: -4, y: 42, z: -4 },
      [VRMHumanBoneName.RightHand]: { x: 2, y: 8, z: -6 },
    }
  ),
  createPreset(
    "surprised",
    "惊讶反应",
    "Surprised",
    "身体后撤，双手略微抬起。",
    "VRMA Ref.",
    "surprised",
    {
      [VRMHumanBoneName.Spine]: { x: -2.5 },
      [VRMHumanBoneName.Chest]: { x: -3 },
      [VRMHumanBoneName.Head]: { x: -3 },
      [VRMHumanBoneName.LeftUpperArm]: { x: -8, y: -4, z: 20 },
      [VRMHumanBoneName.LeftLowerArm]: { x: 2, y: -35, z: 5 },
      [VRMHumanBoneName.RightUpperArm]: { x: -8, y: 4, z: -20 },
      [VRMHumanBoneName.RightLowerArm]: { x: 2, y: 35, z: -5 },
    }
  ),
  createPreset(
    "comfort",
    "温柔安慰",
    "Comforting",
    "肩部放松，双手靠近，头部轻微侧倾。",
    "VRM Preset",
    "comfort",
    {
      [VRMHumanBoneName.Chest]: { x: 1.5 },
      [VRMHumanBoneName.Head]: { x: 2, z: 3 },
      [VRMHumanBoneName.LeftUpperArm]: { x: -18, y: -2, z: 52 },
      [VRMHumanBoneName.LeftLowerArm]: { x: -6, y: -78, z: 6 },
      [VRMHumanBoneName.RightUpperArm]: { x: -18, y: 2, z: -52 },
      [VRMHumanBoneName.RightLowerArm]: { x: -6, y: 78, z: -6 },
    }
  ),
  createPreset(
    "sad",
    "低落难过",
    "Sad",
    "头部低下、肩膀内收，动作幅度较小。",
    "VRMA Ref.",
    "comfort",
    {
      [VRMHumanBoneName.Spine]: { x: 3 },
      [VRMHumanBoneName.Chest]: { x: 3.5 },
      [VRMHumanBoneName.Neck]: { x: 4 },
      [VRMHumanBoneName.Head]: { x: 6, z: -1.5 },
      [VRMHumanBoneName.LeftShoulder]: { z: 2.5 },
      [VRMHumanBoneName.RightShoulder]: { z: -2.5 },
    }
  ),
];

export const VRMA_REFERENCE_PRESETS: ReferencePreset[] = [
  createVrmaPreset(
    "vrma-angry",
    "Angry",
    "来自 tk256ailab/vrm-viewer 的 VRMA 动作，点击后播放一次。",
    "serious",
    "/animations/angry.vrma"
  ),
  createVrmaPreset(
    "vrma-blush",
    "Blush",
    "来自 tk256ailab/vrm-viewer 的 VRMA 动作，点击后播放一次。",
    "smile",
    "/animations/blush.vrma"
  ),
  createVrmaPreset(
    "vrma-clapping",
    "Clapping",
    "来自 tk256ailab/vrm-viewer 的 VRMA 动作，点击后播放一次。",
    "happy",
    "/animations/clapping.vrma"
  ),
  createVrmaPreset(
    "vrma-goodbye",
    "Goodbye",
    "来自 tk256ailab/vrm-viewer 的 VRMA 动作，点击后播放一次。",
    "smile",
    "/animations/goodbye.vrma"
  ),
  createVrmaPreset(
    "vrma-jump",
    "Jump",
    "来自 tk256ailab/vrm-viewer 的 VRMA 动作，点击后播放一次。",
    "happy",
    "/animations/jump.vrma"
  ),
  createVrmaPreset(
    "vrma-look-around",
    "LookAround",
    "来自 tk256ailab/vrm-viewer 的 VRMA 动作，点击后播放一次。",
    "neutral",
    "/animations/look-around.vrma"
  ),
  createVrmaPreset(
    "vrma-relax",
    "Relax",
    "来自 tk256ailab/vrm-viewer 的 VRMA 动作，点击后播放一次。",
    "smile",
    "/animations/relax.vrma"
  ),
  createVrmaPreset(
    "vrma-sad",
    "Sad",
    "来自 tk256ailab/vrm-viewer 的 VRMA 动作，点击后播放一次。",
    "comfort",
    "/animations/sad.vrma"
  ),
  createVrmaPreset(
    "vrma-sleepy",
    "Sleepy",
    "来自 tk256ailab/vrm-viewer 的 VRMA 动作，点击后播放一次。",
    "neutral",
    "/animations/sleepy.vrma"
  ),
  createVrmaPreset(
    "vrma-surprised",
    "Surprised",
    "来自 tk256ailab/vrm-viewer 的 VRMA 动作，点击后播放一次。",
    "surprised",
    "/animations/surprised.vrma"
  ),
  createVrmaPreset(
    "vrma-thinking",
    "Thinking",
    "来自 tk256ailab/vrm-viewer 的 VRMA 动作，点击后播放一次。",
    "serious",
    "/animations/thinking.vrma"
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
  {
    name: "VRoid Project Free VRMA",
    url: "https://vroid.booth.pm/items/5512385",
  },
  {
    name: "Adobe Mixamo",
    url: "https://www.mixamo.com/",
  },
] as const;
