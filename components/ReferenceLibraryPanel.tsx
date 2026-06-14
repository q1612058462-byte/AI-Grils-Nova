"use client";

import { useState } from "react";
import {
  REFERENCE_SOURCES,
  type ReferencePreset,
} from "@/lib/avatar/referenceLibrary";

type ReferenceLibraryPanelProps = {
  activePresetId: string;
  presets: ReferencePreset[];
  onSelect: (preset: ReferencePreset) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
};

export default function ReferenceLibraryPanel({
  activePresetId,
  presets,
  onSelect,
  onSave,
  onDelete,
}: ReferenceLibraryPanelProps) {
  const [presetName, setPresetName] = useState("");

  return (
    <aside className="absolute bottom-4 left-4 top-16 z-20 w-[300px] overflow-y-auto rounded-2xl border border-amber-200/20 bg-slate-950/90 p-4 text-xs text-slate-200 shadow-2xl backdrop-blur">
      <div className="mb-4">
        <div className="font-semibold text-amber-100">动作与表情参考 / Motion Library</div>
        <div className="mt-1 text-[10px] leading-4 text-slate-500">
          点击预设立即预览。关键骨骼使用归一化后的绝对目标，其余骨骼继承当前参考基准。
          “自然站姿”可恢复基准。
        </div>
      </div>

      <form
        className="mb-4 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const name = presetName.trim();
          if (!name) return;
          onSave(name);
          setPresetName("");
        }}
      >
        <div className="mb-2 text-[10px] font-medium text-emerald-100">
          保存当前动作 / Save Current Pose
        </div>
        <div className="flex gap-2">
          <input
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="动作名称"
            maxLength={32}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 text-[11px] text-slate-100 outline-none focus:border-emerald-300/40"
          />
          <button
            type="submit"
            disabled={!presetName.trim()}
            className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 text-[10px] text-emerald-100 disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {presets.map((preset) => {
          const active = preset.id === activePresetId;

          return (
            <div
              key={preset.id}
              className={`relative rounded-xl border transition ${
                active
                  ? "border-amber-300/50 bg-amber-300/15"
                  : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(preset)}
                className="w-full p-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-100">{preset.nameZh}</div>
                    <div className="text-[10px] text-slate-500">{preset.nameEn}</div>
                  </div>
                  <span className="mr-6 rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-amber-200">
                    {preset.source}
                  </span>
                </div>
                <div className="mt-2 text-[10px] leading-4 text-slate-400">{preset.descriptionZh}</div>
              </button>
              {preset.source === "Custom" && (
                <button
                  type="button"
                  aria-label={`删除 ${preset.nameZh}`}
                  onClick={() => onDelete(preset.id)}
                  className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-sm text-slate-500 hover:bg-red-400/10 hover:text-red-300"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="mb-3 rounded-lg border border-amber-300/15 bg-amber-300/5 px-2.5 py-2 text-[10px] leading-4 text-slate-400">
          Ref. 表示根据对应动作来源手工重定向的静态姿势，不会加载或播放外部 VRMA / Mixamo 动画。
        </div>
        <div className="mb-2 text-[10px] font-medium text-slate-400">在线参考来源 / Sources</div>
        <div className="space-y-1.5">
          {REFERENCE_SOURCES.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-white/10 px-2.5 py-2 text-[10px] text-cyan-200 hover:bg-white/5"
            >
              {source.name}
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
