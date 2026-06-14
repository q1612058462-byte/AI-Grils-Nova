"use client";

import {
  BONE_LABELS_ZH,
  POSE_DEBUG_BONES,
  type DeskPose,
  type PoseDebugBoneName,
  type PoseEulerDegrees,
} from "@/lib/avatar/deskPose";

type PoseDebugPanelProps = {
  pose: DeskPose;
  availableBones: ReadonlySet<PoseDebugBoneName>;
  selectedBone: PoseDebugBoneName | null;
  onSelectBone: (bone: PoseDebugBoneName) => void;
  onSetBasePose: () => void;
  onChange: (bone: PoseDebugBoneName, axis: keyof PoseEulerDegrees, value: number) => void;
};

const AXES = ["x", "y", "z"] as const;

export default function PoseDebugPanel({
  pose,
  availableBones,
  selectedBone,
  onSelectBone,
  onSetBasePose,
  onChange,
}: PoseDebugPanelProps) {
  const copyPose = async () => {
    await navigator.clipboard.writeText(JSON.stringify(pose, null, 2));
  };

  return (
    <aside className="absolute bottom-4 right-4 top-4 z-20 w-[360px] overflow-y-auto rounded-2xl border border-cyan-300/20 bg-slate-950/90 p-4 text-xs text-slate-200 shadow-2xl backdrop-blur">
      <div className="sticky top-0 z-10 mb-4 bg-slate-950/95 pb-3">
        <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-cyan-100">VRM 姿势调试器 / Pose Debugger</div>
          <div className="mt-1 text-[10px] text-slate-500">角度单位 / Unit: degree</div>
        </div>
        <button
          type="button"
          onClick={copyPose}
          className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-cyan-100 hover:bg-cyan-400/20"
        >
          复制姿势 / Copy JSON
        </button>
        </div>
        <button
          type="button"
          onClick={onSetBasePose}
          className="mt-3 w-full rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-emerald-100 hover:bg-emerald-400/20"
        >
          设当前为参考基准 / Set Current as Base
        </button>
        <div className="mt-2 text-[10px] leading-4 text-slate-500">
          点击角色或青色控制点选择骨骼。拖动控制点会通过 IK 自动联动父骨骼，
          黄色控制点表示当前选择；旋转环用于局部精调。
          <br />
          Click the avatar, drag a point for IK, or use the rotation gizmo.
        </div>
      </div>

      <div className="space-y-4">
        {POSE_DEBUG_BONES.map((bone) => {
          const available = availableBones.has(bone);

          return (
          <section
            key={bone}
            onClick={() => available && onSelectBone(bone)}
            className={`rounded-xl border p-3 ${
              selectedBone === bone
                ? "border-cyan-300/60 bg-cyan-300/10"
                : available
                ? "border-white/10 bg-white/[0.035]"
                : "border-white/5 bg-white/[0.015] opacity-45"
            } ${available ? "cursor-pointer" : ""}`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-medium text-cyan-100">{BONE_LABELS_ZH[bone]}</div>
                <div className="font-mono text-[10px] text-slate-500">{bone}</div>
              </div>
              {!available && <span className="text-[10px] text-amber-300">模型无此骨骼 / N/A</span>}
            </div>
            <div className="space-y-2">
              {AXES.map((axis) => (
                <label key={axis} className="grid grid-cols-[14px_1fr_58px] items-center gap-2">
                  <span className="font-mono uppercase text-slate-500">{axis}</span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={0.5}
                    value={pose[bone][axis]}
                    disabled={!available}
                    onChange={(event) => onChange(bone, axis, Number(event.target.value))}
                    className="accent-cyan-400"
                  />
                  <input
                    type="number"
                    min={-180}
                    max={180}
                    step={0.5}
                    value={pose[bone][axis]}
                    disabled={!available}
                    onChange={(event) => onChange(bone, axis, Number(event.target.value))}
                    className="w-full rounded-md border border-white/10 bg-slate-900 px-1.5 py-1 text-right font-mono text-slate-200"
                  />
                </label>
              ))}
            </div>
          </section>
          );
        })}
      </div>
    </aside>
  );
}
