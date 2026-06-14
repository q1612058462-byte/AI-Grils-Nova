"use client";

import {
  ContactShadows,
  DragControls,
  Environment,
  Html,
  MeshReflectorMaterial,
  OrbitControls,
  RoundedBox,
  TransformControls,
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  VRM,
  VRMLoaderPlugin,
  VRMHumanBoneName,
  VRMExpressionPresetName,
  VRMUtils,
} from "@pixiv/three-vrm";
import PoseDebugPanel from "@/components/PoseDebugPanel";
import ReferenceLibraryPanel from "@/components/ReferenceLibraryPanel";
import {
  cloneDeskPose,
  DEFAULT_DESK_POSE,
  degreesToRadians,
  POSE_DEBUG_BONES,
  type DeskPose,
  type PoseDebugBoneName,
  type PoseEulerDegrees,
} from "@/lib/avatar/deskPose";
import {
  applyReferencePreset,
  REFERENCE_PRESETS,
  type ReferencePreset,
} from "@/lib/avatar/referenceLibrary";
import type { AvatarExpression, AvatarState } from "@/types/avatar";
import type { ScenePresetId } from "@/lib/avatar/appearanceLibrary";

type AvatarFaceProps = {
  state: AvatarState;
  expression: AvatarExpression;
  mouthOpen: number;
  speaking: boolean;
  scenePresetId: ScenePresetId;
  modelUrl: string;
};

type VRMCharacterProps = AvatarFaceProps & {
  deskPose: DeskPose;
  showPoseDebug: boolean;
  previewReference: boolean;
  selectedBone: PoseDebugBoneName | null;
  characterPosition: [number, number, number];
  enableCharacterMove: boolean;
  onSelectBone: (bone: PoseDebugBoneName) => void;
  onCharacterPositionChange: (position: [number, number, number]) => void;
  onCharacterPositionDelta: (delta: THREE.Vector3) => void;
  onBoneRotationChange: (bone: PoseDebugBoneName, rotation: PoseEulerDegrees) => void;
  onAvailableBonesChange: (bones: PoseDebugBoneName[]) => void;
};

type BoneNodeEntry = {
  bone: PoseDebugBoneName;
  node: THREE.Object3D;
};

const CUSTOM_PRESETS_STORAGE_KEY = "avatar.customPosePresets.v1";
const DEFAULT_REFERENCE_PRESET =
  REFERENCE_PRESETS.find((preset) => preset.id === "comfort") ?? REFERENCE_PRESETS[0];

const expressionToVrmPreset: Record<AvatarExpression, string> = {
  neutral: VRMExpressionPresetName.Neutral,
  smile: VRMExpressionPresetName.Relaxed,
  happy: VRMExpressionPresetName.Happy,
  serious: VRMExpressionPresetName.Angry,
  comfort: VRMExpressionPresetName.Sad,
  surprised: VRMExpressionPresetName.Surprised,
};

function applyDeskPose(vrm: VRM, deskPose: DeskPose) {
  for (const bone of POSE_DEBUG_BONES) {
    const node = vrm.humanoid.getNormalizedBoneNode(bone);
    if (!node) continue;

    const rotation = deskPose[bone];
    node.rotation.set(
      degreesToRadians(rotation.x),
      degreesToRadians(rotation.y),
      degreesToRadians(rotation.z)
    );
  }
}

const IK_ITERATIONS = 10;
const IK_CHAIN_LENGTH = 3;
const IK_TOLERANCE = 0.008;
const IK_MAX_STEP = THREE.MathUtils.degToRad(18);
const ikJointPosition = new THREE.Vector3();
const ikEndPosition = new THREE.Vector3();
const ikToEnd = new THREE.Vector3();
const ikToTarget = new THREE.Vector3();
const ikJointWorldQuaternion = new THREE.Quaternion();
const ikParentWorldQuaternion = new THREE.Quaternion();
const ikDeltaQuaternion = new THREE.Quaternion();
const ikDesiredWorldQuaternion = new THREE.Quaternion();
const ikIdentityQuaternion = new THREE.Quaternion();

function rotationFromNode(node: THREE.Object3D): PoseEulerDegrees {
  return {
    x: THREE.MathUtils.radToDeg(node.rotation.x),
    y: THREE.MathUtils.radToDeg(node.rotation.y),
    z: THREE.MathUtils.radToDeg(node.rotation.z),
  };
}

function solveBoneChainIK(
  endNode: THREE.Object3D,
  target: THREE.Vector3,
  boneByNode: ReadonlyMap<THREE.Object3D, PoseDebugBoneName>
): BoneNodeEntry[] {
  const chain: BoneNodeEntry[] = [];
  let ancestor = endNode.parent;

  while (ancestor && chain.length < IK_CHAIN_LENGTH) {
    const bone = boneByNode.get(ancestor);
    if (bone) {
      chain.push({ bone, node: ancestor });
    }
    ancestor = ancestor.parent;
  }

  if (chain.length === 0) return chain;

  for (let iteration = 0; iteration < IK_ITERATIONS; iteration += 1) {
    endNode.getWorldPosition(ikEndPosition);
    if (ikEndPosition.distanceToSquared(target) <= IK_TOLERANCE * IK_TOLERANCE) break;

    for (const { node: joint } of chain) {
      joint.getWorldPosition(ikJointPosition);
      endNode.getWorldPosition(ikEndPosition);
      ikToEnd.subVectors(ikEndPosition, ikJointPosition);
      ikToTarget.subVectors(target, ikJointPosition);

      if (ikToEnd.lengthSq() < 1e-8 || ikToTarget.lengthSq() < 1e-8) continue;

      ikToEnd.normalize();
      ikToTarget.normalize();
      ikDeltaQuaternion.setFromUnitVectors(ikToEnd, ikToTarget);

      const angle = 2 * Math.acos(THREE.MathUtils.clamp(ikDeltaQuaternion.w, -1, 1));
      if (angle > IK_MAX_STEP) {
        ikDeltaQuaternion.slerpQuaternions(
          ikIdentityQuaternion,
          ikDeltaQuaternion,
          IK_MAX_STEP / angle
        );
      }

      joint.getWorldQuaternion(ikJointWorldQuaternion);
      ikDesiredWorldQuaternion.multiplyQuaternions(
        ikDeltaQuaternion,
        ikJointWorldQuaternion
      );

      if (joint.parent) {
        joint.parent.getWorldQuaternion(ikParentWorldQuaternion).invert();
        joint.quaternion.multiplyQuaternions(
          ikParentWorldQuaternion,
          ikDesiredWorldQuaternion
        );
      } else {
        joint.quaternion.copy(ikDesiredWorldQuaternion);
      }

      joint.updateMatrix();
      joint.updateWorldMatrix(false, true);
    }
  }

  return chain;
}

function BoneDragHandle({
  bone,
  node,
  selected,
  boneByNode,
  onSelect,
  onDragStateChange,
  onRootDrag,
  onBoneRotationChange,
}: BoneNodeEntry & {
  selected: boolean;
  boneByNode: ReadonlyMap<THREE.Object3D, PoseDebugBoneName>;
  onSelect: (bone: PoseDebugBoneName) => void;
  onDragStateChange: (dragging: boolean) => void;
  onRootDrag: (target: THREE.Vector3) => void;
  onBoneRotationChange: (bone: PoseDebugBoneName, rotation: PoseEulerDegrees) => void;
}) {
  const handleRef = useRef<THREE.Group>(null);
  const draggingRef = useRef(false);
  const worldPosition = useMemo(() => new THREE.Vector3(), []);
  const compact =
    /(?:Thumb|Index|Middle|Ring|Little)/.test(bone) ||
    bone === VRMHumanBoneName.LeftEye ||
    bone === VRMHumanBoneName.RightEye ||
    bone === VRMHumanBoneName.Jaw;
  const radius = compact
    ? selected
      ? 0.011
      : 0.006
    : selected
      ? 0.018
      : 0.011;

  useFrame(() => {
    if (!handleRef.current || draggingRef.current) return;
    node.getWorldPosition(worldPosition);
    handleRef.current.matrix.setPosition(worldPosition);
    handleRef.current.matrixWorldNeedsUpdate = true;
  });

  return (
    <DragControls
      ref={handleRef}
      autoTransform
      onDragStart={() => {
        draggingRef.current = true;
        onSelect(bone);
        onDragStateChange(true);
      }}
      onDrag={(matrix) => {
        worldPosition.setFromMatrixPosition(matrix);
        const changedBones = solveBoneChainIK(node, worldPosition, boneByNode);
        if (changedBones.length === 0) {
          onRootDrag(worldPosition);
        }
        for (const changed of changedBones) {
          onBoneRotationChange(changed.bone, rotationFromNode(changed.node));
        }
      }}
      onDragEnd={() => {
        draggingRef.current = false;
        onDragStateChange(false);
      }}
    >
      <mesh
        renderOrder={220}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect(bone);
        }}
      >
        <sphereGeometry args={[radius, 12, 8]} />
        <meshBasicMaterial
          color={selected ? "#fbbf24" : "#22d3ee"}
          depthTest={false}
          transparent
          opacity={selected ? 1 : 0.78}
        />
      </mesh>
    </DragControls>
  );
}

