import type { BlockType } from "./types";

export interface BlockDef {
  type: BlockType;
  label: string;
  description: string;
  keywords: string[];
  icon: string;
}

/** スラッシュメニュー・タイプ変換メニューに表示するブロック定義 */
export const BLOCK_DEFS: BlockDef[] = [
  {
    type: "paragraph",
    label: "テキスト",
    description: "プレーンテキストで書き始めます。",
    keywords: ["text", "paragraph", "てきすと", "ぶんしょう"],
    icon: "Aa",
  },
  {
    type: "h1",
    label: "見出し1",
    description: "大きな見出しです。",
    keywords: ["h1", "heading", "title", "みだし", "#"],
    icon: "H1",
  },
  {
    type: "h2",
    label: "見出し2",
    description: "中くらいの見出しです。",
    keywords: ["h2", "heading", "みだし", "##"],
    icon: "H2",
  },
  {
    type: "h3",
    label: "見出し3",
    description: "小さな見出しです。",
    keywords: ["h3", "heading", "みだし", "###"],
    icon: "H3",
  },
  {
    type: "todo",
    label: "ToDoリスト",
    description: "チェックボックス付きのタスクです。",
    keywords: ["todo", "task", "check", "やること", "たすく"],
    icon: "☑",
  },
  {
    type: "bulleted",
    label: "箇条書きリスト",
    description: "シンプルな箇条書きリストです。",
    keywords: ["bullet", "list", "かじょうがき", "りすと", "-"],
    icon: "•",
  },
  {
    type: "numbered",
    label: "番号付きリスト",
    description: "番号付きのリストです。",
    keywords: ["number", "ordered", "ばんごう", "りすと", "1."],
    icon: "1.",
  },
  {
    type: "toggle",
    label: "トグルリスト",
    description: "開閉できるリストです。",
    keywords: ["toggle", "collapse", "とぐる", ">"],
    icon: "▸",
  },
  {
    type: "page",
    label: "ページ",
    description: "このページの中にサブページを作ります。",
    keywords: ["page", "subpage", "ぺーじ", "さぶぺーじ"],
    icon: "📄",
  },
  {
    type: "quote",
    label: "引用",
    description: "引用文を挿入します。",
    keywords: ["quote", "blockquote", "いんよう"],
    icon: "❝",
  },
  {
    type: "callout",
    label: "コールアウト",
    description: "目立たせたい文章に使います。",
    keywords: ["callout", "info", "こーるあうと", "めも"],
    icon: "💡",
  },
  {
    type: "code",
    label: "コード",
    description: "コードスニペットを記録します。",
    keywords: ["code", "snippet", "こーど"],
    icon: "</>",
  },
  {
    type: "divider",
    label: "区切り線",
    description: "ブロックを視覚的に分割します。",
    keywords: ["divider", "separator", "line", "くぎり", "---"],
    icon: "—",
  },
];

export function filterBlockDefs(query: string): BlockDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return BLOCK_DEFS;
  return BLOCK_DEFS.filter(
    (d) =>
      d.label.toLowerCase().includes(q) ||
      d.keywords.some((k) => k.includes(q))
  );
}

/** ブロック種別ごとの空時プレースホルダー */
export const PLACEHOLDERS: Partial<Record<BlockType, string>> = {
  h1: "見出し1",
  h2: "見出し2",
  h3: "見出し3",
  todo: "ToDo",
  bulleted: "リスト",
  numbered: "リスト",
  toggle: "トグル",
  quote: "引用",
  callout: "何か書いてみましょう…",
  code: "コードを入力",
};
