import { VRMHumanBoneName } from "@pixiv/three-vrm";
import { cloneDeskPose, type DeskPose, type PoseDebugBoneName } from "@/lib/avatar/deskPose";
import type { AvatarExpression } from "@/types/avatar";

export type ReferencePreset = {
  id: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  source: "VRMA Ref." | "Mixamo Ref." | "VRM Preset" | "Custom";
  expression: AvatarExpression;
  pose: PosePatch;
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
    "desk-neutral",
    "自然站姿",
    "Natural Standing",
    "恢复模型归一化骨骼的默认自然站立姿势。",
    "VRM Preset",
    "neutral",
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

export const REFERENCE_SOURCES = [
  {
    name: "VRM Animation / VRMA",
    url: "https://vrm.dev/en/vrma/",
  },
  {
    name: "VRoid Hub Free VRMA",
    url: "https://vroid.com/en/news/6HozzBIV0KkcKf9dc1fZGW",
  },
  {
    name: "Adobe Mixamo",
    url: "https://www.mixamo.com/",
  },
] as const;
