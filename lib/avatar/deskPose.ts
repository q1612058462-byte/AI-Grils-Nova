import {
  VRMHumanBoneList,
  VRMHumanBoneName,
  type VRMHumanBoneName as VRMHumanBoneNameType,
} from "@pixiv/three-vrm";

export type PoseEulerDegrees = {
  x: number;
  y: number;
  z: number;
};

export type PoseDebugBoneName = VRMHumanBoneNameType;
export type DeskPose = Record<PoseDebugBoneName, PoseEulerDegrees>;

export const POSE_DEBUG_BONES = VRMHumanBoneList;

const rotation = (x = 0, y = 0, z = 0): PoseEulerDegrees => ({ x, y, z });

export const DEFAULT_STANDING_POSE = Object.fromEntries(
  POSE_DEBUG_BONES.map((bone) => [bone, rotation()])
) as DeskPose;

export const DEFAULT_WELCOME_POSE: DeskPose = {
  ...DEFAULT_STANDING_POSE,
  [VRMHumanBoneName.Chest]: rotation(1.5, 0, 0),
  [VRMHumanBoneName.Head]: rotation(2, 0, 3),
  [VRMHumanBoneName.LeftUpperArm]: rotation(-18, -2, 52),
  [VRMHumanBoneName.LeftLowerArm]: rotation(
    -4.316563218977278,
    -63.50916244601928,
    -1.3978374629375971
  ),
  [VRMHumanBoneName.LeftHand]: rotation(-49, 0, 0),
  [VRMHumanBoneName.RightUpperArm]: rotation(-18, 2, -52),
  [VRMHumanBoneName.RightLowerArm]: rotation(
    -12.042904223652188,
    63.22536703410017,
    0.4382187782872799
  ),
  [VRMHumanBoneName.RightHand]: rotation(
    -44.349006344792166,
    0.35804361447649585,
    20
  ),
  [VRMHumanBoneName.LeftThumbMetacarpal]: rotation(-9, 0, 0),
  [VRMHumanBoneName.RightThumbMetacarpal]: rotation(-3.0000000000000018, 0, 0),
};

export const DEFAULT_DESK_POSE = DEFAULT_STANDING_POSE;

export const BONE_LABELS_ZH: Record<PoseDebugBoneName, string> = {
  [VRMHumanBoneName.Hips]: "髋部",
  [VRMHumanBoneName.Spine]: "脊柱",
  [VRMHumanBoneName.Chest]: "胸部",
  [VRMHumanBoneName.UpperChest]: "上胸部",
  [VRMHumanBoneName.Neck]: "颈部",
  [VRMHumanBoneName.Head]: "头部",
  [VRMHumanBoneName.LeftEye]: "左眼",
  [VRMHumanBoneName.RightEye]: "右眼",
  [VRMHumanBoneName.Jaw]: "下颌",
  [VRMHumanBoneName.LeftUpperLeg]: "左大腿",
  [VRMHumanBoneName.LeftLowerLeg]: "左小腿",
  [VRMHumanBoneName.LeftFoot]: "左脚",
  [VRMHumanBoneName.LeftToes]: "左脚趾",
  [VRMHumanBoneName.RightUpperLeg]: "右大腿",
  [VRMHumanBoneName.RightLowerLeg]: "右小腿",
  [VRMHumanBoneName.RightFoot]: "右脚",
  [VRMHumanBoneName.RightToes]: "右脚趾",
  [VRMHumanBoneName.LeftShoulder]: "左肩",
  [VRMHumanBoneName.LeftUpperArm]: "左上臂",
  [VRMHumanBoneName.LeftLowerArm]: "左前臂",
  [VRMHumanBoneName.LeftHand]: "左手",
  [VRMHumanBoneName.RightShoulder]: "右肩",
  [VRMHumanBoneName.RightUpperArm]: "右上臂",
  [VRMHumanBoneName.RightLowerArm]: "右前臂",
  [VRMHumanBoneName.RightHand]: "右手",
  [VRMHumanBoneName.LeftThumbMetacarpal]: "左拇指掌骨",
  [VRMHumanBoneName.LeftThumbProximal]: "左拇指近节",
  [VRMHumanBoneName.LeftThumbDistal]: "左拇指远节",
  [VRMHumanBoneName.LeftIndexProximal]: "左食指近节",
  [VRMHumanBoneName.LeftIndexIntermediate]: "左食指中节",
  [VRMHumanBoneName.LeftIndexDistal]: "左食指远节",
  [VRMHumanBoneName.LeftMiddleProximal]: "左中指近节",
  [VRMHumanBoneName.LeftMiddleIntermediate]: "左中指中节",
  [VRMHumanBoneName.LeftMiddleDistal]: "左中指远节",
  [VRMHumanBoneName.LeftRingProximal]: "左无名指近节",
  [VRMHumanBoneName.LeftRingIntermediate]: "左无名指中节",
  [VRMHumanBoneName.LeftRingDistal]: "左无名指远节",
  [VRMHumanBoneName.LeftLittleProximal]: "左小指近节",
  [VRMHumanBoneName.LeftLittleIntermediate]: "左小指中节",
  [VRMHumanBoneName.LeftLittleDistal]: "左小指远节",
  [VRMHumanBoneName.RightThumbMetacarpal]: "右拇指掌骨",
  [VRMHumanBoneName.RightThumbProximal]: "右拇指近节",
  [VRMHumanBoneName.RightThumbDistal]: "右拇指远节",
  [VRMHumanBoneName.RightIndexProximal]: "右食指近节",
  [VRMHumanBoneName.RightIndexIntermediate]: "右食指中节",
  [VRMHumanBoneName.RightIndexDistal]: "右食指远节",
  [VRMHumanBoneName.RightMiddleProximal]: "右中指近节",
  [VRMHumanBoneName.RightMiddleIntermediate]: "右中指中节",
  [VRMHumanBoneName.RightMiddleDistal]: "右中指远节",
  [VRMHumanBoneName.RightRingProximal]: "右无名指近节",
  [VRMHumanBoneName.RightRingIntermediate]: "右无名指中节",
  [VRMHumanBoneName.RightRingDistal]: "右无名指远节",
  [VRMHumanBoneName.RightLittleProximal]: "右小指近节",
  [VRMHumanBoneName.RightLittleIntermediate]: "右小指中节",
  [VRMHumanBoneName.RightLittleDistal]: "右小指远节",
};

export function cloneDeskPose(pose: DeskPose = DEFAULT_DESK_POSE): DeskPose {
  return Object.fromEntries(
    POSE_DEBUG_BONES.map((bone) => [bone, { ...pose[bone] }])
  ) as DeskPose;
}

export function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