const movementProfile: Record<
  AvatarState,
  {
    speed: number;
    sway: number;
    range: number;
    pitch: number;
    lean: number;
    headBob: number;
  }
> = {
  idle: {
    speed: 0.32,
    sway: 0.008,
    range: 0.008,
    pitch: 0,
    lean: 0,
    headBob: 0.004,
  },
  listening: {
    speed: 0.38,
    sway: 0.01,
    range: 0.01,
    pitch: 0.005,
    lean: 0.012,
    headBob: 0.006,
  },
  thinking: {
    speed: 0.3,
    sway: 0.008,
    range: 0.008,
    pitch: 0.008,
    lean: 0.018,
    headBob: 0.008,
  },
  speaking: {
    speed: 0.52,
    sway: 0.014,
    range: 0.014,
    pitch: 0.006,
    lean: 0.018,
    headBob: 0.012,
  },
};

function VRMCharacter({
  state,
  expression,
  mouthOpen,
  speaking,
  deskPose,
  showPoseDebug,
  previewReference,
  selectedBone,
  characterPosition,
  enableCharacterMove,
  onSelectBone,
  onCharacterPositionChange,
  onCharacterPositionDelta,
  onBoneRotationChange,
    onAvailableBonesChange,
    modelUrl,
}: VRMCharacterProps) {
  const [vrm, setVRM] = useState<VRM | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const startTimeRef = useRef(performance.now());
  const blinkRef = useRef({
    elapsed: 0,
    nextBlink: 2.4,
    progress: -1,
  });
  const motionBlendRef = useRef({
    locomotion: 0.2,
    speech: 0.12,
    attention: 0.35,
  });
  const ikDraggingRef = useRef(false);
  const [characterRoot, setCharacterRoot] = useState<THREE.Group | null>(null);

  const profile = useMemo(() => movementProfile[state], [state]);
  const boneNodes = useMemo<BoneNodeEntry[]>(() => {
    if (!vrm) return [];
    return POSE_DEBUG_BONES.flatMap((bone) => {
      const node = vrm.humanoid.getNormalizedBoneNode(bone);
      return node ? [{ bone, node }] : [];
    });
  }, [vrm]);
  const boneByNode = useMemo(
    () => new Map(boneNodes.map(({ bone, node }) => [node, bone])),
    [boneNodes]
  );
  const selectedBoneNode = useMemo(() => {
    if (!vrm || !selectedBone) return null;
    return vrm.humanoid.getNormalizedBoneNode(selectedBone);
  }, [selectedBone, vrm]);
  const skeletonHelper = useMemo(() => {
    if (!vrm || !showPoseDebug) return null;

    const helper = new THREE.SkeletonHelper(vrm.scene);
    const materials = Array.isArray(helper.material) ? helper.material : [helper.material];
    for (const material of materials) {
      material.depthTest = false;
      material.transparent = true;
      material.opacity = 0.55;
    }
    helper.renderOrder = 100;
    return helper;
  }, [showPoseDebug, vrm]);

  useEffect(() => {
    return () => {
      skeletonHelper?.geometry.dispose();
      if (skeletonHelper) {
        const materials = Array.isArray(skeletonHelper.material)
          ? skeletonHelper.material
          : [skeletonHelper.material];
        materials.forEach((material) => material.dispose());
      }
    };
  }, [skeletonHelper]);

  useEffect(() => {
    if (vrm && (showPoseDebug || previewReference)) {
      applyDeskPose(vrm, deskPose);
    }
  }, [deskPose, previewReference, showPoseDebug, vrm]);

  const syncSelectedBoneRotation = useCallback(() => {
    if (!selectedBone || !selectedBoneNode) return;

    onBoneRotationChange(selectedBone, {
      x: THREE.MathUtils.radToDeg(selectedBoneNode.rotation.x),
      y: THREE.MathUtils.radToDeg(selectedBoneNode.rotation.y),
      z: THREE.MathUtils.radToDeg(selectedBoneNode.rotation.z),
    });
  }, [onBoneRotationChange, selectedBone, selectedBoneNode]);

  const selectNearestBone = useCallback(
    (point: THREE.Vector3) => {
      let nearest: BoneNodeEntry | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      const position = new THREE.Vector3();

      for (const entry of boneNodes) {
        entry.node.getWorldPosition(position);
        const distance = position.distanceToSquared(point);
        if (distance < nearestDistance) {
          nearest = entry;
          nearestDistance = distance;
        }
      }

      if (nearest) {
        onSelectBone(nearest.bone);
      }
    },
    [boneNodes, onSelectBone]
  );

  const dragRootBone = useCallback(
    (target: THREE.Vector3) => {
      if (!vrm) return;
      const hips = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Hips);
      if (!hips) return;

      const current = new THREE.Vector3();
      hips.getWorldPosition(current);
      const delta = target.clone().sub(current);
      onCharacterPositionDelta(delta);
    },
    [onCharacterPositionDelta, vrm]
  );

  const syncCharacterPosition = useCallback(() => {
    if (!characterRoot) return;
    const { x, y, z } = characterRoot.position;
    onCharacterPositionChange([x, y, z]);
  }, [characterRoot, onCharacterPositionChange]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setVRM(null);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      modelUrl,
      (gltf) => {
        if (cancelled) {
          return;
        }

        const loadedVrm = gltf.userData.vrm as VRM | undefined;
        if (!loadedVrm) {
          setLoadError("VRM 模型解析失败，未找到 vrm 数据。");
          return;
        }

        if (loadedVrm.meta.metaVersion === "0") {
          VRMUtils.rotateVRM0(loadedVrm);
        }

        loadedVrm.scene.scale.setScalar(1.58);
        loadedVrm.scene.position.set(0, -1.34, 0);
        loadedVrm.scene.rotation.set(0, loadedVrm.meta.metaVersion === "0" ? Math.PI : 0, 0);
        loadedVrm.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;

          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            const texturedMaterial = material as THREE.Material & {
              map?: THREE.Texture | null;
              envMapIntensity?: number;
            };
            if (texturedMaterial.map) {
              texturedMaterial.map.anisotropy = 8;
              texturedMaterial.map.needsUpdate = true;
            }
            if ("envMapIntensity" in texturedMaterial) {
              texturedMaterial.envMapIntensity = 0.72;
            }
          }
        });

        onAvailableBonesChange(
          POSE_DEBUG_BONES.filter((bone) => loadedVrm.humanoid.getNormalizedBoneNode(bone) !== null)
        );
        setVRM(loadedVrm);
      },
      undefined,
      (error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "VRM 模型加载失败。";
        setLoadError(message);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [modelUrl, onAvailableBonesChange]);

  useEffect(() => {
    return () => {
      if (vrm) {
        VRMUtils.deepDispose(vrm.scene);
      }
    };
  }, [vrm]);

  useFrame((_, delta) => {
    if (!vrm) return;

    const t = (performance.now() - startTimeRef.current) / 1000;
    const walk = t * profile.speed;
    const sway = Math.sin(walk * 1.3) * profile.sway;
    const speakingAmount = speaking ? 1 : 0;
    const targetLocomotion = state === "speaking" ? 0.42 : state === "listening" ? 0.24 : state === "thinking" ? 0.18 : 0.12;
    const targetSpeech = speakingAmount;
    const targetAttention = state === "listening" ? 0.85 : state === "thinking" ? 0.72 : state === "speaking" ? 0.58 : 0.32;
    motionBlendRef.current.locomotion = THREE.MathUtils.damp(
      motionBlendRef.current.locomotion,
      targetLocomotion,
      3.5,
      delta
    );
    motionBlendRef.current.speech = THREE.MathUtils.damp(motionBlendRef.current.speech, targetSpeech, 5.5, delta);
    motionBlendRef.current.attention = THREE.MathUtils.damp(
      motionBlendRef.current.attention,
      targetAttention,
      4.2,
      delta
    );
    const locomotion = motionBlendRef.current.locomotion;
    const speech = motionBlendRef.current.speech;
    const attention = motionBlendRef.current.attention;
    const motionScale = showPoseDebug || previewReference ? 0 : 1;
    const idleShift = Math.sin(t * 0.35) * 0.008;
    const breath = Math.sin(t * 1.15) * 0.012;
    const gestureBeat = Math.pow(Math.max(0, Math.sin(t * 1.05 - 0.6)), 3) * speech;
    const secondaryGesture = Math.pow(Math.max(0, Math.sin(t * 0.73 + 2.1)), 4) * speech;
    const conversationalLean = speech * (0.012 + gestureBeat * 0.025);
    const weightShift = Math.sin(t * 0.31) * 0.012;
    const stanceEnergy = 0.55 + locomotion * 0.55;

    vrm.scene.position.x = Math.sin(walk * 0.7) * profile.range + idleShift + weightShift;
    vrm.scene.position.y = -1.34 + breath * 0.55;
    vrm.scene.position.z = 0;
    const frontRotation = vrm.meta.metaVersion === "0" ? Math.PI : 0;
    vrm.scene.rotation.y = THREE.MathUtils.damp(vrm.scene.rotation.y, frontRotation, 8, delta);
    vrm.scene.rotation.z = sway * 0.18 + Math.sin(t * 0.28) * 0.003;

    const hips = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Hips);
    const spine = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Spine);
    const chest = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Chest);
    const neck = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
    const head = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
    const upperChest = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.UpperChest);
    const leftShoulder = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftShoulder);
    const rightShoulder = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightShoulder);
    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm);
    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm);
    const leftLowerArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm);
    const rightLowerArm = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm);
    const leftHand = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftHand);
    const rightHand = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightHand);
    const leftUpperLeg = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperLeg);
    const rightUpperLeg = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightUpperLeg);
    const leftLowerLeg = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerLeg);
    const rightLowerLeg = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightLowerLeg);
    const jaw = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Jaw);
    const leftEye = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftEye);
    const rightEye = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightEye);
    const poseValue = (
      bone: PoseDebugBoneName,
      axis: keyof PoseEulerDegrees
    ) => degreesToRadians(deskPose[bone][axis]);

    if (!ikDraggingRef.current) {
    if (hips) {
      hips.rotation.x = THREE.MathUtils.damp(
        hips.rotation.x,
        poseValue(VRMHumanBoneName.Hips, "x") - breath * 0.2 * motionScale,
        9,
        delta
      );
      hips.rotation.y = THREE.MathUtils.damp(hips.rotation.y, poseValue(VRMHumanBoneName.Hips, "y"), 9, delta);
      hips.rotation.z = THREE.MathUtils.damp(
        hips.rotation.z,
        poseValue(VRMHumanBoneName.Hips, "z") + (sway * 0.25 + weightShift * 0.45) * motionScale,
        5.5,
        delta
      );
    }
    if (spine) {
      spine.rotation.x = THREE.MathUtils.damp(
        spine.rotation.x,
        poseValue(VRMHumanBoneName.Spine, "x") +
          (profile.pitch * stanceEnergy + profile.lean * (0.2 + speech * 0.45) + breath * 0.55 + conversationalLean) *
            motionScale,
        5.5,
        delta
      );
      spine.rotation.y = THREE.MathUtils.damp(
        spine.rotation.y,
        poseValue(VRMHumanBoneName.Spine, "y") + (weightShift * 0.75 + gestureBeat * 0.018) * motionScale,
        5,
        delta
      );
      spine.rotation.z = THREE.MathUtils.damp(spine.rotation.z, poseValue(VRMHumanBoneName.Spine, "z"), 5, delta);
    }
    if (chest) {
      chest.rotation.x = THREE.MathUtils.damp(
        chest.rotation.x,
        poseValue(VRMHumanBoneName.Chest, "x") +
          (profile.pitch * stanceEnergy + profile.lean * 0.2 + breath * 0.75 + conversationalLean * 0.8) * motionScale,
        5.8,
        delta
      );
      chest.rotation.y = THREE.MathUtils.damp(
        chest.rotation.y,
        poseValue(VRMHumanBoneName.Chest, "y") + (-weightShift * 0.8 - gestureBeat * 0.025) * motionScale,
        5,
        delta
      );
      chest.rotation.z = THREE.MathUtils.damp(chest.rotation.z, poseValue(VRMHumanBoneName.Chest, "z"), 5, delta);
    }
    if (upperChest) {
      upperChest.rotation.set(
        poseValue(VRMHumanBoneName.UpperChest, "x"),
        poseValue(VRMHumanBoneName.UpperChest, "y"),
        poseValue(VRMHumanBoneName.UpperChest, "z")
      );
    }
    if (neck) {
      neck.rotation.x = THREE.MathUtils.damp(
        neck.rotation.x,
        poseValue(VRMHumanBoneName.Neck, "x") +
          (Math.sin(t * 0.9) * 0.045 * attention + profile.headBob * stanceEnergy + speech * 0.02) * motionScale,
        10,
        delta
      );
      neck.rotation.y = THREE.MathUtils.damp(
        neck.rotation.y,
        poseValue(VRMHumanBoneName.Neck, "y") +
          (Math.sin(t * 0.6) * 0.025 * attention + (state === "listening" ? 0.015 : 0)) * motionScale,
        10,
        delta
      );
      neck.rotation.z = THREE.MathUtils.damp(neck.rotation.z, poseValue(VRMHumanBoneName.Neck, "z"), 10, delta);
    }
    if (head) {
      const headNod = state === "thinking" ? 0.04 : 0;
      const headAttentive = state === "listening" ? 0.018 : 0;
      head.rotation.x = THREE.MathUtils.damp(
        head.rotation.x,
        poseValue(VRMHumanBoneName.Head, "x") +
          (Math.sin(t * 0.82) * 0.008 * attention + headNod + gestureBeat * 0.035 - secondaryGesture * 0.018) *
            motionScale,
        7,
        delta
      );
      head.rotation.y = THREE.MathUtils.damp(
        head.rotation.y,
        poseValue(VRMHumanBoneName.Head, "y") +
          (Math.sin(t * 0.55) * 0.018 * attention + headAttentive + (state === "thinking" ? -0.025 : 0)) *
            motionScale,
        7,
        delta
      );
      head.rotation.z = THREE.MathUtils.damp(
        head.rotation.z,
        poseValue(VRMHumanBoneName.Head, "z") +
          (Math.sin(t * 0.48) * 0.012 * attention + (state === "listening" ? 0.018 : 0)) * motionScale,
        7,
        delta
      );
    }
    if (leftShoulder) {
      leftShoulder.rotation.x = THREE.MathUtils.damp(
        leftShoulder.rotation.x,
        poseValue(VRMHumanBoneName.LeftShoulder, "x") + gestureBeat * 0.025 * motionScale,
        6,
        delta
      );
      leftShoulder.rotation.y = THREE.MathUtils.damp(
        leftShoulder.rotation.y,
        poseValue(VRMHumanBoneName.LeftShoulder, "y"),
        6,
        delta
      );
      leftShoulder.rotation.z = THREE.MathUtils.damp(
        leftShoulder.rotation.z,
        poseValue(VRMHumanBoneName.LeftShoulder, "z") - gestureBeat * 0.035 * motionScale,
        6,
        delta
      );
    }
    if (rightShoulder) {
      rightShoulder.rotation.x = THREE.MathUtils.damp(
        rightShoulder.rotation.x,
        poseValue(VRMHumanBoneName.RightShoulder, "x") - secondaryGesture * 0.02 * motionScale,
        6,
        delta
      );
      rightShoulder.rotation.y = THREE.MathUtils.damp(
        rightShoulder.rotation.y,
        poseValue(VRMHumanBoneName.RightShoulder, "y"),
        6,
        delta
      );
      rightShoulder.rotation.z = THREE.MathUtils.damp(
        rightShoulder.rotation.z,
        poseValue(VRMHumanBoneName.RightShoulder, "z") + secondaryGesture * 0.03 * motionScale,
        6,
        delta
      );
    }
    if (leftUpperArm) {
      leftUpperArm.rotation.x = THREE.MathUtils.damp(
        leftUpperArm.rotation.x,
        poseValue(VRMHumanBoneName.LeftUpperArm, "x") +
          (-gestureBeat * 0.18 + secondaryGesture * 0.06) * motionScale,
        6.5,
        delta
      );
      leftUpperArm.rotation.y = THREE.MathUtils.damp(
        leftUpperArm.rotation.y,
        poseValue(VRMHumanBoneName.LeftUpperArm, "y"),
        6,
        delta
      );
      leftUpperArm.rotation.z = THREE.MathUtils.damp(
        leftUpperArm.rotation.z,
        poseValue(VRMHumanBoneName.LeftUpperArm, "z") - gestureBeat * 0.06 * motionScale,
        6,
        delta
      );
    }
    if (rightUpperArm) {
      rightUpperArm.rotation.x = THREE.MathUtils.damp(
        rightUpperArm.rotation.x,
        poseValue(VRMHumanBoneName.RightUpperArm, "x") +
          (-secondaryGesture * 0.16 + gestureBeat * 0.04) * motionScale,
        6.5,
        delta
      );
      rightUpperArm.rotation.y = THREE.MathUtils.damp(
        rightUpperArm.rotation.y,
        poseValue(VRMHumanBoneName.RightUpperArm, "y"),
        6,
        delta
      );
      rightUpperArm.rotation.z = THREE.MathUtils.damp(
        rightUpperArm.rotation.z,
        poseValue(VRMHumanBoneName.RightUpperArm, "z") + secondaryGesture * 0.06 * motionScale,
        6,
        delta
      );
    }
    if (leftLowerArm) {
      leftLowerArm.rotation.x = THREE.MathUtils.damp(
        leftLowerArm.rotation.x,
        poseValue(VRMHumanBoneName.LeftLowerArm, "x") - gestureBeat * 0.05 * motionScale,
        7,
        delta
      );
      leftLowerArm.rotation.y = THREE.MathUtils.damp(
        leftLowerArm.rotation.y,
        poseValue(VRMHumanBoneName.LeftLowerArm, "y") - gestureBeat * 0.1 * motionScale,
        7,
        delta
      );
      leftLowerArm.rotation.z = THREE.MathUtils.damp(
        leftLowerArm.rotation.z,
        poseValue(VRMHumanBoneName.LeftLowerArm, "z") + gestureBeat * 0.06 * motionScale,
        7,
        delta
      );
    }
    if (rightLowerArm) {
      rightLowerArm.rotation.x = THREE.MathUtils.damp(
        rightLowerArm.rotation.x,
        poseValue(VRMHumanBoneName.RightLowerArm, "x") - secondaryGesture * 0.05 * motionScale,
        7,
        delta
      );
      rightLowerArm.rotation.y = THREE.MathUtils.damp(
        rightLowerArm.rotation.y,
        poseValue(VRMHumanBoneName.RightLowerArm, "y") + secondaryGesture * 0.09 * motionScale,
        7,
        delta
      );
      rightLowerArm.rotation.z = THREE.MathUtils.damp(
        rightLowerArm.rotation.z,
        poseValue(VRMHumanBoneName.RightLowerArm, "z") - secondaryGesture * 0.06 * motionScale,
        7,
        delta
      );
    }
    if (leftHand) {
      leftHand.rotation.x = THREE.MathUtils.damp(
        leftHand.rotation.x,
        poseValue(VRMHumanBoneName.LeftHand, "x") - gestureBeat * 0.05 * motionScale,
        6,
        delta
      );
      leftHand.rotation.y = THREE.MathUtils.damp(
        leftHand.rotation.y,
        poseValue(VRMHumanBoneName.LeftHand, "y") + gestureBeat * 0.05 * motionScale,
        6,
        delta
      );
      leftHand.rotation.z = THREE.MathUtils.damp(
        leftHand.rotation.z,
        poseValue(VRMHumanBoneName.LeftHand, "z") + gestureBeat * 0.04 * motionScale,
        6,
        delta
      );
    }
    if (rightHand) {
      rightHand.rotation.x = THREE.MathUtils.damp(
        rightHand.rotation.x,
        poseValue(VRMHumanBoneName.RightHand, "x") - secondaryGesture * 0.05 * motionScale,
        6,
        delta
      );
      rightHand.rotation.y = THREE.MathUtils.damp(
        rightHand.rotation.y,
        poseValue(VRMHumanBoneName.RightHand, "y") - secondaryGesture * 0.05 * motionScale,
        6,
        delta
      );
      rightHand.rotation.z = THREE.MathUtils.damp(
        rightHand.rotation.z,
        poseValue(VRMHumanBoneName.RightHand, "z") - secondaryGesture * 0.04 * motionScale,
        6,
        delta
      );
    }
    if (leftUpperLeg) {
      leftUpperLeg.rotation.x = THREE.MathUtils.damp(
        leftUpperLeg.rotation.x,
        poseValue(VRMHumanBoneName.LeftUpperLeg, "x"),
        10,
        delta
      );
      leftUpperLeg.rotation.y = THREE.MathUtils.damp(
        leftUpperLeg.rotation.y,
        poseValue(VRMHumanBoneName.LeftUpperLeg, "y"),
        10,
        delta
      );
      leftUpperLeg.rotation.z = THREE.MathUtils.damp(
        leftUpperLeg.rotation.z,
        poseValue(VRMHumanBoneName.LeftUpperLeg, "z"),
        10,
        delta
      );
    }
    if (rightUpperLeg) {
      rightUpperLeg.rotation.x = THREE.MathUtils.damp(
        rightUpperLeg.rotation.x,
        poseValue(VRMHumanBoneName.RightUpperLeg, "x"),
        10,
        delta
      );
      rightUpperLeg.rotation.y = THREE.MathUtils.damp(
        rightUpperLeg.rotation.y,
        poseValue(VRMHumanBoneName.RightUpperLeg, "y"),
        10,
        delta
      );
      rightUpperLeg.rotation.z = THREE.MathUtils.damp(
        rightUpperLeg.rotation.z,
        poseValue(VRMHumanBoneName.RightUpperLeg, "z"),
        10,
        delta
      );
    }
    if (leftLowerLeg) {
      leftLowerLeg.rotation.x = THREE.MathUtils.damp(
        leftLowerLeg.rotation.x,
        poseValue(VRMHumanBoneName.LeftLowerLeg, "x"),
        10,
        delta
      );
      leftLowerLeg.rotation.y = THREE.MathUtils.damp(
        leftLowerLeg.rotation.y,
        poseValue(VRMHumanBoneName.LeftLowerLeg, "y"),
        10,
        delta
      );
      leftLowerLeg.rotation.z = THREE.MathUtils.damp(
        leftLowerLeg.rotation.z,
        poseValue(VRMHumanBoneName.LeftLowerLeg, "z"),
        10,
        delta
      );
    }
    if (rightLowerLeg) {
      rightLowerLeg.rotation.x = THREE.MathUtils.damp(
        rightLowerLeg.rotation.x,
        poseValue(VRMHumanBoneName.RightLowerLeg, "x"),
        10,
        delta
      );
      rightLowerLeg.rotation.y = THREE.MathUtils.damp(
        rightLowerLeg.rotation.y,
        poseValue(VRMHumanBoneName.RightLowerLeg, "y"),
        10,
        delta
      );
      rightLowerLeg.rotation.z = THREE.MathUtils.damp(
        rightLowerLeg.rotation.z,
        poseValue(VRMHumanBoneName.RightLowerLeg, "z"),
        10,
        delta
      );
    }
    if (jaw) {
      jaw.rotation.x = THREE.MathUtils.damp(
        jaw.rotation.x,
        poseValue(VRMHumanBoneName.Jaw, "x") + mouthOpen * 0.34 * motionScale,
        16,
        delta
      );
      jaw.rotation.y = THREE.MathUtils.damp(jaw.rotation.y, poseValue(VRMHumanBoneName.Jaw, "y"), 16, delta);
      jaw.rotation.z = THREE.MathUtils.damp(jaw.rotation.z, poseValue(VRMHumanBoneName.Jaw, "z"), 16, delta);
    }
    if (leftEye) {
      leftEye.rotation.x = THREE.MathUtils.damp(
        leftEye.rotation.x,
        poseValue(VRMHumanBoneName.LeftEye, "x"),
        12,
        delta
      );
      leftEye.rotation.y = THREE.MathUtils.damp(
        leftEye.rotation.y,
        poseValue(VRMHumanBoneName.LeftEye, "y") + Math.sin(t * 0.32) * 0.008 * motionScale,
        12,
        delta
      );
      leftEye.rotation.z = THREE.MathUtils.damp(
        leftEye.rotation.z,
        poseValue(VRMHumanBoneName.LeftEye, "z"),
        12,
        delta
      );
    }
    if (rightEye) {
      rightEye.rotation.x = THREE.MathUtils.damp(
        rightEye.rotation.x,
        poseValue(VRMHumanBoneName.RightEye, "x"),
        12,
        delta
      );
      rightEye.rotation.y = THREE.MathUtils.damp(
        rightEye.rotation.y,
        poseValue(VRMHumanBoneName.RightEye, "y") + Math.sin(t * 0.32) * 0.008 * motionScale,
        12,
        delta
      );
      rightEye.rotation.z = THREE.MathUtils.damp(
        rightEye.rotation.z,
        poseValue(VRMHumanBoneName.RightEye, "z"),
        12,
        delta
      );
    }
    }

    const expressionManager = vrm.expressionManager;
    if (expressionManager) {
      expressionManager.resetValues();
      expressionManager.setValue(expressionToVrmPreset[expression], expression === "neutral" ? 0.7 : 0.82);

      const mouthPhase = t * 8.5;
      const roundedVowel = (Math.sin(mouthPhase * 0.73) + 1) * 0.5;
      expressionManager.setValue(VRMExpressionPresetName.Aa, mouthOpen * (0.58 + roundedVowel * 0.22));
      expressionManager.setValue(VRMExpressionPresetName.Ih, mouthOpen * (1 - roundedVowel) * 0.24);
      expressionManager.setValue(VRMExpressionPresetName.Ou, mouthOpen * roundedVowel * 0.24);

      const blinkState = blinkRef.current;
      blinkState.elapsed += delta;
      if (blinkState.progress < 0 && blinkState.elapsed >= blinkState.nextBlink) {
        blinkState.progress = 0;
      }
      let blink = 0;
      if (blinkState.progress >= 0) {
        blinkState.progress += delta / 0.16;
        blink = Math.sin(Math.min(1, blinkState.progress) * Math.PI);
        if (blinkState.progress >= 1) {
          blinkState.elapsed = 0;
          blinkState.progress = -1;
          blinkState.nextBlink = 2.2 + Math.random() * 3.2;
        }
      }
      expressionManager.setValue(VRMExpressionPresetName.Blink, blink);
    }

    vrm.update(delta);
  });

  if (loadError) {
    return (
      <Html center className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-200">
        {loadError}
      </Html>
    );
  }

  if (!vrm) {
    return (
      <Html center className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-200">
        正在加载 VRM 模型…
      </Html>
    );
  }

  return (
    <>
      <group ref={setCharacterRoot} position={characterPosition}>
        <primitive
          object={vrm.scene}
          onPointerDown={(event: { point: THREE.Vector3; stopPropagation: () => void }) => {
            if (!showPoseDebug) return;
            event.stopPropagation();
            selectNearestBone(event.point);
          }}
        />
      </group>
      {skeletonHelper && <primitive object={skeletonHelper} />}
      {showPoseDebug &&
        boneNodes.map((entry) => (
          <BoneDragHandle
            key={entry.bone}
            {...entry}
            selected={entry.bone === selectedBone}
            boneByNode={boneByNode}
            onSelect={onSelectBone}
            onDragStateChange={(dragging) => {
              ikDraggingRef.current = dragging;
            }}
            onRootDrag={dragRootBone}
            onBoneRotationChange={onBoneRotationChange}
          />
        ))}
      {showPoseDebug && enableCharacterMove && characterRoot && (
        <TransformControls
          object={characterRoot}
          mode="translate"
          space="world"
          size={0.5}
          translationSnap={0.01}
          onObjectChange={syncCharacterPosition}
        />
      )}
      {showPoseDebug && !enableCharacterMove && selectedBoneNode && (
        <TransformControls
          object={selectedBoneNode}
          mode="rotate"
          space="local"
          size={0.45}
          rotationSnap={THREE.MathUtils.degToRad(0.5)}
          onObjectChange={syncSelectedBoneRotation}
        />
      )}
    </>
  );
}

