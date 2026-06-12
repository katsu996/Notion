"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Block, BlockType, Page } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  deleteTextRange,
  escapeHtml,
  getCaretOffset,
  getCaretRect,
  isCaretOnFirstLine,
  isCaretOnLastLine,
  isEmptyHtml,
  setCaret,
  splitHtmlAtCaret,
  uid,
} from "@/lib/utils";
import { filterBlockDefs, PLACEHOLDERS, type BlockDef } from "@/lib/blockDefs";
import { EditableBlock, type BlockHandlers } from "./EditableBlock";
import { SlashMenu } from "./SlashMenu";
import { BlockMenu } from "./BlockMenu";
import { DragHandleIcon, PageIcon, PlusIcon } from "@/components/icons";

interface SlashState {
  blockId: string;
  /** 「/」を含む削除開始位置 */
  deleteFrom: number;
  /** クエリ文字列の開始位置 */
  queryFrom: number;
  query: string;
  x: number;
  y: number;
  activeIndex: number;
}

interface MenuState {
  blockId: string;
  x: number;
  y: number;
}

interface DragState {
  dragId: string;
  overId: string | null;
  after: boolean;
}

interface FocusRequest {
  id: string;
  pos: number | "start" | "end";
}

function newBlock(type: BlockType, html = "", indent = 0): Block {
  return { id: uid(), type, html, indent };
}

const MD_SHORTCUTS: Array<[string, BlockType, Partial<Block>?]> = [
  ["###", "h3"],
  ["##", "h2"],
  ["#", "h1"],
  ["[]", "todo", { checked: false }],
  ["[ ]", "todo", { checked: false }],
  ["[x]", "todo", { checked: true }],
  ["1.", "numbered"],
  ["1)", "numbered"],
  ["-", "bulleted"],
  ["*", "bulleted"],
  ["+", "bulleted"],
  [">", "toggle"],
  ['"', "quote"],
  ["```", "code"],
  ["---", "divider"],
];

