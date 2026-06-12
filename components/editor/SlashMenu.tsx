"use client";

import { useEffect, useRef } from "react";
import { filterBlockDefs, type BlockDef } from "@/lib/blockDefs";

interface Props {
  x: number;
  y: number;
  query: string;
  activeIndex: number;
  onSelect: (def: BlockDef) => void;
  onHover: (index: number) => void;
}

export function SlashMenu({ x, y, query, activeIndex, onSelect, onHover }: Props) {
  const defs = filterBlockDefs(query);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (defs.length === 0) return null;

  const width = 320;
  const left = Math.max(8, Math.min(x, window.innerWidth - width - 8));
  const maxH = Math.min(340, window.innerHeight - y - 16);
  const flip = maxH < 160;

  return (
    <div
      ref={listRef}
      className="pop-in fixed z-50 overflow-y-auto rounded-lg bg-bg py-2"
      style={{
        left,
        width,
        ...(flip
          ? { bottom: window.innerHeight - y + 28, maxHeight: 340 }
          : { top: y, maxHeight: maxH }),
        boxShadow: "var(--shadow)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-3.5 pb-1.5 pt-0.5 text-xs font-medium text-muted">
        ベーシック
      </div>
      {defs.map((def, i) => (
        <button
          key={def.type}
          data-active={i === activeIndex}
          className={`flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left ${
            i === activeIndex ? "bg-hover" : ""
          }`}
          onMouseEnter={() => onHover(i)}
          onClick={() => onSelect(def)}
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded border border-divider bg-bg text-sm text-ink">
            {def.icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-ink">{def.label}</span>
            <span className="block truncate text-xs text-muted">
              {def.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
