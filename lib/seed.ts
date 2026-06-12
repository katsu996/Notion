import type { AppData, Block, BlockType, Page } from "./types";
import { uid } from "./utils";

function b(type: BlockType, html: string, extra: Partial<Block> = {}): Block {
  return { id: uid(), type, html, indent: 0, ...extra };
}

export function createEmptyPage(parentId: string | null = null): Page {
  const now = Date.now();
  return {
    id: uid(),
    title: "",
    icon: "",
    cover: null,
    blocks: [b("paragraph", "")],
    parentId,
    childIds: [],
    favorite: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** 初回起動時のサンプルデータ */
export function createSeedData(): AppData {
  const now = Date.now();

  const welcome: Page = {
    id: uid(),
    title: "はじめに",
    icon: "👋",
    cover: "blue",
    blocks: [
      b("h1", "ようこそ!"),
      b(
        "paragraph",
        "これは <b>Notion 風</b> のドキュメント作成アプリです。データはすべてお使いのブラウザの LocalStorage に保存されます。"
      ),
      b("divider", ""),
      b("h2", "基本操作"),
      b("todo", "行頭で <b>/</b> を入力してブロックメニューを開く"),
      b("todo", "<b>Enter</b> で新しいブロックを追加", { checked: true }),
      b("todo", "ブロックにカーソルを合わせて <b>⋮⋮</b> をドラッグして並べ替え"),
      b("todo", "<b>Tab</b> / <b>Shift+Tab</b> でインデント"),
      b("h2", "Markdown ショートカット"),
      b("bulleted", "<b># + スペース</b> → 見出し1(## で見出し2、### で見出し3)"),
      b("bulleted", "<b>- + スペース</b> → 箇条書きリスト"),
      b("bulleted", "<b>1. + スペース</b> → 番号付きリスト"),
      b("bulleted", "<b>[] + スペース</b> → ToDoリスト"),
      b("bulleted", "<b>&gt; + スペース</b> → トグルリスト"),
      b("bulleted", "<b>\" + スペース</b> → 引用"),
      b("h2", "いろいろなブロック"),
      b("toggle", "トグルブロック(クリックで開閉)"),
      b("paragraph", "トグルの中に隠れているテキストです。", { indent: 1 }),
      b("quote", "引用ブロック。大切な言葉をここに。"),
      b("callout", "コールアウトブロック。注意書きやメモに便利です。"),
      b("code", "console.log('Hello, Notion!');"),
      b("divider", ""),
      b("h3", "テキストの装飾"),
      b(
        "paragraph",
        "テキストを選択して <b>Ctrl/⌘ + B</b> で<b>太字</b>、<b>Ctrl/⌘ + I</b> で<i>斜体</i>、<b>Ctrl/⌘ + U</b> で<u>下線</u>になります。"
      ),
      b(
        "paragraph",
        "左上の ☰ からサイドバーを開き、ページの追加・検索・お気に入り・ゴミ箱が使えます。それでは、良い執筆を! ✍️"
      ),
    ],
    parentId: null,
    childIds: [],
    favorite: true,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  return {
    pages: { [welcome.id]: welcome },
    rootIds: [welcome.id],
  };
}
