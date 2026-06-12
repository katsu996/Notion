"use client";

import { BLOCK_DEFS } from "@/lib/blockDefs";
import type { Block, BlockType } from "@/lib/types";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  TrashIcon,
} from "@/components/icons";

interface Props {
  block: Block;
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
  onTurnInto: (type: BlockType) => void;
}

const TURNABLE = BLOCK_DEFS.filter(
  (d) => d.type !== "page" && d.type !== "divider"
);

export function BlockMenu({
  block,
  x,
  y,
  onClose,
  onDelete,
  onDuplicate,
  onMove,
  onTurnInto,
}: Props) {
  const width = 240;
  const left = Math.max(8, Math.min(x, window.innerWidth - width - 8));
  const top = Math.min(y, window.innerHeight - 60);
  const canTurn = block.type !== "page" && block.type !== "divider";

  const item =
    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-hover";

  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className="pop-in fixed z-50 max-h-[60vh] overflow-y-auto rounded-lg bg-bg p-1.5"
        style={{ left, top, width, boxShadow: "var(--shadow)" }}
      >
        <button
          className={item}
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          <TrashIcon size={15} className="text-muted" />
          削除
        </button>
        {block.type !== "page" && (
          <button
            className={item}
            onClick={() => {
              onDuplicate();
              onClose();
            }}
          >
            <CopyIcon size={15} className="text-muted" />
            複製
          </button>
        )}
        <button
          className={item}
          onClick={() => {
            onMove(-1);
            onClose();
          }}
        >
          <ArrowUpIcon size={15} className="text-muted" />
          上へ移動
        </button>
        <button
          className={item}
          onClick={() => {
            onMove(1);
            onClose();
          }}
        >
          <ArrowDownIcon size={15} className="text-muted" />
          下へ移動
        </button>
        {canTurn && (
          <>
            <div className="mx-2 my-1.5 border-t border-divider" />
            <div className="px-2 pb-1 text-xs font-medium text-muted">
              タイプを変更
            </div>
            {TURNABLE.map((d) => (
              <button
                key={d.type}
                className={`${item} ${
                  d.type === block.type ? "bg-hover" : ""
                }`}
                onClick={() => {
                  onTurnInto(d.type);
                  onClose();
                }}
              >
                <span className="flex w-5 flex-none items-center justify-center text-xs text-muted">
                  {d.icon}
                </span>
                {d.label}
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}