export function Editor({
  page,
  onOpenPage,
}: {
  page: Page;
  onOpenPage: (id: string) => void;
}) {
  const store = useStore();
  const { updateBlocks, createPage, deletePage, data } = store;

  const [slash, setSlash] = useState<SlashState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const focusReq = useRef<FocusRequest | null>(null);
  const blocksRef = useRef(page.blocks);
  blocksRef.current = page.blocks;
  const pageIdRef = useRef(page.id);
  pageIdRef.current = page.id;
  const slashRef = useRef(slash);
  slashRef.current = slash;

  /* ---------- フォーカス要求の適用 ---------- */
  useLayoutEffect(() => {
    const req = focusReq.current;
    if (!req) return;
    focusReq.current = null;
    const el = document.querySelector<HTMLElement>(
      `[data-block-id="${req.id}"]`
    );
    if (el) {
      el.focus();
      setCaret(el, req.pos);
    }
  });

  const requestFocus = useCallback((id: string, pos: FocusRequest["pos"]) => {
    focusReq.current = { id, pos };
  }, []);

  /* ---------- ブロック配列の操作ヘルパー ---------- */
  const mutate = useCallback(
    (fn: (blocks: Block[]) => Block[]) => {
      updateBlocks(pageIdRef.current, fn);
    },
    [updateBlocks]
  );

  const patchBlock = useCallback(
    (id: string, patch: Partial<Block>, bump = false) => {
      mutate((blocks) =>
        blocks.map((b) =>
          b.id === id
            ? { ...b, ...patch, ...(bump ? { v: (b.v ?? 0) + 1 } : {}) }
            : b
        )
      );
    },
    [mutate]
  );

  /* ---------- 表示対象ブロック(トグル折りたたみを反映) ---------- */
  const visibleBlocks = useMemo(() => {
    const out: Block[] = [];
    let skipIndent: number | null = null;
    for (const b of page.blocks) {
      if (skipIndent !== null) {
        if (b.indent > skipIndent) continue;
        skipIndent = null;
      }
      out.push(b);
      if (b.type === "toggle" && b.collapsed) skipIndent = b.indent;
    }
    return out;
  }, [page.blocks]);

  /* ---------- 番号付きリストの連番 ---------- */
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    const counters: Record<number, number> = {};
    for (const b of visibleBlocks) {
      if (b.type === "numbered") {
        counters[b.indent] = (counters[b.indent] ?? 0) + 1;
        Object.keys(counters).forEach((k) => {
          if (Number(k) > b.indent) delete counters[Number(k)];
        });
        map.set(b.id, counters[b.indent]);
      } else {
        Object.keys(counters).forEach((k) => {
          if (Number(k) >= b.indent) delete counters[Number(k)];
        });
      }
    }
    return map;
  }, [visibleBlocks]);

  const visibleIds = useMemo(
    () => visibleBlocks.map((b) => b.id),
    [visibleBlocks]
  );

  const prevEditable = useCallback(
    (id: string): Block | null => {
      const ids = visibleIds;
      let i = ids.indexOf(id) - 1;
      while (i >= 0) {
        const b = blocksRef.current.find((x) => x.id === ids[i]);
        if (b && b.type !== "divider" && b.type !== "page") return b;
        i--;
      }
      return null;
    },
    [visibleIds]
  );

  const nextEditable = useCallback(
    (id: string): Block | null => {
      const ids = visibleIds;
      let i = ids.indexOf(id) + 1;
      while (i < ids.length && i > 0) {
        const b = blocksRef.current.find((x) => x.id === ids[i]);
        if (b && b.type !== "divider" && b.type !== "page") return b;
        i++;
      }
      return null;
    },
    [visibleIds]
  );

  /* ---------- スラッシュメニュー ---------- */
  const applySlashSelection = useCallback(
    (def: BlockDef) => {
      const s = slashRef.current;
      if (!s) return;
      const el = document.querySelector<HTMLElement>(
        `[data-block-id="${s.blockId}"]`
      );
      if (!el) {
        setSlash(null);
        return;
      }
      const caret = getCaretOffset(el);
      deleteTextRange(el, s.deleteFrom, Math.max(caret, s.queryFrom));
      const newHtml = el.innerHTML;
      const block = blocksRef.current.find((b) => b.id === s.blockId);
      setSlash(null);
      if (!block) return;

      if (def.type === "divider") {
        if (isEmptyHtml(newHtml)) {
          const para = newBlock("paragraph", "", block.indent);
          mutate((blocks) => {
            const i = blocks.findIndex((b) => b.id === block.id);
            const next = [...blocks];
            next[i] = { ...block, type: "divider", html: "", v: (block.v ?? 0) + 1 };
            next.splice(i + 1, 0, para);
            return next;
          });
          requestFocus(para.id, "start");
        } else {
          const para = newBlock("paragraph", "", block.indent);
          mutate((blocks) => {
            const i = blocks.findIndex((b) => b.id === block.id);
            const next = [...blocks];
            next[i] = { ...block, html: newHtml, v: (block.v ?? 0) + 1 };
            next.splice(
              i + 1,
              0,
              newBlock("divider", "", block.indent),
              para
            );
            return next;
          });
          requestFocus(para.id, "start");
        }
        return;
      }

      if (def.type === "page") {
        const childId = createPage(pageIdRef.current, {});
        const pageBlk: Block = {
          id: uid(),
          type: "page",
          html: "",
          indent: block.indent,
          pageId: childId,
        };
        mutate((blocks) => {
          const i = blocks.findIndex((b) => b.id === block.id);
          const next = [...blocks];
          if (isEmptyHtml(newHtml)) {
            next[i] = pageBlk;
          } else {
            next[i] = { ...block, html: newHtml, v: (block.v ?? 0) + 1 };
            next.splice(i + 1, 0, pageBlk);
          }
          return next;
        });
        onOpenPage(childId);
        return;
      }

      patchBlock(
        block.id,
        {
          type: def.type,
          html: newHtml,
          checked: false,
          collapsed: false,
        },
        true
      );
      requestFocus(block.id, s.deleteFrom);
    },
    [createPage, mutate, onOpenPage, patchBlock, requestFocus]
  );

  /* ---------- 安定なイベントハンドラー群 ---------- */
  const handlers = useMemo<BlockHandlers>(() => {
    const getBlock = (e: { currentTarget: HTMLElement }) => {
      const id = e.currentTarget.dataset.blockId!;
      return blocksRef.current.find((b) => b.id === id) ?? null;
    };

    const onInput = (e: FormEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const block = getBlock(e);
      if (!block) return;
      const html = el.innerHTML;
      updateBlocks(pageIdRef.current, (blocks) =>
        blocks.map((b) => (b.id === block.id ? { ...b, html } : b))
      );

      const native = e.nativeEvent as InputEvent;
      const s = slashRef.current;

      // 「/」入力でメニューを開く(コードブロック内は除く)
      if (
        !s &&
        block.type !== "code" &&
        native.inputType === "insertText" &&
        native.data === "/"
      ) {
        const caret = getCaretOffset(el);
        const rect = getCaretRect();
        const elRect = el.getBoundingClientRect();
        setSlash({
          blockId: block.id,
          deleteFrom: caret - 1,
          queryFrom: caret,
          query: "",
          x: rect ? rect.left : elRect.left,
          y: (rect ? rect.bottom : elRect.bottom) + 6,
          activeIndex: 0,
        });
        return;
      }

      // メニューが開いている間はクエリを更新
      if (s && s.blockId === block.id) {
        const caret = getCaretOffset(el);
        if (caret < s.queryFrom) {
          setSlash(null);
          return;
        }
        const text = el.textContent || "";
        const query = text.slice(s.queryFrom, caret);
        if (query.length > 24 || /\n/.test(query)) {
          setSlash(null);
        } else {
          setSlash({ ...s, query, activeIndex: 0 });
        }
      } else if (s) {
        setSlash(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const block = getBlock(e);
      if (!block) return;
      const composing =
        e.nativeEvent.isComposing || e.keyCode === 229;

      /* --- スラッシュメニューのキーボード操作 --- */
      const s = slashRef.current;
      if (s && s.blockId === block.id && !composing) {
        const defs = filterBlockDefs(s.query);
        if (defs.length > 0) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSlash({ ...s, activeIndex: (s.activeIndex + 1) % defs.length });
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setSlash({
              ...s,
              activeIndex: (s.activeIndex - 1 + defs.length) % defs.length,
            });
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            applySlashSelectionRef.current(
              defs[Math.min(s.activeIndex, defs.length - 1)]
            );
            return;
          }
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setSlash(null);
          return;
        }
      }

      /* --- インライン書式 --- */
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "b" || k === "i" || k === "u" || (k === "s" && e.shiftKey)) {
          e.preventDefault();
          document.execCommand(
            k === "b"
              ? "bold"
              : k === "i"
                ? "italic"
                : k === "u"
                  ? "underline"
                  : "strikeThrough"
          );
          updateBlocks(pageIdRef.current, (blocks) =>
            blocks.map((b) =>
              b.id === block.id ? { ...b, html: el.innerHTML } : b
            )
          );
          return;
        }
      }

      /* --- Enter --- */
      if (e.key === "Enter" && !e.shiftKey) {
        if (composing) return;
        if (block.type === "code") {
          e.preventDefault();
          if (e.metaKey || e.ctrlKey) {
            const para = newBlock("paragraph", "", block.indent);
            mutateRef.current((blocks) => {
              const i = blocks.findIndex((b) => b.id === block.id);
              const next = [...blocks];
              next.splice(i + 1, 0, para);
              return next;
            });
            requestFocus(para.id, "start");
          } else {
            document.execCommand("insertLineBreak");
          }
          return;
        }
        e.preventDefault();

        const empty = isEmptyHtml(el.innerHTML);
        const convertible: BlockType[] = [
          "todo",
          "bulleted",
          "numbered",
          "toggle",
          "quote",
          "callout",
          "h1",
          "h2",
          "h3",
        ];
        if (empty && convertible.includes(block.type)) {
          // 空のリストアイテムなどで Enter → 段落に戻す
          patchBlockRef.current(block.id, { type: "paragraph" }, false);
          requestFocus(block.id, "start");
          return;
        }
        if (empty && block.indent > 0) {
          patchBlockRef.current(block.id, { indent: block.indent - 1 }, false);
          requestFocus(block.id, "start");
          return;
        }

        const { before, after } = splitHtmlAtCaret(el);
        const keepType: BlockType[] = ["todo", "bulleted", "numbered"];
        const nType = keepType.includes(block.type)
          ? block.type
          : "paragraph";
        const nIndent =
          block.type === "toggle" && !block.collapsed
            ? Math.min(block.indent + 1, 4)
            : block.indent;
        const nb: Block = {
          ...newBlock(nType, after, nIndent),
          checked: false,
        };
        mutateRef.current((blocks) => {
          const i = blocks.findIndex((b) => b.id === block.id);
          if (i < 0) return blocks;
          const next = [...blocks];
          next[i] = { ...next[i], html: before, v: (next[i].v ?? 0) + 1 };
          next.splice(i + 1, 0, nb);
          return next;
        });
        requestFocus(nb.id, "start");
        return;
      }

      /* --- Backspace --- */
      if (e.key === "Backspace" && !composing) {
        const sel = window.getSelection();
        const collapsed = sel ? sel.isCollapsed : true;
        const caret = getCaretOffset(el);
        if (!collapsed || caret !== 0) return;

        e.preventDefault();
        if (block.type !== "paragraph" && block.type !== "code") {
          patchBlockRef.current(block.id, { type: "paragraph" }, false);
          requestFocus(block.id, "start");
          return;
        }
        if (block.indent > 0) {
          patchBlockRef.current(block.id, { indent: block.indent - 1 }, false);
          requestFocus(block.id, "start");
          return;
        }
        const ids = blocksRef.current.map((b) => b.id);
        const idx = ids.indexOf(block.id);
        if (idx <= 0) return;
        const prev = blocksRef.current[idx - 1];

        if (prev.type === "divider") {
          mutateRef.current((blocks) => blocks.filter((b) => b.id !== prev.id));
          requestFocus(block.id, "start");
          return;
        }
        if (prev.type === "page") {
          // ページブロックは Backspace では消さずにフォーカス移動のみ
          return;
        }
        const prevEl = document.querySelector<HTMLElement>(
          `[data-block-id="${prev.id}"]`
        );
        const prevLen = prevEl?.textContent?.length ?? 0;
        const curHtml = el.innerHTML;
        mutateRef.current((blocks) => {
          const i = blocks.findIndex((b) => b.id === block.id);
          if (i <= 0) return blocks;
          const next = [...blocks];
          const p = next[i - 1];
          next[i - 1] = {
            ...p,
            html: isEmptyHtml(curHtml) ? p.html : p.html + curHtml,
            v: (p.v ?? 0) + 1,
          };
          next.splice(i, 1);
          return next.length > 0 ? next : [newBlock("paragraph")];
        });
        requestFocus(prev.id, prevLen);
        return;
      }

      /* --- Tab / Shift+Tab --- */
      if (e.key === "Tab") {
        e.preventDefault();
        if (block.type === "code" && !e.shiftKey) {
          document.execCommand("insertText", false, "  ");
          return;
        }
        const delta = e.shiftKey ? -1 : 1;
        const nextIndent = Math.max(0, Math.min(4, block.indent + delta));
        if (nextIndent !== block.indent) {
          patchBlockRef.current(block.id, { indent: nextIndent }, false);
        }
        return;
      }

      /* --- 上下キーでブロック間移動 --- */
      if (e.key === "ArrowUp" && !composing && !slashRef.current) {
        if (isCaretOnFirstLine(el)) {
          const prev = prevEditableRef.current(block.id);
          if (prev) {
            e.preventDefault();
            requestFocus(prev.id, "end");
            // 即時にフォーカスを移す(再レンダリング不要のため)
            const pel = document.querySelector<HTMLElement>(
              `[data-block-id="${prev.id}"]`
            );
            if (pel) {
              focusReq.current = null;
              pel.focus();
              setCaret(pel, "end");
            }
          }
        }
        return;
      }
      if (e.key === "ArrowDown" && !composing && !slashRef.current) {
        if (isCaretOnLastLine(el)) {
          const nxt = nextEditableRef.current(block.id);
          if (nxt) {
            e.preventDefault();
            const nel = document.querySelector<HTMLElement>(
              `[data-block-id="${nxt.id}"]`
            );
            if (nel) {
              nel.focus();
              setCaret(nel, "start");
            }
          }
        }
        return;
      }

      /* --- Markdown ショートカット --- */
      if (e.key === " " && !composing && block.type !== "code") {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) return;
        const caret = getCaretOffset(el);
        const prefix = (el.textContent || "").slice(0, caret);
        const hit = MD_SHORTCUTS.find(([p]) => p === prefix);
        if (!hit) return;
        e.preventDefault();
        const [, type, extra] = hit;
        const rest = escapeHtml((el.textContent || "").slice(caret));

        if (type === "divider") {
          const para = newBlock("paragraph", rest, block.indent);
          mutateRef.current((blocks) => {
            const i = blocks.findIndex((b) => b.id === block.id);
            const next = [...blocks];
            next[i] = {
              ...next[i],
              type: "divider",
              html: "",
              v: (next[i].v ?? 0) + 1,
            };
            next.splice(i + 1, 0, para);
            return next;
          });
          requestFocus(para.id, "start");
          return;
        }
        patchBlockRef.current(
          block.id,
          { type, html: rest, collapsed: false, ...extra },
          true
        );
        requestFocus(block.id, "start");
        return;
      }
    };

    const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const el = e.currentTarget;
      const block = getBlock(e);
      if (!block) return;
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      const lines = text.split(/\r?\n/);
      if (lines.length === 1 || block.type === "code") {
        document.execCommand(
          "insertText",
          false,
          block.type === "code" ? text : lines.join(" ")
        );
        // insertText は input イベントを発火するので store 更新は不要
        return;
      }
      const { before, after } = splitHtmlAtCaret(el);
      const firstHtml = before + escapeHtml(lines[0]);
      const middle = lines
        .slice(1, -1)
        .map((l) => newBlock("paragraph", escapeHtml(l), block.indent));
      const lastLine = lines[lines.length - 1];
      const lastBlk = newBlock(
        "paragraph",
        escapeHtml(lastLine) + after,
        block.indent
      );
      mutateRef.current((blocks) => {
        const i = blocks.findIndex((b) => b.id === block.id);
        if (i < 0) return blocks;
        const next = [...blocks];
        next[i] = { ...next[i], html: firstHtml, v: (next[i].v ?? 0) + 1 };
        next.splice(i + 1, 0, ...middle, lastBlk);
        return next;
      });
      requestFocus(lastBlk.id, lastLine.length);
    };

    const onFocus = (e: FocusEvent<HTMLDivElement>) => {
      const id = e.currentTarget.dataset.blockId;
      if (id) setFocusedId(id);
    };

    const onBlur = () => {
      // メニュー項目クリックは onMouseDown を preventDefault しているため
      // ここに来るのは本当にフォーカスが外れたときだけ
      if (slashRef.current) setSlash(null);
    };

    return { onInput, onKeyDown, onPaste, onFocus, onBlur };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 安定ハンドラーから最新のコールバックを参照するための ref
  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;
  const applySlashSelectionRef = useRef(applySlashSelection);
  applySlashSelectionRef.current = applySlashSelection;
  const patchBlockRef = useRef(patchBlock);
  patchBlockRef.current = patchBlock;
  const prevEditableRef = useRef(prevEditable);
  prevEditableRef.current = prevEditable;
  const nextEditableRef = useRef(nextEditable);
  nextEditableRef.current = nextEditable;

  /* ---------- ブロックメニューの操作 ---------- */
  const menuBlock = menu
    ? page.blocks.find((b) => b.id === menu.blockId)
    : null;

  const moveBlock = useCallback(
    (id: string, dir: -1 | 1) => {
      mutate((blocks) => {
        const i = blocks.findIndex((b) => b.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= blocks.length) return blocks;
        const next = [...blocks];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    },
    [mutate]
  );

  const deleteBlock = useCallback(
    (id: string) => {
      const blk = blocksRef.current.find((b) => b.id === id);
      if (blk?.type === "page" && blk.pageId) {
        deletePage(blk.pageId);
      }
      mutate((blocks) => {
        const next = blocks.filter((b) => b.id !== id);
        return next.length > 0 ? next : [newBlock("paragraph")];
      });
    },
    [deletePage, mutate]
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      mutate((blocks) => {
        const i = blocks.findIndex((b) => b.id === id);
        if (i < 0) return blocks;
        const copy = { ...blocks[i], id: uid(), v: 0 };
        const next = [...blocks];
        next.splice(i + 1, 0, copy);
        return next;
      });
    },
    [mutate]
  );

  /* ---------- ドラッグ&ドロップ ---------- */
  const handleDrop = useCallback(() => {
    const d = drag;
    setDrag(null);
    if (!d || !d.overId || d.dragId === d.overId) return;
    mutate((blocks) => {
      const from = blocks.findIndex((b) => b.id === d.dragId);
      if (from < 0) return blocks;
      const next = [...blocks];
      const [moved] = next.splice(from, 1);
      let to = next.findIndex((b) => b.id === d.overId);
      if (to < 0) return blocks;
      if (d.after) to += 1;
      next.splice(to, 0, moved);
      return next;
    });
  }, [drag, mutate]);

  /* ---------- 末尾の空白クリックで段落追加 ---------- */
  const handleTailClick = useCallback(() => {
    const blocks = blocksRef.current;
    const last = blocks[blocks.length - 1];
    if (
      last &&
      last.type === "paragraph" &&
      isEmptyHtml(last.html)
    ) {
      const el = document.querySelector<HTMLElement>(
        `[data-block-id="${last.id}"]`
      );
      if (el) {
        el.focus();
        setCaret(el, "end");
        return;
      }
    }
    const nb = newBlock("paragraph");
    mutate((blocks) => [...blocks, nb]);
    requestFocus(nb.id, "start");
  }, [mutate, requestFocus]);

  /* ---------- ブロック挿入(+ ボタン) ---------- */
  const insertBelow = useCallback(
    (id: string) => {
      const nb = newBlock(
        "paragraph",
        "",
        blocksRef.current.find((b) => b.id === id)?.indent ?? 0
      );
      mutate((blocks) => {
        const i = blocks.findIndex((b) => b.id === id);
        if (i < 0) return blocks;
        const next = [...blocks];
        next.splice(i + 1, 0, nb);
        return next;
      });
      requestFocus(nb.id, "start");
    },
    [mutate, requestFocus]
  );

  /* ---------- レンダリング ---------- */
  return (
    <div
      className="flex min-h-[50vh] flex-col pb-32"
      onDragOver={(e) => {
        if (drag) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        handleDrop();
      }}
    >
      {visibleBlocks.map((block) => (
        <BlockRow
          key={`${block.id}:${block.v ?? 0}:${block.type}`}
          block={block}
          page={page}
          number={numbers.get(block.id)}
          handlers={handlers}
          focused={focusedId === block.id}
          drag={drag}
          setDrag={setDrag}
          onDrop={handleDrop}
          onOpenMenu={(x, y) => setMenu({ blockId: block.id, x, y })}
          onInsertBelow={() => insertBelow(block.id)}
          onToggleChecked={() =>
            patchBlock(block.id, { checked: !block.checked })
          }
          onToggleCollapsed={() =>
            patchBlock(block.id, { collapsed: !block.collapsed })
          }
          onOpenPage={onOpenPage}
          childTitle={
            block.pageId
              ? data.pages[block.pageId]?.title ?? null
              : null
          }
          childIcon={
            block.pageId ? data.pages[block.pageId]?.icon ?? "" : ""
          }
          childDeleted={
            block.pageId ? !!data.pages[block.pageId]?.deletedAt : false
          }
        />
      ))}

      <div className="min-h-[25vh] flex-1 cursor-text" onClick={handleTailClick} />

      {slash && (
        <SlashMenu
          x={slash.x}
          y={slash.y}
          query={slash.query}
          activeIndex={slash.activeIndex}
          onSelect={applySlashSelection}
          onHover={(i) => setSlash((s) => (s ? { ...s, activeIndex: i } : s))}
        />
      )}

      {menu && menuBlock && (
        <BlockMenu
          block={menuBlock}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onDelete={() => deleteBlock(menuBlock.id)}
          onDuplicate={() => duplicateBlock(menuBlock.id)}
          onMove={(dir) => moveBlock(menuBlock.id, dir)}
          onTurnInto={(type) =>
            patchBlock(menuBlock.id, { type, collapsed: false }, false)
          }
        />
      )}
    </div>
  );
}

