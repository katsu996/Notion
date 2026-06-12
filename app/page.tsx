"use client";

import { useCallback, useEffect, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { PageHeader } from "@/components/PageHeader";
import { Editor } from "@/components/editor/Editor";
import { SearchModal } from "@/components/SearchModal";

const THEME_KEY = "notion-clone:theme";
const SIDEBAR_KEY = "notion-clone:sidebar";

function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 640;
}

function App() {
  const store = useStore();
  const { data, loaded, createPage, restorePage, destroyPage } = store;

  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  /* ---------- 初期化(ハッシュ・サイドバー・テーマ) ---------- */
  useEffect(() => {
    const applyHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      setCurrentPageId(id || null);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);

    if (!isMobile()) {
      setSidebarOpen(localStorage.getItem(SIDEBAR_KEY) !== "closed");
    }
    setIsDark(document.documentElement.classList.contains("dark"));

    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  /* ---------- Ctrl/⌘+K で検索 ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openPage = useCallback((id: string) => {
    window.location.hash = id;
    setCurrentPageId(id);
    if (isMobile()) setSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => {
      const next = !v;
      if (!isMobile()) {
        localStorage.setItem(SIDEBAR_KEY, next ? "open" : "closed");
      }
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((v) => {
      const next = !v;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  /* ---------- 表示するページの決定 ---------- */
  const current = currentPageId ? data.pages[currentPageId] : undefined;

  useEffect(() => {
    if (!loaded) return;
    if (current && !current.deletedAt) return;
    if (current?.deletedAt) return; // 削除済みページはバナー付きで表示
    const firstRoot = data.rootIds
      .map((id) => data.pages[id])
      .find((p) => p && !p.deletedAt);
    if (firstRoot) {
      openPage(firstRoot.id);
    } else {
      openPage(createPage(null));
    }
  }, [loaded, current, data, openPage, createPage]);

  if (!loaded) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <span className="flex h-10 w-10 animate-pulse items-center justify-center rounded-lg bg-ink text-lg font-bold text-bg">
          N
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {/* サイドバー */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 sm:hidden"
            onClick={toggleSidebar}
          />
          <div className="fixed inset-y-0 left-0 z-40 w-[272px] border-r border-divider sm:static sm:z-auto sm:w-60 sm:flex-none">
            <Sidebar
              currentPageId={currentPageId}
              onOpenPage={openPage}
              onClose={toggleSidebar}
              onOpenSearch={() => setSearchOpen(true)}
              isDark={isDark}
              onToggleTheme={toggleTheme}
            />
          </div>
        </>
      )}

      {/* メインコンテンツ */}
      <main className="flex h-full min-w-0 flex-1 flex-col">
        <Topbar
          page={current ?? null}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          onOpenPage={openPage}
        />

        {current ? (
          <div className="flex-1 overflow-y-auto">
            {current.deletedAt && (
              <div className="flex flex-wrap items-center justify-center gap-3 bg-danger/90 px-4 py-2 text-sm text-white">
                このページはゴミ箱の中にあります。
                <button
                  className="rounded border border-white/60 px-2.5 py-0.5 hover:bg-white/10"
                  onClick={() => restorePage(current.id)}
                >
                  復元する
                </button>
                <button
                  className="rounded border border-white/60 px-2.5 py-0.5 hover:bg-white/10"
                  onClick={() => destroyPage(current.id)}
                >
                  完全に削除
                </button>
              </div>
            )}
            <PageHeader page={current} />
            <div className="mx-auto w-full max-w-[760px] px-12 pt-3 max-sm:px-10">
              <Editor
                key={current.id}
                page={current}
                onOpenPage={openPage}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-faint">
            ページを読み込んでいます…
          </div>
        )}
      </main>

      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          onOpenPage={openPage}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}
