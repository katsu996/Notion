"use client";

import { useState } from "react";
import type { Page } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  ChevronRight,
  ChevronsLeft,
  CopyIcon,
  DotsIcon,
  PageIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  TrashIcon,
  MoonIcon,
  SunIcon,
} from "@/components/icons";
import { TrashPopover } from "@/components/TrashPopover";

interface SidebarProps {
  currentPageId: string | null;
  onOpenPage: (id: string) => void;
  onClose: () => void;
  onOpenSearch: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

/* ---------------- ページツリーの 1 行 ---------------- */

function TreeItem({
  page,
  depth,
  currentPageId,
  onOpenPage,
}: {
  page: Page;
  depth: number;
  currentPageId: string | null;
  onOpenPage: (id: string) => void;
}) {
  const store = useStore();
  const { data, createPage, deletePage, duplicatePage, toggleFavorite } =
    store;
  const [expanded, setExpanded] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const children = page.childIds
    .map((id) => data.pages[id])
    .filter((p): p is Page => !!p && !p.deletedAt);

  const active = currentPageId === page.id;

  return (
    <div>
      <div
        className={`group flex h-[30px] cursor-pointer items-center gap-1 rounded-md pr-1 text-sm transition-colors ${
          active
            ? "bg-active font-medium text-ink"
            : "text-muted hover:bg-hover"
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => onOpenPage(page.id)}
      >
        <button
          aria-label="展開"
          className="flex h-5 w-5 flex-none items-center justify-center rounded hover:bg-active"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <ChevronRight
            size={13}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
        <span className="flex w-5 flex-none items-center justify-center text-base leading-none">
          {page.icon || <PageIcon size={15} />}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {page.title || "無題"}
        </span>
        <span className="hidden flex-none items-center gap-0.5 group-hover:flex">
          <button
            aria-label="メニュー"
            className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-active"
            onClick={(e) => {
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              setMenuPos({ x: r.left, y: r.bottom + 4 });
            }}
          >
            <DotsIcon size={13} />
          </button>
          <button
            aria-label="サブページを追加"
            className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-active"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
              const id = createPage(page.id);
              onOpenPage(id);
            }}
          >
            <PlusIcon size={13} />
          </button>
        </span>
      </div>

      {menuPos && (
        <>
          <div
            className="fixed inset-0 z-40"
            onMouseDown={() => setMenuPos(null)}
          />
          <div
            className="pop-in fixed z-50 w-[200px] rounded-lg bg-bg p-1.5"
            style={{
              left: Math.min(menuPos.x, window.innerWidth - 210),
              top: Math.min(menuPos.y, window.innerHeight - 180),
              boxShadow: "var(--shadow)",
            }}
          >
            <button
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-hover"
              onClick={() => {
                toggleFavorite(page.id);
                setMenuPos(null);
              }}
            >
              <StarIcon size={14} className="text-muted" filled={page.favorite} />
              {page.favorite ? "お気に入りから削除" : "お気に入りに追加"}
            </button>
            <button
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-hover"
              onClick={() => {
                const id = duplicatePage(page.id);
                if (id) onOpenPage(id);
                setMenuPos(null);
              }}
            >
              <CopyIcon size={14} className="text-muted" />
              複製
            </button>
            <div className="mx-1 my-1 border-t border-divider" />
            <button
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-danger hover:bg-hover"
              onClick={() => {
                deletePage(page.id);
                setMenuPos(null);
              }}
            >
              <TrashIcon size={14} />
              ゴミ箱に移動
            </button>
          </div>
        </>
      )}

      {expanded &&
        (children.length > 0 ? (
          children.map((child) => (
            <TreeItem
              key={child.id}
              page={child}
              depth={depth + 1}
              currentPageId={currentPageId}
              onOpenPage={onOpenPage}
            />
          ))
        ) : (
          <div
            className="h-[28px] truncate py-1 text-xs text-faint"
            style={{ paddingLeft: 36 + depth * 14 }}
          >
            ページがありません
          </div>
        ))}
    </div>
  );
}

/* ---------------- サイドバー本体 ---------------- */

export function Sidebar({
  currentPageId,
  onOpenPage,
  onClose,
  onOpenSearch,
  isDark,
  onToggleTheme,
}: SidebarProps) {
  const store = useStore();
  const { data, createPage } = store;
  const [trashOpen, setTrashOpen] = useState(false);

  const rootPages = data.rootIds
    .map((id) => data.pages[id])
    .filter((p): p is Page => !!p && !p.deletedAt);

  const favorites = Object.values(data.pages).filter(
    (p) => p.favorite && !p.deletedAt
  );

  const trashCount = Object.values(data.pages).filter(
    (p) => p.deletedAt
  ).length;

  const navItem =
    "flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-sm text-muted transition-colors hover:bg-hover";

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar">
      {/* ヘッダー */}
      <div className="group flex items-center justify-between px-3 pb-1 pt-3">
        <div className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1">
          <span className="flex h-5 w-5 flex-none items-center justify-center rounded bg-ink text-xs font-bold text-bg">
            N
          </span>
          <span className="truncate text-sm font-medium text-ink">
            マイワークスペース
          </span>
        </div>
        <button
          aria-label="サイドバーを閉じる"
          className="flex h-6 w-6 flex-none items-center justify-center rounded text-muted opacity-0 transition-opacity hover:bg-hover group-hover:opacity-100 max-sm:opacity-100"
          onClick={onClose}
        >
          <ChevronsLeft size={16} />
        </button>
      </div>

      {/* 検索・新規 */}
      <div className="px-2 pb-2">
        <button className={navItem} onClick={onOpenSearch}>
          <SearchIcon size={15} />
          検索
          <span className="ml-auto text-xs text-faint">Ctrl+K</span>
        </button>
        <button
          className={navItem}
          onClick={() => onOpenPage(createPage(null))}
        >
          <PlusIcon size={15} />
          新規ページ
        </button>
      </div>

      {/* ページリスト */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {favorites.length > 0 && (
          <>
            <div className="px-2 pb-1 pt-2 text-xs font-medium text-faint">
              お気に入り
            </div>
            {favorites.map((p) => (
              <TreeItem
                key={`fav-${p.id}`}
                page={p}
                depth={0}
                currentPageId={currentPageId}
                onOpenPage={onOpenPage}
              />
            ))}
          </>
        )}

        <div className="px-2 pb-1 pt-2 text-xs font-medium text-faint">
          プライベート
        </div>
        {rootPages.map((p) => (
          <TreeItem
            key={p.id}
            page={p}
            depth={0}
            currentPageId={currentPageId}
            onOpenPage={onOpenPage}
          />
        ))}
        <button
          className={`${navItem} mt-0.5 text-faint`}
          onClick={() => onOpenPage(createPage(null))}
        >
          <PlusIcon size={14} />
          ページを追加
        </button>
      </div>

      {/* フッター */}
      <div className="relative border-t border-divider p-2">
        <button className={navItem} onClick={() => setTrashOpen(true)}>
          <TrashIcon size={15} />
          ゴミ箱
          {trashCount > 0 && (
            <span className="ml-auto rounded-full bg-active px-1.5 text-xs text-muted">
              {trashCount}
            </span>
          )}
        </button>
        <button className={navItem} onClick={onToggleTheme}>
          {isDark ? <SunIcon size={15} /> : <MoonIcon size={15} />}
          {isDark ? "ライトモード" : "ダークモード"}
        </button>
        {trashOpen && (
          <TrashPopover
            onClose={() => setTrashOpen(false)}
            onOpenPage={onOpenPage}
          />
        )}
      </div>
    </aside>
  );
}