/* ================= 1 ブロック分の行 ================= */

interface RowProps {
  block: Block;
  page: Page;
  number?: number;
  handlers: BlockHandlers;
  focused: boolean;
  drag: DragState | null;
  setDrag: (d: DragState | null) => void;
  onDrop: () => void;
  onOpenMenu: (x: number, y: number) => void;
  onInsertBelow: () => void;
  onToggleChecked: () => void;
  onToggleCollapsed: () => void;
  onOpenPage: (id: string) => void;
  childTitle: string | null;
  childIcon: string;
  childDeleted: boolean;
}

function BlockRow({
  block,
  number,
  handlers,
  focused,
  drag,
  setDrag,
  onDrop,
  onOpenMenu,
  onInsertBelow,
  onToggleChecked,
  onToggleCollapsed,
  onOpenPage,
  childTitle,
  childIcon,
  childDeleted,
}: RowProps) {
  const isDragOver = drag?.overId === block.id;
  const indentPx = block.indent * 26;

  const contentClass = (() => {
    switch (block.type) {
      case "h1":
        return "text-[1.875rem] font-bold leading-tight py-1";
      case "h2":
        return "text-[1.5rem] font-semibold leading-tight py-1";
      case "h3":
        return "text-[1.25rem] font-semibold leading-tight py-0.5";
      case "code":
        return "font-mono text-[0.85rem] leading-normal";
      case "quote":
        return "text-base leading-relaxed py-0.5";
      case "todo":
        return `text-base leading-relaxed py-[3px] ${
          block.checked ? "text-muted line-through" : ""
        }`;
      default:
        return "text-base leading-relaxed py-[3px]";
    }
  })();

  const placeholder =
    block.type === "paragraph"
      ? "「/」でコマンドを呼び出す"
      : PLACEHOLDERS[block.type] || "";

  const marginTop = (() => {
    switch (block.type) {
      case "h1":
        return "mt-7";
      case "h2":
        return "mt-5";
      case "h3":
        return "mt-3";
      default:
        return "mt-0.5";
    }
  })();

  const editable = (
    <EditableBlock
      block={block}
      className={`${contentClass} ${
        block.type === "paragraph" ? "ph-on-focus" : ""
      }`}
      placeholder={placeholder}
      handlers={handlers}
    />
  );

  let body: ReactNode;
  switch (block.type) {
    case "divider":
      body = (
        <div className="flex h-7 w-full items-center">
          <hr className="w-full border-divider" />
        </div>
      );
      break;
    case "page":
      body = childDeleted || !block.pageId ? (
        <div className="flex items-center gap-2 py-1 text-muted line-through">
          <PageIcon size={18} />
          <span>{childTitle || "無題"}(削除済み)</span>
        </div>
      ) : (
        <button
          className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-hover"
          onClick={() => block.pageId && onOpenPage(block.pageId)}
        >
          <span className="flex w-5 justify-center text-lg leading-none">
            {childIcon || <PageIcon size={18} className="text-muted" />}
          </span>
          <span className="border-b border-faint font-medium">
            {childTitle || "無題"}
          </span>
        </button>
      );
      break;
    case "todo":
      body = (
        <div className="flex w-full items-start gap-2">
          <button
            aria-label="チェック"
            className="mt-[7px] flex h-4 w-4 flex-none items-center justify-center"
            onClick={onToggleChecked}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-sm border text-[10px] text-white transition-colors ${
                block.checked
                  ? "border-accent bg-accent"
                  : "border-[currentColor] text-transparent"
              }`}
            >
              ✓
            </span>
          </button>
          {editable}
        </div>
      );
      break;
    case "bulleted":
      body = (
        <div className="flex w-full items-start gap-2">
          <span className="mt-[3px] w-4 flex-none select-none text-center text-base leading-relaxed">
            •
          </span>
          {editable}
        </div>
      );
      break;
    case "numbered":
      body = (
        <div className="flex w-full items-start gap-2">
          <span className="mt-[3px] min-w-4 flex-none select-none text-right text-base leading-relaxed">
            {number ?? 1}.
          </span>
          {editable}
        </div>
      );
      break;
    case "toggle":
      body = (
        <div className="flex w-full items-start gap-1">
          <button
            aria-label="開閉"
            className="mt-[5px] flex h-5 w-5 flex-none items-center justify-center rounded hover:bg-hover"
            onClick={onToggleCollapsed}
          >
            <span
              className={`text-xs transition-transform ${
                block.collapsed ? "" : "rotate-90"
              }`}
            >
              ▶
            </span>
          </button>
          {editable}
        </div>
      );
      break;
    case "quote":
      body = (
        <div className="my-0.5 flex w-full border-l-[3px] border-ink pl-3.5">
          {editable}
        </div>
      );
      break;
    case "callout":
      body = (
        <div className="my-1 flex w-full items-start gap-3 rounded-md bg-callout px-4 py-3.5">
          <span className="select-none text-lg leading-none">💡</span>
          {editable}
        </div>
      );
      break;
    case "code":
      body = (
        <div className="my-1 w-full rounded-md bg-code px-4 py-3.5">
          {editable}
        </div>
      );
      break;
    default:
      body = editable;
  }

  return (
    <div
      className={`group relative flex items-start ${marginTop} ${
        drag?.dragId === block.id ? "opacity-40" : ""
      }`}
      style={{ paddingLeft: indentPx }}
      onDragOver={(e) => {
        if (!drag) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
        if (
          drag.overId !== block.id ||
          drag.after !== after
        ) {
          setDrag({ ...drag, overId: block.id, after });
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
    >
      {/* ドロップ位置インジケーター */}
      {isDragOver && (
        <div
          className={`pointer-events-none absolute left-0 right-0 h-[3px] rounded bg-accent/50 ${
            drag!.after ? "bottom-[-2px]" : "top-[-2px]"
          }`}
        />
      )}

      {/* ホバーコントロール(+ とドラッグハンドル) */}
      <div
        className={`absolute -left-11 top-1/2 flex h-6 -translate-y-1/2 items-center text-faint transition-opacity max-sm:-left-9 ${
          focused
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        }`}
        contentEditable={false}
      >
        <button
          aria-label="ブロックを追加"
          className="flex h-6 w-5 items-center justify-center rounded hover:bg-hover hover:text-muted max-sm:hidden"
          onClick={onInsertBelow}
        >
          <PlusIcon size={15} />
        </button>
        <button
          aria-label="ブロックメニュー"
          draggable
          className="flex h-6 w-4 cursor-grab items-center justify-center rounded hover:bg-hover hover:text-muted active:cursor-grabbing"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onOpenMenu(r.left, r.bottom + 4);
          }}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", block.id);
            setDrag({ dragId: block.id, overId: null, after: false });
          }}
          onDragEnd={() => setDrag(null)}
        >
          <DragHandleIcon size={15} />
        </button>
      </div>

      {body}
    </div>
  );
}