type ProceduralSurface = "wood" | "plaster";

function createProceduralSurfaceTexture(
  surface: ProceduralSurface,
  repeat: [number, number]
) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const noise = ((x * 17 + y * 43 + x * y * 3) % 29) / 29 - 0.5;
      const grain = Math.sin(y * 0.38 + Math.sin(x * 0.06) * 2.8) * 0.5 + 0.5;
      const value = surface === "wood"
        ? 128 + grain * 62 + noise * 28
        : 210 + noise * 22 + Math.sin(x * 0.15 + y * 0.08) * 4;

      data[offset] = THREE.MathUtils.clamp(value, 0, 255);
      data[offset + 1] = THREE.MathUtils.clamp(value * (surface === "wood" ? 0.82 : 0.98), 0, 255);
      data[offset + 2] = THREE.MathUtils.clamp(value * (surface === "wood" ? 0.64 : 0.94), 0, 255);
      data[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function useProceduralSurfaceTexture(
  surface: ProceduralSurface,
  repeat: [number, number]
) {
  const texture = useMemo(
    () => createProceduralSurfaceTexture(surface, repeat),
    [repeat[0], repeat[1], surface]
  );

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function CozyStudyScene() {
  const wallTexture = useProceduralSurfaceTexture("plaster", [3, 2]);
  const woodTexture = useProceduralSurfaceTexture("wood", [5, 2]);
  const floorTexture = useProceduralSurfaceTexture("wood", [7, 5]);

  return (
    <group position={[0, 0, -1.15]}>
      <mesh position={[0, 1.15, -0.45]} receiveShadow>
        <boxGeometry args={[7.5, 4.8, 0.12]} />
        <meshStandardMaterial map={wallTexture} color="#d9cabb" roughness={0.92} />
      </mesh>

      <mesh position={[-3.35, 1.05, 1.35]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[3.7, 4.7, 0.12]} />
        <meshStandardMaterial map={wallTexture} color="#c8b5a4" roughness={0.95} />
      </mesh>

      <mesh position={[0, -1.55, 1.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7.6, 5.8]} />
        <meshStandardMaterial map={floorTexture} color="#8a674d" roughness={0.72} />
      </mesh>

      <mesh position={[0, -0.92, 0.72]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.9, 2.7]} />
        <meshStandardMaterial color="#6f7d73" roughness={0.96} />
      </mesh>
      <mesh position={[0, -0.914, 0.72]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.74, 0.78, 64]} />
        <meshStandardMaterial color="#d6c3a1" roughness={0.9} />
      </mesh>

      {[-2.95, -1.48, 0, 1.48, 2.95].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.18, -0.375]}>
            <boxGeometry args={[0.035, 4.65, 0.035]} />
            <meshStandardMaterial color="#b49f8c" roughness={0.82} />
          </mesh>
          <mesh position={[x, -0.58, -0.35]}>
            <boxGeometry args={[1.38, 0.035, 0.04]} />
            <meshStandardMaterial color="#b49f8c" roughness={0.82} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -1.15, -0.32]}>
        <boxGeometry args={[7.4, 0.24, 0.11]} />
        <meshStandardMaterial color="#a78f7b" roughness={0.78} />
      </mesh>

      <group position={[1.75, 1.2, -0.34]}>
        <RoundedBox args={[2.2, 1.8, 0.1]} radius={0.04}>
          <meshStandardMaterial map={woodTexture} color="#6c4c39" roughness={0.62} />
        </RoundedBox>
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[1.92, 1.52]} />
          <meshStandardMaterial color="#93bdd0" emissive="#6fa9c5" emissiveIntensity={0.38} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.13]}>
          <boxGeometry args={[0.055, 1.55, 0.035]} />
          <meshStandardMaterial color="#f1e4d5" />
        </mesh>
        <mesh position={[0, 0, 0.13]}>
          <boxGeometry args={[1.95, 0.055, 0.035]} />
          <meshStandardMaterial color="#f1e4d5" />
        </mesh>
        <mesh position={[-1.17, 0, 0.13]}>
          <boxGeometry args={[0.34, 2.1, 0.08]} />
          <meshStandardMaterial color="#a88472" roughness={0.9} />
        </mesh>
        <mesh position={[1.17, 0, 0.13]}>
          <boxGeometry args={[0.34, 2.1, 0.08]} />
          <meshStandardMaterial color="#a88472" roughness={0.9} />
        </mesh>
        <mesh position={[-0.78, 0, 0.17]}>
          <boxGeometry args={[0.04, 1.52, 0.035]} />
          <meshStandardMaterial color="#f1e4d5" />
        </mesh>
        <mesh position={[0.78, 0, 0.17]}>
          <boxGeometry args={[0.04, 1.52, 0.035]} />
          <meshStandardMaterial color="#f1e4d5" />
        </mesh>
        <mesh position={[0, -0.52, 0.17]}>
          <boxGeometry args={[1.92, 0.035, 0.035]} />
          <meshStandardMaterial color="#f1e4d5" />
        </mesh>
      </group>

      <group position={[-2.25, 0.28, -0.2]}>
        <RoundedBox args={[1.15, 2.75, 0.42]} radius={0.05} castShadow receiveShadow>
          <meshStandardMaterial map={woodTexture} color="#584338" roughness={0.72} />
        </RoundedBox>
        {[-0.82, -0.26, 0.3, 0.86].map((y) => (
          <mesh key={y} position={[0, y, 0.25]} castShadow>
            <boxGeometry args={[1.02, 0.075, 0.44]} />
            <meshStandardMaterial color="#866b59" roughness={0.8} />
          </mesh>
        ))}
        {[
          [-0.37, 0.62, "#b86f52"],
          [-0.08, 0.64, "#506f76"],
          [0.22, 0.6, "#d1b17c"],
          [-0.32, 0.06, "#707b5d"],
          [0.02, 0.08, "#a8655f"],
          [0.31, 0.04, "#d7c7ae"],
        ].map(([x, y, color], index) => (
          <mesh key={index} position={[Number(x), Number(y), 0.51]} castShadow>
            <boxGeometry args={[0.2, 0.42, 0.12]} />
            <meshStandardMaterial color={String(color)} roughness={0.8} />
          </mesh>
        ))}
        {[-0.42, -0.14, 0.14, 0.42].map((x, index) => (
          <mesh key={`lower-book-${x}`} position={[x, -0.53, 0.5]} rotation={[0, 0, (index - 1.5) * 0.025]} castShadow>
            <boxGeometry args={[0.18, 0.45 + (index % 2) * 0.08, 0.13]} />
            <meshStandardMaterial color={["#8f5549", "#425d66", "#b48d56", "#66734f"][index]} roughness={0.72} />
          </mesh>
        ))}
      </group>

      <group position={[0, -0.48, 0.72]}>
        <RoundedBox args={[1.28, 1.7, 0.2]} radius={0.12} castShadow receiveShadow>
          <meshStandardMaterial color="#61483a" roughness={0.86} />
        </RoundedBox>
        <RoundedBox position={[0, -0.94, 0]} args={[1.1, 0.16, 1.05]} radius={0.07} castShadow>
          <meshStandardMaterial color="#4b382f" roughness={0.9} />
        </RoundedBox>
      </group>

      <group position={[2.55, -0.72, 0.25]}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.34, 0.42, 0.07, 40]} />
          <meshStandardMaterial color="#5b4234" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 1, 20]} />
          <meshStandardMaterial color="#b18a65" metalness={0.35} roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.05, 0]} castShadow>
          <coneGeometry args={[0.43, 0.58, 40, 1, true]} />
          <meshStandardMaterial color="#c6a983" emissive="#b8793e" emissiveIntensity={0.12} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 0.95, 0.1]} color="#ffd39a" intensity={0.75} distance={3.5} decay={2} />
      </group>

      <group position={[0, -0.28, 1.28]}>
        <RoundedBox args={[5.15, 0.16, 1.18]} radius={0.065} castShadow receiveShadow>
          <meshPhysicalMaterial map={woodTexture} color="#765139" roughness={0.58} clearcoat={0.12} clearcoatRoughness={0.7} />
        </RoundedBox>
        <RoundedBox position={[0, -0.3, 0.43]} args={[5.05, 0.46, 0.12]} radius={0.035} castShadow>
          <meshStandardMaterial color="#493226" roughness={0.86} />
        </RoundedBox>
        <mesh position={[-1.82, -0.72, 0.22]} castShadow>
          <boxGeometry args={[0.18, 1.28, 0.18]} />
          <meshStandardMaterial color="#443027" roughness={0.9} />
        </mesh>
        <mesh position={[1.82, -0.72, 0.22]} castShadow>
          <boxGeometry args={[0.18, 1.28, 0.18]} />
          <meshStandardMaterial color="#443027" roughness={0.9} />
        </mesh>
        <RoundedBox position={[-1.35, 0.14, -0.08]} args={[0.78, 0.045, 0.48]} radius={0.025} castShadow>
          <meshStandardMaterial color="#26343a" roughness={0.48} />
        </RoundedBox>
        <mesh position={[1.38, 0.2, -0.04]} castShadow>
          <cylinderGeometry args={[0.18, 0.155, 0.3, 32]} />
          <meshStandardMaterial color="#8c6b57" roughness={0.78} />
        </mesh>
        <mesh position={[1.38, 0.34, -0.04]} castShadow>
          <torusGeometry args={[0.12, 0.025, 12, 28, Math.PI * 1.5]} />
          <meshStandardMaterial color="#8c6b57" roughness={0.78} />
        </mesh>
        <mesh position={[0.25, 0.125, -0.28]} rotation={[-Math.PI / 2, 0, -0.08]} receiveShadow>
          <planeGeometry args={[1.1, 0.5]} />
          <meshStandardMaterial color="#d2c3aa" roughness={0.95} />
        </mesh>
        <group position={[-0.58, 0.17, -0.05]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.035, 0.28]} />
            <meshStandardMaterial color="#9d7256" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.035, 0]} castShadow>
            <boxGeometry args={[0.38, 0.03, 0.25]} />
            <meshStandardMaterial color="#526676" roughness={0.75} />
          </mesh>
        </group>
      </group>

      <mesh position={[-0.65, 1.05, -0.36]}>
        <circleGeometry args={[0.38, 48]} />
        <meshStandardMaterial color="#c9ae86" roughness={0.65} />
      </mesh>
      <mesh position={[-0.65, 1.05, -0.29]}>
        <circleGeometry args={[0.29, 48]} />
        <meshStandardMaterial color="#6e8791" roughness={0.28} metalness={0.15} />
      </mesh>

      <group position={[2.9, -0.83, -0.05]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.28, 0.34, 0.45, 32]} />
          <meshStandardMaterial color="#6e5141" roughness={0.78} />
        </mesh>
        {[-0.24, -0.08, 0.1, 0.25].map((rotation, index) => (
          <mesh key={rotation} position={[Math.sin(rotation * 4) * 0.16, 0.46 + index * 0.11, 0]} rotation={[0, 0, rotation]}>
            <sphereGeometry args={[0.24, 24, 16]} />
            <meshStandardMaterial color={index % 2 ? "#47705b" : "#527c62"} roughness={0.88} />
          </mesh>
        ))}
      </group>

      <group position={[-0.55, 1.88, -0.28]}>
        <mesh>
          <boxGeometry args={[1.15, 0.72, 0.06]} />
          <meshStandardMaterial color="#594638" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[1.02, 0.59]} />
          <meshStandardMaterial color="#74837c" emissive="#384842" emissiveIntensity={0.08} roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

