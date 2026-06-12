"use client";

import { memo, useRef, useState } from "react";
import type { Page } from "@/lib/types";
import { useStore } from "@/lib/store";
import { COVERS, COVER_KEYS, randomCover } from "@/lib/covers";
import { EMOJIS } from "@/lib/emojis";
import { ImageIcon, SmileIcon } from "@/components/icons";
import { setCaret } from "@/lib/utils";

/* ---------------- 絵文字ピッカー ---------------- */

function EmojiPicker({
  onSelect,
  onRemove,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className="pop-in absolute left-0 top-full z-50 mt-2 w-[324px] max-w-[calc(100vw-32px)] rounded-lg bg-bg p-3"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted">絵文字</span>
          <div className="flex gap-1">
            <button
              className="rounded px-2 py-0.5 text-xs text-muted hover:bg-hover"
              onClick={() =>
                onSelect(EMOJIS[Math.floor(Math.random() * EMOJIS.length)])
              }
            >
              ランダム
            </button>
            <button
              className="rounded px-2 py-0.5 text-xs text-muted hover:bg-hover"
              onClick={onRemove}
            >
              削除
            </button>
          </div>
        </div>
        <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
          {EMOJIS.map((e) => (
            <button
              key={e}
              className="flex h-8 w-8 items-center justify-center rounded text-xl hover:bg-hover"
              onClick={() => onSelect(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- カバーピッカー ---------------- */

function CoverPicker({
  onSelect,
  onClose,
}: {
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className="pop-in absolute right-0 top-full z-50 mt-1 w-[280px] rounded-lg bg-bg p-3"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <div className="mb-2 text-xs font-medium text-muted">
          カラー&グラデーション
        </div>
        <div className="grid grid-cols-4 gap-2">
          {COVER_KEYS.map((key) => (
            <button
              key={key}
              aria-label={key}
              className="h-12 rounded border border-divider transition-transform hover:scale-105"
              style={{ background: COVERS[key] }}
              onClick={() => onSelect(key)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- タイトル(非制御 contentEditable) ---------------- */

const PageTitle = memo(
  function PageTitle({
    page,
    onChange,
  }: {
    page: Page;
    onChange: (title: string) => void;
  }) {
    const initial = useRef(page.title);
    return (
      <h1
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-placeholder="新規ページ"
        className="block-content relative w-full text-[2.5rem] font-bold leading-tight max-sm:text-[2rem]"
        onInput={(e) => onChange(e.currentTarget.textContent || "")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            const first = document.querySelector<HTMLElement>("[data-block-id]");
            if (first) {
              first.focus();
              setCaret(first, "start");
            }
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData
            .getData("text/plain")
            .replace(/\n/g, " ");
          document.execCommand("insertText", false, text);
        }}
        dangerouslySetInnerHTML={{ __html: initial.current }}
      />
    );
  },
  (prev, next) => prev.page.id === next.page.id
);

/* ---------------- ページヘッダー ---------------- */

export function PageHeader({ page }: { page: Page }) {
  const { updatePage } = useStore();
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);

  return (
    <div>
      {page.cover && (
        <div
          className="group/cover relative h-[200px] w-full max-sm:h-[128px]"
          style={{ background: COVERS[page.cover] || COVERS.blue }}
        >
          <div className="absolute bottom-3 right-4 flex gap-1 opacity-0 transition-opacity group-hover/cover:opacity-100 max-sm:opacity-100">
            <div className="relative">
              <button
                className="rounded-l bg-bg/90 px-2.5 py-1 text-xs text-muted hover:bg-bg"
                onClick={() => setCoverOpen(true)}
              >
                変更
              </button>
              {coverOpen && (
                <CoverPicker
                  onSelect={(key) => {
                    updatePage(page.id, { cover: key });
                    setCoverOpen(false);
                  }}
                  onClose={() => setCoverOpen(false)}
                />
              )}
            </div>
            <button
              className="rounded-r bg-bg/90 px-2.5 py-1 text-xs text-muted hover:bg-bg"
              onClick={() => updatePage(page.id, { cover: null })}
            >
              削除
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[760px] px-12 max-sm:px-10">
        <div className={page.cover ? "-mt-8" : "mt-10 max-sm:mt-4"}>
          {page.icon && (
            <div className="relative inline-block">
              <button
                className="rounded-md p-1 text-[64px] leading-none transition-colors hover:bg-hover max-sm:text-[52px]"
                onClick={() => setEmojiOpen(true)}
              >
                {page.icon}
              </button>
              {emojiOpen && (
                <EmojiPicker
                  onSelect={(e) => {
                    updatePage(page.id, { icon: e });
                    setEmojiOpen(false);
                  }}
                  onRemove={() => {
                    updatePage(page.id, { icon: "" });
                    setEmojiOpen(false);
                  }}
                  onClose={() => setEmojiOpen(false)}
                />
              )}
            </div>
          )}
        </div>

        {/* アイコン/カバー追加ボタン(ホバーで表示) */}
        <div className="group/add relative mt-2">
          <div className="flex h-7 items-center gap-1 opacity-0 transition-opacity group-hover/add:opacity-100 has-[button:focus]:opacity-100">
            {!page.icon && (
              <div className="relative">
                <button
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-faint hover:bg-hover"
                  onClick={() => setEmojiOpen(true)}
                >
                  <SmileIcon size={14} />
                  アイコンを追加
                </button>
                {emojiOpen && !page.icon && (
                  <EmojiPicker
                    onSelect={(e) => {
                      updatePage(page.id, { icon: e });
                      setEmojiOpen(false);
                    }}
                    onRemove={() => setEmojiOpen(false)}
                    onClose={() => setEmojiOpen(false)}
                  />
                )}
              </div>
            )}
            {!page.cover && (
              <button
                className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-faint hover:bg-hover"
                onClick={() => updatePage(page.id, { cover: randomCover() })}
              >
                <ImageIcon size={14} />
                カバー画像を追加
              </button>
            )}
          </div>
          <PageTitle
            key={page.id}
            page={page}
            onChange={(title) => updatePage(page.id, { title })}
          />
        </div>
      </div>
    </div>
  );
}
