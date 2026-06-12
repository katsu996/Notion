"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  PageIcon,
  RestoreIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons";

export function TrashPopover({
  onClose,
  onOpenPage,
}: {
  onClose: () => void;
  onOpenPage: (id: string) => void;
}) {
  const { data, restorePage, destroyPage, emptyTrash } = useStore();
  const [query, setQuery] = useState("");

  const deleted = Object.values(data.pages)
    .filter((p) => p.deletedAt)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
    .filter(
      (p) =>
        !query ||
        (p.title || "無題").toLowerCase().includes(query.toLowerCase())
    );

  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className="pop-in fixed bottom-16 left-3 z-50 flex max-h-[60vh] w-[340px] max-w-[calc(100vw-24px)] flex-col rounded-lg bg-bg"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <div className="flex items-center gap-2 border-b border-divider p-2.5">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ゴミ箱内を検索"
            className="min-w-0 flex-1 rounded border border-divider bg-transparent px-2.5 py-1 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
          />
          <button
            aria-label="閉じる"
            className="flex h-6 w-6 flex-none items-center justify-center rounded text-muted hover:bg-hover"
            onClick={onClose}
          >
            <XIcon size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5">
          {deleted.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-sm text-faint">
              <TrashIcon size={22} />
              ゴミ箱は空です
            </div>
          ) : (
            deleted.map((p) => (
              <div
                key={p.id}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-hover"
              >
                <span className="flex w-5 flex-none justify-center text-base">
                  {p.icon || <PageIcon size={15} className="text-muted" />}
                </span>
                <button
                  className="min-w-0 flex-1 truncate text-left text-sm text-ink"
                  onClick={() => {
                    onOpenPage(p.id);
                    onClose();
                  }}
                >
                  {p.title || "無題"}
                </button>
                <button
                  aria-label="復元"
                  title="復元"
                  className="flex h-6 w-6 flex-none items-center justify-center rounded text-muted hover:bg-active"
                  onClick={() => restorePage(p.id)}
                >
                  <RestoreIcon size={13} />
                </button>
                <button
                  aria-label="完全に削除"
                  title="完全に削除"
                  className="flex h-6 w-6 flex-none items-center justify-center rounded text-danger hover:bg-active"
                  onClick={() => destroyPage(p.id)}
                >
                  <TrashIcon size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {deleted.length > 0 && (
          <div className="border-t border-divider p-2">
            <button
              className="w-full rounded-md px-2 py-1.5 text-sm text-danger hover:bg-hover"
              onClick={emptyTrash}
            >
              ゴミ箱を空にする
            </button>
          </div>
        )}
      </div>
    </>
  );
}