function NightLoftScene() {
  const cityLights = useMemo(
    () => Array.from({ length: 42 }, (_, index) => ({
      x: -3.6 + (index % 7) * 1.18,
      y: -0.5 + Math.floor(index / 7) * 0.55,
      color: index % 4 === 0 ? "#fbbf24" : index % 3 === 0 ? "#60a5fa" : "#c4b5fd",
    })),
    []
  );

  return (
    <group position={[0, 0, -1.1]}>
      <mesh position={[0, -1.55, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 7]} />
        <MeshReflectorMaterial
          color="#151827"
          roughness={0.48}
          metalness={0.2}
          resolution={512}
          blur={[280, 90]}
          mixBlur={0.75}
          mixStrength={0.16}
          depthScale={0.18}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.4}
        />
      </mesh>
      <mesh position={[0, 1.1, -0.8]} receiveShadow>
        <boxGeometry args={[8.8, 5.2, 0.1]} />
        <meshStandardMaterial color="#111827" roughness={0.78} />
      </mesh>

      <group position={[0, 1.05, -0.7]}>
        <mesh>
          <planeGeometry args={[6.8, 3.65]} />
          <meshStandardMaterial color="#070b18" emissive="#111b45" emissiveIntensity={0.55} />
        </mesh>
        {cityLights.map((light, index) => (
          <mesh key={index} position={[light.x, light.y, 0.035]}>
            <planeGeometry args={[0.42, 0.18]} />
            <meshBasicMaterial color={light.color} transparent opacity={0.35 + (index % 3) * 0.14} />
          </mesh>
        ))}
        {[-2.25, 0, 2.25].map((x) => (
          <mesh key={x} position={[x, 0, 0.08]}>
            <boxGeometry args={[0.075, 3.72, 0.08]} />
            <meshStandardMaterial color="#293247" metalness={0.65} roughness={0.28} />
          </mesh>
        ))}
      </group>

      <RoundedBox position={[0, -0.35, 0.95]} args={[5.5, 0.18, 1.35]} radius={0.07} castShadow receiveShadow>
        <meshStandardMaterial color="#24283a" roughness={0.42} metalness={0.18} />
      </RoundedBox>
      <RoundedBox position={[0, -0.68, 1.38]} args={[5.25, 0.5, 0.12]} radius={0.04} castShadow>
        <meshStandardMaterial color="#111522" roughness={0.7} />
      </RoundedBox>

      <group position={[-2.55, -0.55, 0.05]}>
        <RoundedBox args={[1.45, 0.95, 0.75]} radius={0.16} castShadow>
          <meshStandardMaterial color="#312e4d" roughness={0.7} />
        </RoundedBox>
        <RoundedBox position={[0, 0.48, -0.12]} args={[1.45, 0.75, 0.28]} radius={0.14} castShadow>
          <meshStandardMaterial color="#3d385f" roughness={0.72} />
        </RoundedBox>
      </group>

      <group position={[2.65, -0.85, 0.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.3, 0.38, 0.42, 32]} />
          <meshStandardMaterial color="#20293a" roughness={0.58} metalness={0.22} />
        </mesh>
        {[0, 1, 2, 3, 4].map((index) => (
          <mesh key={index} position={[Math.sin(index * 2.1) * 0.22, 0.38 + index * 0.08, Math.cos(index * 1.7) * 0.1]} rotation={[0, 0, index * 0.7]}>
            <sphereGeometry args={[0.18, 18, 12]} />
            <meshStandardMaterial color={index % 2 ? "#245c55" : "#2f7668"} roughness={0.82} />
          </mesh>
        ))}
      </group>
      <pointLight position={[-2.5, 0.2, 1.3]} color="#8b5cf6" intensity={1.1} distance={4} />
      <pointLight position={[2.7, 0.5, 0.8]} color="#38bdf8" intensity={0.9} distance={4} />
    </group>
  );
}

