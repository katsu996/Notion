"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getBreadcrumbs, useStore } from "@/lib/store";
import { htmlToText } from "@/lib/utils";
import { PageIcon, SearchIcon } from "@/components/icons";

export function SearchModal({
  onClose,
  onOpenPage,
}: {
  onClose: () => void;
  onOpenPage: (id: string) => void;
}) {
  const { data } = useStore();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const pages = Object.values(data.pages).filter((p) => !p.deletedAt);
    const q = query.trim().toLowerCase();
    const scored = pages
      .map((p) => {
        const title = (p.title || "無題").toLowerCase();
        const body = p.blocks
          .map((b) => htmlToText(b.html))
          .join(" ")
          .toLowerCase();
        let score = -1;
        let snippet = "";
        if (!q) {
          score = p.updatedAt;
        } else if (title.includes(q)) {
          score = 1000 + p.updatedAt / 1e13;
        } else if (body.includes(q)) {
          score = 500 + p.updatedAt / 1e13;
          const idx = body.indexOf(q);
          snippet = body.slice(Math.max(0, idx - 24), idx + 48);
        }
        return { page: p, score, snippet };
      })
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    return scored;
  }, [data.pages, query]);

  useEffect(() => setActive(0), [query]);

  const open = (id: string) => {
    onOpenPage(id);
    onClose();
  };

  return (
    <div
      className="fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[60vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl bg-bg"
        style={{ boxShadow: "var(--shadow)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-divider px-4 py-3">
          <SearchIcon size={18} className="flex-none text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter" && results[active]) {
                open(results[active].page.id);
              }
            }}
            placeholder="ページを検索…"
            className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-divider px-1.5 py-0.5 text-[10px] text-faint">
            ESC
          </kbd>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-faint">
              結果が見つかりません
            </div>
          ) : (
            results.map((r, i) => {
              const crumbs = getBreadcrumbs(data, r.page.id);
              const path = crumbs
                .slice(0, -1)
                .map((c) => c.title || "無題")
                .join(" / ");
              return (
                <button
                  key={r.page.id}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left ${
                    i === active ? "bg-hover" : ""
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => open(r.page.id)}
                >
                  <span className="flex w-6 flex-none justify-center text-lg">
                    {r.page.icon || (
                      <PageIcon size={17} className="text-muted" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">
                      {r.page.title || "無題"}
                    </span>
                    {(path || r.snippet) && (
                      <span className="block truncate text-xs text-muted">
                        {r.snippet || path}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
