# コンポーネント構成

## ディレクトリマップ

```
app/
  layout.tsx       ルートレイアウト、メタデータ、テーマ初期化スクリプト
  page.tsx         アプリシェル（SPA エントリ）
  globals.css      Tailwind v4、CSS 変数、ブロックエディタ用スタイル

components/
  Sidebar.tsx      サイドバー（ページツリー・お気に入り・ゴミ箱）
  Topbar.tsx       トップバー（パンくず・サイドバートグル）
  PageHeader.tsx   ページヘッダー（タイトル・アイコン・カバー）
  SearchModal.tsx  全ページ検索モーダル
  TrashPopover.tsx ゴミ箱ポップオーバー
  icons.tsx        インライン SVG アイコン集
  editor/
    Editor.tsx         ブロックエディタ本体
    EditableBlock.tsx  非制御 contentEditable ブロック
    SlashMenu.tsx      スラッシュコマンドメニュー
    BlockMenu.tsx      ブロック操作メニュー

lib/
  types.ts         型定義
  store.tsx        状態管理（React Context + LocalStorage）
  seed.ts          シードデータ・空ページ生成
  blockDefs.ts     ブロック種別定義
  utils.ts         ユーティリティ（uid、キャレット操作、HTML 処理）
  covers.ts        ページカバー用グラデーション
  emojis.ts        ページアイコン用絵文字リスト

scripts/
  smoke-test.mjs   Playwright スモークテスト
  screenshots.mjs  PR 用スクリーンショット撮影
```

## コンポーネント責務

| コンポーネント | 責務 | 主な依存 |
|----------------|------|----------|
| `app/page.tsx` | アプリシェル。ハッシュルーティング、テーマ/サイドバー管理、検索ショートカット（`Ctrl/⌘+K`）、削除済みページのバナー表示 | `StoreProvider`, 各 UI コンポーネント |
| `app/layout.tsx` | HTML 構造、メタデータ、ダークモード FOUC 防止スクリプト | `globals.css` |
| `Sidebar.tsx` | ページツリー表示、お気に入り、ゴミ箱、新規ページ作成、テーマ切替 | `useStore` |
| `Topbar.tsx` | パンくずリスト、サイドバー開閉トグル | `getBreadcrumbs` |
| `PageHeader.tsx` | ページタイトル編集、アイコン（絵文字）選択、カバー（グラデーション）設定 | `lib/covers`, `lib/emojis`, `useStore` |
| `Editor.tsx` | ブロック編集の中核。D&D 並べ替え、スラッシュコマンド、Markdown ショートカット、キーボード操作 | `EditableBlock`, `SlashMenu`, `BlockMenu`, `useStore` |
| `EditableBlock.tsx` | 単一ブロックの非制御 `contentEditable` レンダリング | — |
| `SlashMenu.tsx` | `/` コマンドのポップアップ UI | `lib/blockDefs` |
| `BlockMenu.tsx` | ブロックの削除・複製・移動・タイプ変更メニュー | `lib/blockDefs` |
| `SearchModal.tsx` | 全ページ検索（タイトル・本文のテキストマッチ） | `useStore` |
| `TrashPopover.tsx` | ゴミ箱内ページの一覧・復元・完全削除 | `useStore` |
| `icons.tsx` | アプリ全体で使うインライン SVG アイコン | — |

## アプリシェル（app/page.tsx）

`Home` コンポーネントが `StoreProvider` で `App` をラップします。

```
Home
└── StoreProvider
    └── App
        ├── Sidebar（条件付き表示）
        ├── main
        │   ├── Topbar
        │   ├── PageHeader + Editor（ページ選択時）
        │   └── 削除済みバナー（条件付き）
        └── SearchModal（条件付き）
```

主な責務:

- **ハッシュルーティング**: `window.location.hash` → `currentPageId`
- **初期ページ決定**: ハッシュが無効な場合、最初のルートページ or 新規作成
- **レスポンシブ**: 640px 未満でドロワー式サイドバー
- **キーボードショートカット**: `Ctrl/⌘+K` で検索モーダル

`Editor` には `key={current.id}` を渡しており、ページ切り替え時にエディタ状態をリセットします。

## Editor の内部構造

`components/editor/Editor.tsx` はアプリ最大のコンポーネント（約 1,100 行）です。

### 内部コンポーネント

