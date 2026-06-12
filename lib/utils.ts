export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}

/** HTML 文字列が実質的に空かどうか */
export function isEmptyHtml(html: string): boolean {
  if (!html) return true;
  const text = html
    .replace(/<br\s*\/?>(\s)*/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text.length === 0;
}

export function htmlToText(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, "");
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ---------------- キャレット操作ヘルパー ---------------- */

/** 要素内でのキャレット位置(テキストオフセット)を取得 */
export function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.endContainer, range.endOffset);
  return pre.toString().length;
}

/** 要素内の指定テキストオフセットにキャレットを置く */
export function setCaret(el: HTMLElement, pos: number | "start" | "end") {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  if (pos === "start") {
    range.selectNodeContents(el);
    range.collapse(true);
  } else if (pos === "end") {
    range.selectNodeContents(el);
    range.collapse(false);
  } else {
    let remaining = pos;
    let found = false;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const len = node.textContent?.length ?? 0;
      if (remaining <= len) {
        range.setStart(node, remaining);
        range.collapse(true);
        found = true;
        break;
      }
      remaining -= len;
      node = walker.nextNode();
    }
    if (!found) {
      range.selectNodeContents(el);
      range.collapse(false);
    }
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

/** 現在のキャレットの矩形を取得(空行などで取れない場合は null) */
export function getCaretRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rects = range.getClientRects();
  if (rects.length > 0) return rects[0];
  // 空要素の場合はゾロ幅スペースを一時挿入して測る
  const span = document.createElement("span");
  span.textContent = "\u200b";
  range.insertNode(span);
  const rect = span.getBoundingClientRect();
  span.parentNode?.removeChild(span);
  return rect;
}

export function isCaretOnFirstLine(el: HTMLElement): boolean {
  const rect = getCaretRect();
  if (!rect) return true;
  const elRect = el.getBoundingClientRect();
  const lineH = rect.height || 24;
  return rect.top - elRect.top < lineH * 0.9;
}

export function isCaretOnLastLine(el: HTMLElement): boolean {
  const rect = getCaretRect();
  if (!rect) return true;
  const elRect = el.getBoundingClientRect();
  const lineH = rect.height || 24;
  return elRect.bottom - rect.bottom < lineH * 0.9;
}

/** キャレット位置で要素のコンテンツを 2 つの HTML に分割する */
export function splitHtmlAtCaret(el: HTMLElement): {
  before: string;
  after: string;
} {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return { before: el.innerHTML, after: "" };
  }
  const range = sel.getRangeAt(0);

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(el);
  beforeRange.setEnd(range.startContainer, range.startOffset);

  const afterRange = document.createRange();
  afterRange.selectNodeContents(el);
  afterRange.setStart(range.endContainer, range.endOffset);

  const serialize = (r: Range) => {
    const div = document.createElement("div");
    div.appendChild(r.cloneContents());
    return div.innerHTML;
  };

  return { before: serialize(beforeRange), after: serialize(afterRange) };
}

/** テキストオフセット from..to の Range を作る */
export function createRangeFromOffsets(
  el: HTMLElement,
  from: number,
  to: number
): Range | null {
  const range = document.createRange();
  let startSet = false;
  let endSet = false;
  let count = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (!startSet && from <= count + len) {
      range.setStart(node, from - count);
      startSet = true;
    }
    if (!endSet && to <= count + len) {
      range.setEnd(node, to - count);
      endSet = true;
      break;
    }
    count += len;
    node = walker.nextNode();
  }
  if (!startSet) return null;
  if (!endSet) {
    range.setEnd(el, el.childNodes.length);
  }
  return range;
}

/** 要素内の from..to のテキストを削除する */
export function deleteTextRange(el: HTMLElement, from: number, to: number) {
  const range = createRangeFromOffsets(el, from, to);
  range?.deleteContents();
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `今日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