function SoftStudioScene() {
  return (
    <group position={[0, 0, -1.05]}>
      <mesh position={[0, 0.5, -0.8]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#dedbd5" roughness={0.88} />
      </mesh>
      <mesh position={[0, -1.52, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 7]} />
        <MeshReflectorMaterial
          color="#cbc7bf"
          roughness={0.72}
          resolution={512}
          blur={[220, 80]}
          mixBlur={0.55}
          mixStrength={0.1}
          depthScale={0.12}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.5}
        />
      </mesh>
      <mesh position={[0, -1.1, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[4.7, 4.7, 1.4, 64, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color="#d7d3cc" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <RoundedBox position={[0, -0.4, 1.05]} args={[4.7, 0.14, 1.18]} radius={0.06} castShadow receiveShadow>
        <meshStandardMaterial color="#b79f84" roughness={0.64} />
      </RoundedBox>
      <mesh position={[-2.85, 0.45, 0.45]} rotation={[0, 0.3, -0.08]}>
        <boxGeometry args={[1.2, 2.2, 0.08]} />
        <meshStandardMaterial color="#fff8e9" emissive="#fff1cf" emissiveIntensity={0.65} />
      </mesh>
      <mesh position={[2.85, 0.65, 0.3]} rotation={[0, -0.35, 0.08]}>
        <boxGeometry args={[1.15, 2.1, 0.08]} />
        <meshStandardMaterial color="#e6f3ff" emissive="#d7efff" emissiveIntensity={0.58} />
      </mesh>
      <RoundedBox position={[2.25, -1.15, -0.05]} args={[0.95, 0.7, 0.95]} radius={0.08} castShadow>
        <meshStandardMaterial color="#a98b72" roughness={0.78} />
      </RoundedBox>
      <RoundedBox position={[-2.2, -1.3, 0.1]} args={[0.75, 0.4, 0.75]} radius={0.18} castShadow>
        <meshStandardMaterial color="#6c756c" roughness={0.86} />
      </RoundedBox>
    </group>
  );
}

function SceneEnvironment({ presetId }: { presetId: ScenePresetId }) {
  if (presetId === "night-loft") return <NightLoftScene />;
  if (presetId === "soft-studio") return <SoftStudioScene />;
  return <CozyStudyScene />;
}

export default function AvatarFace({
  state,
  expression,
  mouthOpen,
  speaking,
  scenePresetId,
  modelUrl,
}: AvatarFaceProps) {
  const [showPoseDebug, setShowPoseDebug] = useState(false);
  const [showReferenceLibrary, setShowReferenceLibrary] = useState(false);
  const [enableCharacterMove, setEnableCharacterMove] = useState(false);
  const [characterPosition, setCharacterPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [deskPose, setDeskPose] = useState<DeskPose>(() =>
    applyReferencePreset(DEFAULT_DESK_POSE, DEFAULT_REFERENCE_PRESET)
  );
  const [basePose, setBasePose] = useState<DeskPose>(() => cloneDeskPose(DEFAULT_DESK_POSE));
  const [customPresets, setCustomPresets] = useState<ReferencePreset[]>([]);
  const [customPresetsLoaded, setCustomPresetsLoaded] = useState(false);
  const [availableBones, setAvailableBones] = useState<Set<PoseDebugBoneName>>(() => new Set());
  const [selectedBone, setSelectedBone] = useState<PoseDebugBoneName | null>(VRMHumanBoneName.Hips);
  const [activePresetId, setActivePresetId] = useState(DEFAULT_REFERENCE_PRESET.id);
  const [previewExpression, setPreviewExpression] = useState<AvatarExpression | null>(null);
  const canShowPoseDebug = process.env.NODE_ENV !== "production";
  const referencePresets = useMemo(
    () => [...REFERENCE_PRESETS, ...customPresets],
    [customPresets]
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          setCustomPresets(
            parsed.filter(
              (preset): preset is ReferencePreset =>
                typeof preset === "object" &&
                preset !== null &&
                "id" in preset &&
                "pose" in preset &&
                "source" in preset &&
                preset.source === "Custom"
            )
          );
        }
      }
    } catch {
      // Ignore malformed local presets and leave the built-in library usable.
    } finally {
      setCustomPresetsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!customPresetsLoaded) return;
    window.localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
  }, [customPresets, customPresetsLoaded]);

  const updateAvailableBones = useCallback((bones: PoseDebugBoneName[]) => {
    setAvailableBones(new Set(bones));
  }, []);

  const updatePose = useCallback((
    bone: PoseDebugBoneName,
    axis: keyof PoseEulerDegrees,
    value: number
  ) => {
    setDeskPose((current) => ({
      ...current,
      [bone]: {
        ...current[bone],
        [axis]: value,
      },
    }));
  }, []);

  const selectReferencePreset = useCallback((preset: ReferencePreset) => {
    setDeskPose(applyReferencePreset(basePose, preset));
    setActivePresetId(preset.id);
    setPreviewExpression(preset.expression);
  }, [basePose]);

  const updateBoneRotation = useCallback((
    bone: PoseDebugBoneName,
    rotation: PoseEulerDegrees
  ) => {
    setDeskPose((current) => ({
      ...current,
      [bone]: rotation,
    }));
  }, []);

  const setCurrentAsBasePose = useCallback(() => {
    setBasePose(cloneDeskPose(deskPose));
    setActivePresetId(REFERENCE_PRESETS[0].id);
  }, [deskPose]);

  const saveCurrentPose = useCallback((name: string) => {
    const preset: ReferencePreset = {
      id: `custom-${Date.now()}`,
      nameZh: name,
      nameEn: name,
      descriptionZh: "本地保存的自定义姿势。",
      source: "Custom",
      expression: previewExpression ?? expression,
      pose: cloneDeskPose(deskPose),
    };
    setCustomPresets((current) => [...current, preset]);
    setActivePresetId(preset.id);
  }, [deskPose, expression, previewExpression]);

  const deleteCustomPose = useCallback((id: string) => {
    setCustomPresets((current) => current.filter((preset) => preset.id !== id));
    setActivePresetId((current) => current === id ? REFERENCE_PRESETS[0].id : current);
  }, []);

  const moveCharacterBy = useCallback((delta: THREE.Vector3) => {
    setCharacterPosition((current) => [
      current[0] + delta.x,
      current[1] + delta.y,
      current[2] + delta.z,
    ]);
  }, []);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          scenePresetId === "night-loft"
            ? "#070b18"
            : scenePresetId === "soft-studio"
              ? "#d8d4ce"
              : "#76685c",
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.05)_48%,transparent_100%)]" />
      <div className="absolute left-4 top-4 z-30 flex gap-2">
        {canShowPoseDebug && (
          <button
            type="button"
            onClick={() => setShowPoseDebug((value) => !value)}
            className="rounded-xl border border-cyan-300/25 bg-slate-950/85 px-3 py-2 text-xs font-medium text-cyan-100 shadow-lg backdrop-blur hover:bg-slate-900"
          >
            姿势调试 / Pose Debug: {showPoseDebug ? "ON" : "OFF"}
          </button>
        )}
        {canShowPoseDebug && showPoseDebug && (
          <>
            <button
              type="button"
              onClick={() => setEnableCharacterMove((value) => !value)}
              className="rounded-xl border border-emerald-300/25 bg-slate-950/85 px-3 py-2 text-xs font-medium text-emerald-100 shadow-lg backdrop-blur hover:bg-slate-900"
            >
              人物移动 / Move: {enableCharacterMove ? "ON" : "OFF"}
            </button>
            {enableCharacterMove && (
              <button
                type="button"
                onClick={() => setCharacterPosition([0, 0, 0])}
                className="rounded-xl border border-white/15 bg-slate-950/85 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur hover:bg-slate-900"
              >
                复位人物
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setShowReferenceLibrary((value) => {
              if (value) setPreviewExpression(null);
              return !value;
            });
          }}
          className="rounded-xl border border-amber-300/25 bg-slate-950/85 px-3 py-2 text-xs font-medium text-amber-100 shadow-lg backdrop-blur hover:bg-slate-900"
        >
          参考动作 / Motion Library: {showReferenceLibrary ? "ON" : "OFF"}
        </button>
      </div>
      {canShowPoseDebug && showPoseDebug && (
        <PoseDebugPanel
          pose={deskPose}
          availableBones={availableBones}
          selectedBone={selectedBone}
          onSelectBone={setSelectedBone}
          onSetBasePose={setCurrentAsBasePose}
          onChange={updatePose}
        />
      )}
      {showReferenceLibrary && (
        <ReferenceLibraryPanel
          activePresetId={activePresetId}
          presets={referencePresets}
          onSelect={selectReferencePreset}
          onSave={saveCurrentPose}
          onDelete={deleteCustomPose}
        />
      )}
      <Canvas
        shadows
        dpr={[1.25, 2]}
        camera={{ position: [0, 0.66, 3.45], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = scenePresetId === "night-loft" ? 0.82 : 0.78;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <color
          attach="background"
          args={[scenePresetId === "night-loft" ? "#070b18" : scenePresetId === "soft-studio" ? "#d8d4ce" : "#76685c"]}
        />
        <fog
          attach="fog"
          args={[scenePresetId === "night-loft" ? "#070b18" : scenePresetId === "soft-studio" ? "#d8d4ce" : "#76685c", 7, 15]}
        />
        <hemisphereLight
          args={[
            scenePresetId === "night-loft" ? "#8ca8ff" : "#f1f5f9",
            scenePresetId === "night-loft" ? "#101326" : "#59483d",
            scenePresetId === "soft-studio" ? 0.9 : 0.5,
          ]}
        />
        <directionalLight
          position={[3.5, 4.5, 4]}
          intensity={scenePresetId === "soft-studio" ? 1.35 : 1.05}
          castShadow
          color={scenePresetId === "night-loft" ? "#b9c8ff" : "#ffe4c4"}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-3, 2.5, 3]} intensity={0.38} color={scenePresetId === "night-loft" ? "#8b5cf6" : "#9ec4d2"} />
        <spotLight position={[0, 4.2, 3]} angle={0.5} penumbra={0.9} intensity={0.55} color={scenePresetId === "night-loft" ? "#93c5fd" : "#ffd4a3"} />
        <Environment preset={scenePresetId === "night-loft" ? "city" : "apartment"} environmentIntensity={scenePresetId === "soft-studio" ? 0.42 : 0.2} />
        <OrbitControls
          makeDefault
          target={[0, 0.46, 0]}
          enableDamping
          dampingFactor={0.08}
          minDistance={1.8}
          maxDistance={7}
          minPolarAngle={0.45}
          maxPolarAngle={Math.PI - 0.45}
        />
        <SceneEnvironment presetId={scenePresetId} />
        <ContactShadows
          key={`${scenePresetId}-${modelUrl}`}
          position={[0, -1.48, 0.25]}
          scale={8}
          opacity={scenePresetId === "night-loft" ? 0.48 : 0.34}
          blur={2.4}
          far={4.5}
          resolution={1024}
          color={scenePresetId === "night-loft" ? "#050712" : "#3c2c24"}
          frames={120}
        />
        <VRMCharacter
          state={state}
          expression={previewExpression ?? expression}
          mouthOpen={mouthOpen}
          speaking={speaking}
          deskPose={deskPose}
          showPoseDebug={showPoseDebug}
          previewReference={showReferenceLibrary}
          selectedBone={selectedBone}
          characterPosition={characterPosition}
          enableCharacterMove={enableCharacterMove}
          onSelectBone={setSelectedBone}
          onCharacterPositionChange={setCharacterPosition}
          onCharacterPositionDelta={moveCharacterBy}
          onBoneRotationChange={updateBoneRotation}
          onAvailableBonesChange={updateAvailableBones}
          scenePresetId={scenePresetId}
          modelUrl={modelUrl}
        />
      </Canvas>
    </div>
  );
}
