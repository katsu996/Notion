"use client";

import { useState } from "react";
import type { Page } from "@/lib/types";
import { getBreadcrumbs, useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import {
  CopyIcon,
  DotsIcon,
  MenuIcon,
  StarIcon,
  TrashIcon,
} from "@/components/icons";

interface TopbarProps {
  page: Page | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenPage: (id: string) => void;
}

export function Topbar({
  page,
  sidebarOpen,
  onToggleSidebar,
  onOpenPage,
}: TopbarProps) {
  const { data, toggleFavorite, duplicatePage, deletePage } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const crumbs = page ? getBreadcrumbs(data, page.id) : [];

  return (
    <header className="flex h-12 flex-none items-center gap-1 px-3">
      {!sidebarOpen && (
        <button
          aria-label="サイドバーを開く"
          className="flex h-7 w-7 flex-none items-center justify-center rounded text-muted hover:bg-hover"
          onClick={onToggleSidebar}
        >
          <MenuIcon size={17} />
        </button>
      )}

      {/* パンくずリスト */}
      <nav className="flex min-w-0 flex-1 items-center gap-0.5 text-sm">
        {crumbs.map((c, i) => (
          <span key={c.id} className="flex min-w-0 items-center gap-0.5">
            {i > 0 && <span className="flex-none text-faint">/</span>}
            <button
              className={`truncate rounded px-1.5 py-0.5 hover:bg-hover ${
                i === crumbs.length - 1 ? "text-ink" : "text-muted"
              } ${i < crumbs.length - 1 ? "max-sm:hidden" : ""}`}
              onClick={() => onOpenPage(c.id)}
            >
              {c.icon ? `${c.icon} ` : ""}
              {c.title || "無題"}
            </button>
          </span>
        ))}
      </nav>

      {page && (
        <div className="relative flex flex-none items-center gap-0.5">
          <span className="px-2 text-xs text-faint max-sm:hidden">
            編集: {formatDate(page.updatedAt)}
          </span>
          <button
            aria-label="お気に入り"
            className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-hover"
            onClick={() => toggleFavorite(page.id)}
          >
            <StarIcon size={16} filled={page.favorite} />
          </button>
          <button
            aria-label="その他"
            className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-hover"
            onClick={() => setMenuOpen(true)}
          >
            <DotsIcon size={16} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onMouseDown={() => setMenuOpen(false)}
              />
              <div
                className="pop-in absolute right-0 top-9 z-50 w-[220px] rounded-lg bg-bg p-1.5"
                style={{ boxShadow: "var(--shadow)" }}
              >
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-hover"
                  onClick={() => {
                    const id = duplicatePage(page.id);
                    if (id) onOpenPage(id);
                    setMenuOpen(false);
                  }}
                >
                  <CopyIcon size={14} className="text-muted" />
                  複製
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-danger hover:bg-hover"
                  onClick={() => {
                    deletePage(page.id);
                    setMenuOpen(false);
                  }}
                >
                  <TrashIcon size={14} />
                  ゴミ箱に移動
                </button>
                <div className="mx-1 my-1 border-t border-divider" />
                <div className="px-2 py-1 text-xs text-faint">
                  作成: {formatDate(page.createdAt)}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
