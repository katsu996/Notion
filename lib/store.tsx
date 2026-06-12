"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppData, Block, Page } from "./types";
import { createEmptyPage, createSeedData } from "./seed";
import { uid } from "./utils";

const STORAGE_KEY = "notion-clone:data:v1";

interface StoreValue {
  data: AppData;
  loaded: boolean;
  getPage: (id: string) => Page | undefined;
  createPage: (parentId: string | null, partial?: Partial<Page>) => string;
  updatePage: (id: string, patch: Partial<Page>) => void;
  updateBlocks: (pageId: string, updater: (blocks: Block[]) => Block[]) => void;
  deletePage: (id: string) => void;
  restorePage: (id: string) => void;
  destroyPage: (id: string) => void;
  emptyTrash: () => void;
  duplicatePage: (id: string) => string | null;
  toggleFavorite: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function collectSubtree(data: AppData, rootId: string): string[] {
  const ids: string[] = [];
  const walk = (id: string) => {
    const page = data.pages[id];
    if (!page) return;
    ids.push(id);
    page.childIds.forEach(walk);
  };
  walk(rootId);
  return ids;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({ pages: {}, rootIds: [] });
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初回ロード(静的エクスポートのため client 側でのみ実行)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(JSON.parse(raw) as AppData);
      } else {
        setData(createSeedData());
      }
    } catch {
      setData(createSeedData());
    }
    setLoaded(true);
  }, []);

  // デバウンス保存
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // 容量超過などは黙って無視
      }
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, loaded]);

  const getPage = useCallback(
    (id: string) => data.pages[id],
    [data]
  );

  const createPage = useCallback(
    (parentId: string | null, partial?: Partial<Page>) => {
      const page = { ...createEmptyPage(parentId), ...partial };
      setData((d) => {
        const pages = { ...d.pages, [page.id]: page };
        let rootIds = d.rootIds;
        if (parentId && pages[parentId]) {
          pages[parentId] = {
            ...pages[parentId],
            childIds: [...pages[parentId].childIds, page.id],
          };
        } else {
          page.parentId = null;
          rootIds = [...d.rootIds, page.id];
        }
        return { pages, rootIds };
      });
      return page.id;
    },
    []
  );

  const updatePage = useCallback((id: string, patch: Partial<Page>) => {
    setData((d) => {
      const page = d.pages[id];
      if (!page) return d;
      return {
        ...d,
        pages: {
          ...d.pages,
          [id]: { ...page, ...patch, updatedAt: Date.now() },
        },
      };
    });
  }, []);

  const updateBlocks = useCallback(
    (pageId: string, updater: (blocks: Block[]) => Block[]) => {
      setData((d) => {
        const page = d.pages[pageId];
        if (!page) return d;
        return {
          ...d,
          pages: {
            ...d.pages,
            [pageId]: {
              ...page,
              blocks: updater(page.blocks),
              updatedAt: Date.now(),
            },
          },
        };
      });
    },
    []
  );

  const deletePage = useCallback((id: string) => {
    setData((d) => {
      const now = Date.now();
      const ids = collectSubtree(d, id);
      if (ids.length === 0) return d;
      const pages = { ...d.pages };
      ids.forEach((pid) => {
        pages[pid] = { ...pages[pid], deletedAt: now };
      });
      return { ...d, pages };
    });
  }, []);

  const restorePage = useCallback((id: string) => {
    setData((d) => {
      const page = d.pages[id];
      if (!page) return d;
      const ids = collectSubtree(d, id);
      const pages = { ...d.pages };
      ids.forEach((pid) => {
        pages[pid] = { ...pages[pid], deletedAt: null };
      });
      let rootIds = d.rootIds;
      // 親が存在しない・削除済みならルートに移動する
      const parent = page.parentId ? pages[page.parentId] : null;
      if (!parent || parent.deletedAt) {
        if (parent) {
          pages[parent.id] = {
            ...parent,
            childIds: parent.childIds.filter((c) => c !== id),
          };
        }
        pages[id] = { ...pages[id], parentId: null };
        if (!rootIds.includes(id)) rootIds = [...rootIds, id];
      }
      return { pages, rootIds };
    });
  }, []);

  const destroyPage = useCallback((id: string) => {
    setData((d) => {
      const page = d.pages[id];
      if (!page) return d;
      const ids = new Set(collectSubtree(d, id));
      const pages: AppData["pages"] = {};
      Object.values(d.pages).forEach((p) => {
        if (ids.has(p.id)) return;
        if (p.childIds.some((c) => ids.has(c))) {
          pages[p.id] = {
            ...p,
            childIds: p.childIds.filter((c) => !ids.has(c)),
          };
        } else {
          pages[p.id] = p;
        }
      });
      return {
        pages,
        rootIds: d.rootIds.filter((r) => !ids.has(r)),
      };
    });
  }, []);

  const emptyTrash = useCallback(() => {
    setData((d) => {
      const deleted = new Set(
        Object.values(d.pages)
          .filter((p) => p.deletedAt)
          .map((p) => p.id)
      );
      if (deleted.size === 0) return d;
      const pages: AppData["pages"] = {};
      Object.values(d.pages).forEach((p) => {
        if (deleted.has(p.id)) return;
        pages[p.id] = {
          ...p,
          childIds: p.childIds.filter((c) => !deleted.has(c)),
        };
      });
      return {
        pages,
        rootIds: d.rootIds.filter((r) => !deleted.has(r)),
      };
    });
  }, []);

  const duplicatePage = useCallback(
    (id: string): string | null => {
      let newId: string | null = null;
      setData((d) => {
        const src = d.pages[id];
        if (!src) return d;
        const ids = collectSubtree(d, id);
        const idMap = new Map<string, string>();
        ids.forEach((oldId) => idMap.set(oldId, uid()));
        newId = idMap.get(id)!;

        const pages = { ...d.pages };
        const now = Date.now();
        ids.forEach((oldId) => {
          const p = d.pages[oldId];
          const copy: Page = {
            ...p,
            id: idMap.get(oldId)!,
            title: oldId === id ? `${p.title || "無題"} (コピー)` : p.title,
            parentId:
              oldId === id
                ? p.parentId
                : idMap.get(p.parentId || "") || p.parentId,
            childIds: p.childIds.map((c) => idMap.get(c) || c),
            favorite: false,
            createdAt: now,
            updatedAt: now,
            blocks: p.blocks.map((blk) => ({
              ...blk,
              id: uid(),
              pageId: blk.pageId
                ? idMap.get(blk.pageId) || blk.pageId
                : undefined,
            })),
          };
          pages[copy.id] = copy;
        });

        let rootIds = d.rootIds;
        if (src.parentId && pages[src.parentId]) {
          const parent = pages[src.parentId];
          const idx = parent.childIds.indexOf(id);
          const childIds = [...parent.childIds];
          childIds.splice(idx + 1, 0, newId!);
          pages[src.parentId] = { ...parent, childIds };
        } else {
          const idx = d.rootIds.indexOf(id);
          rootIds = [...d.rootIds];
          rootIds.splice(idx + 1, 0, newId!);
        }
        return { pages, rootIds };
      });
      return newId;
    },
    []
  );

  const toggleFavorite = useCallback((id: string) => {
    setData((d) => {
      const page = d.pages[id];
      if (!page) return d;
      return {
        ...d,
        pages: { ...d.pages, [id]: { ...page, favorite: !page.favorite } },
      };
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      loaded,
      getPage,
      createPage,
      updatePage,
      updateBlocks,
      deletePage,
      restorePage,
      destroyPage,
      emptyTrash,
      duplicatePage,
      toggleFavorite,
    }),
    [
      data,
      loaded,
      getPage,
      createPage,
      updatePage,
      updateBlocks,
      deletePage,
      restorePage,
      destroyPage,
      emptyTrash,
      duplicatePage,
      toggleFavorite,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

/** ページのパンくずリスト(先祖 → 自分)を返す */
export function getBreadcrumbs(data: AppData, pageId: string): Page[] {
  const chain: Page[] = [];
  let cur: Page | undefined = data.pages[pageId];
  let guard = 0;
  while (cur && guard < 50) {
    chain.unshift(cur);
    cur = cur.parentId ? data.pages[cur.parentId] : undefined;
    guard++;
  }
  return chain;
}