| 名前 | 役割 |
|------|------|
| `Editor` | ブロック一覧の管理、イベントハンドラ、メニュー/ドラッグ状態 |
| `BlockRow` | ブロック種別ごとのラッパー・装飾レンダリング |

`EditableBlock` はテキスト入力専用です。リストマーカー、チェックボックス、トグル矢印、引用の左ボーダーなどは `BlockRow` が担当します。

### 内部状態

| 状態 | 型 | 用途 |
|------|-----|------|
| `slash` | `SlashState \| null` | スラッシュコマンドメニューの表示位置・クエリ |
| `menu` | `MenuState \| null` | ブロック操作メニューの表示位置 |
| `drag` | `DragState \| null` | ドラッグ&ドロップ中のブロック ID・ドロップ先 |
| `focusedId` | `string \| null` | 現在フォーカス中のブロック ID |
| `focusRequest` | `FocusRequest \| null` | プログラムによるフォーカス移動要求 |

### BlockRow のレンダリング分岐

`block.type` に応じて `body` を切り替えます。

| type | レンダリング |
|------|-------------|
| `divider` | `<hr>` のみ（編集不可） |
| `page` | サブページへのリンクボタン |
| `todo` | チェックボックス + EditableBlock |
| `bulleted` | `•` マーカー + EditableBlock |
| `numbered` | 番号 + EditableBlock |
| `toggle` | 開閉矢印 + EditableBlock |
| `quote` | 左ボーダー付き EditableBlock |
| `callout` | 💡 アイコン + 背景付き EditableBlock |
| `code` | モノスペース背景付き EditableBlock |
| その他 | EditableBlock のみ |

### Markdown ショートカット

行頭で特定の文字列 + スペースを入力すると、ブロック種別が自動変換されます。

```68:84:components/editor/Editor.tsx
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
```

### キーボード操作（主要）

| 操作 | キー |
|------|------|
| 新規ブロック | `Enter` |
| ブロック削除（空の場合） | `Backspace` |
| インデント | `Tab` / `Shift+Tab` |
| 太字 / 斜体 / 下線 / 取り消し線 | `Ctrl/⌘+B/I/U/Shift+S` |
| ブロック結合 | `Backspace`（行頭） |
| ブロック分割 | `Enter`（行中） |

## contentEditable の設計

`EditableBlock` は **非制御コンポーネント** として実装されています。

```21:26:components/editor/EditableBlock.tsx
/**
 * 非制御 contentEditable。
 * マウント時の HTML を固定し、入力中の再レンダリングでキャレットが
 * 飛ばないようにする。プログラムから書き換えるときは block.v を
 * インクリメントして再マウントさせる(親側で key に v を含める)。
 */
```

| 課題 | 対策 |
|------|------|
| 入力中のキャレット飛び | `dangerouslySetInnerHTML` で初期 HTML のみ設定し、入力中は再レンダリングしない |
| プログラムによる HTML 変更 | `block.v` をインクリメントし、`key` に含めて再マウント |
| 不要な再レンダリング | `memo` のカスタム比較で `id`, `v`, `className`, `placeholder`, `handlers` のみ比較 |

親の `Editor` は `onInput` で DOM から HTML を読み取り、`updateBlocks` で Store を更新します。

## lib/ の補助モジュール

| モジュール | 役割 |
|-----------|------|
| `utils.ts` | `uid()` ID 生成、キャレット位置の取得/設定、HTML 分割・結合、`escapeHtml` |
| `blockDefs.ts` | `BLOCK_DEFS`（スラッシュメニュー用定義）、`PLACEHOLDERS`、`filterBlockDefs()` |
| `covers.ts` | `COVERS`（グラデーション定義）、`COVER_KEYS`、`randomCover()` |
| `emojis.ts` | ページアイコン選択用の絵文字リスト |
| `seed.ts` | `createSeedData()`（初回データ）、`createEmptyPage()`（新規ページ） |

## スタイリング

- **Tailwind CSS v4**: `app/globals.css` で `@import "tailwindcss"` と CSS 変数を定義
- **テーマ**: `:root` と `.dark` でライト/ダークの CSS 変数を切り替え
- **ブロック固有スタイル**: `globals.css` の `.block-content` や `[data-placeholder]` セレクタ

詳細な拡張手順は [extension-guide.md](extension-guide.md) を参照してください。
