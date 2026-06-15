# データモデル

## 概要

アプリのすべてのデータは `AppData` 型の JSON として LocalStorage に保存されます。型定義は `lib/types.ts` に集約されています。

## コア型

### BlockType

ブロックの種別。13 種類をサポートしています。

```1:14:lib/types.ts
export type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "todo"
  | "bulleted"
  | "numbered"
  | "toggle"
  | "quote"
  | "callout"
  | "code"
  | "divider"
  | "page";
```

### Block

ページ内の最小編集単位です。

```16:34:lib/types.ts
export interface Block {
  id: string;
  type: BlockType;
  /** インライン HTML(太字・斜体など) */
  html: string;
  /** インデントレベル 0..4 */
  indent: number;
  /** ToDo のチェック状態 */
  checked?: boolean;
  /** トグルの折りたたみ状態 */
  collapsed?: boolean;
  /** page ブロックが参照するページ ID */
  pageId?: string;
  /**
   * バージョン。プログラム側からコンテンツを書き換えたとき(分割・結合など)に
   * インクリメントし、contentEditable を再マウントさせるために使う。
   */
  v?: number;
}
```

| フィールド | 説明 |
|-----------|------|
| `id` | 一意識別子（`uid()` で生成） |
| `type` | ブロック種別 |
| `html` | インライン HTML 文字列（`<b>`, `<i>`, `<u>`, `<s>` 等） |
| `indent` | ネストレベル（0〜4）。リストやトグルの子ブロックに使用 |
| `checked` | ToDo ブロックのチェック状態 |
| `collapsed` | トグルブロックの折りたたみ状態 |
| `pageId` | `page` ブロックが参照するサブページの ID |
| `v` | プログラムによる HTML 書き換え時にインクリメント。`EditableBlock` の再マウント用 |

### Page

ドキュメントの1ページを表します。

```36:48:lib/types.ts
export interface Page {
  id: string;
  title: string;
  icon: string;
  cover: string | null;
  blocks: Block[];
  parentId: string | null;
  childIds: string[];
  favorite: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
```

| フィールド | 説明 |
|-----------|------|
| `id` | 一意識別子 |
| `title` | ページタイトル（空の場合は「無題」として表示） |
| `icon` | 絵文字アイコン（空文字列 = アイコンなし） |
| `cover` | カバーのキー（`lib/covers.ts` のキー、または `null`） |
| `blocks` | ブロック配列 |
| `parentId` | 親ページの ID（ルートページは `null`） |
| `childIds` | 子ページ ID の配列（表示順を保持） |
| `favorite` | お気に入りフラグ |
| `deletedAt` | ゴミ箱送りのタイムスタンプ（`null` = 通常状態） |
| `createdAt` / `updatedAt` | Unix タイムスタンプ（ミリ秒） |

### AppData

アプリ全体のデータ構造です。

```50:53:lib/types.ts
export interface AppData {
  pages: Record<string, Page>;
  rootIds: string[];
}
```

- `pages`: ページ ID をキーとする辞書。削除済みページも辞書内に残る（ソフトデリート）
- `rootIds`: ルートレベルのページ ID 配列（表示順を保持）

## ページツリー

親子関係は **双方向リンク** で管理します。

```
AppData
├── rootIds: ["page-a", "page-b"]
└── pages
    ├── page-a (parentId: null, childIds: ["page-c"])
    └── page-c (parentId: "page-a", childIds: [])
```

| 操作 | 挙動 |
|------|------|
| 新規ページ作成 | 親の `childIds` に追加、または `rootIds` に追加 |
| ソフトデリート | サブツリー全体の `deletedAt` を設定 |
| 復元 | サブツリー全体の `deletedAt` を `null` に。親が削除済みならルートへ移動 |
| 完全削除 | サブツリー全体を `pages` から除去し、`childIds` / `rootIds` を整理 |
| 複製 | サブツリーごと ID を再採番してコピー |

サブツリーの走査は `collectSubtree()` 関数（`lib/store.tsx` 内）で行います。

## Store API

`useStore()` が返すオブジェクトのメソッド一覧です。実装は `lib/store.tsx` にあります。

| メソッド | シグネチャ | 説明 |
|----------|-----------|------|
| `getPage` | `(id: string) => Page \| undefined` | ID でページを取得 |
| `createPage` | `(parentId: string \| null, partial?: Partial<Page>) => string` | 新規ページ作成。戻り値は新ページ ID |
| `updatePage` | `(id: string, patch: Partial<Page>) => void` | ページメタデータを部分更新。`updatedAt` を自動更新 |
| `updateBlocks` | `(pageId: string, updater: (blocks: Block[]) => Block[]) => void` | ブロック配列を updater 関数で更新 |
| `deletePage` | `(id: string) => void` | サブツリーをソフトデリート |
| `restorePage` | `(id: string) => void` | サブツリーを復元 |
| `destroyPage` | `(id: string) => void` | サブツリーを完全削除 |
| `emptyTrash` | `() => void` | ゴミ箱内の全ページを完全削除 |
| `duplicatePage` | `(id: string) => string \| null` | サブツリーごと複製。戻り値は新ルートページ ID |
| `toggleFavorite` | `(id: string) => void` | お気に入りの ON/OFF |

### ユーティリティ関数

| 関数 | 説明 |
|------|------|
| `getBreadcrumbs(data, pageId)` | 先祖から自分までの `Page[]` を返す（パンくずリスト用） |

### loaded フラグ

`StoreProvider` は初回 LocalStorage 読み込みが完了するまで `loaded: false` です。`app/page.tsx` は `loaded` が `true` になるまでローディング画面を表示します。

## LocalStorage スキーマ

### アプリデータ

| 項目 | 値 |
|------|-----|
| キー | `notion-clone:data:v1` |
| 形式 | `AppData` の JSON 文字列 |
| 保存タイミング | `data` 変更後 300ms デバウンス |
| 初回 | キーが存在しない場合、`createSeedData()` で「はじめに」ページを生成 |

### UI 設定（アプリデータとは独立）

| キー | 値 | 管理場所 |
|------|-----|----------|
| `notion-clone:theme` | `"dark"` / `"light"` | `app/layout.tsx`, `app/page.tsx` |
| `notion-clone:sidebar` | `"open"` / `"closed"` | `app/page.tsx`（デスクトップのみ） |

## JSON サンプル

最小限の `AppData` の例:

```json
{
  "pages": {
    "abc123": {
      "id": "abc123",
      "title": "はじめに",
      "icon": "👋",
      "cover": "blue",
      "blocks": [
        {
          "id": "blk001",
          "type": "h1",
          "html": "ようこそ!",
          "indent": 0
        },
        {
          "id": "blk002",
          "type": "paragraph",
          "html": "テキストを書いてみましょう。",
          "indent": 0
        }
      ],
      "parentId": null,
      "childIds": [],
      "favorite": false,
      "deletedAt": null,
      "createdAt": 1718000000000,
      "updatedAt": 1718000000000
    }
  },
  "rootIds": ["abc123"]
}
```

## シードデータ

初回起動時は `lib/seed.ts` の `createSeedData()` が呼ばれ、「はじめに」ページ（各ブロック種別のサンプル付き）が生成されます。`createEmptyPage()` は新規ページ作成時に使われ、空の paragraph ブロック1つを持つページを返します。

## スキーマバージョン

LocalStorage キーに `:v1` サフィックスが付いています。将来スキーマを変更する場合は、新しいキー（例: `notion-clone:data:v2`）へのマイグレーション処理を `StoreProvider` の初回ロードに追加してください。
