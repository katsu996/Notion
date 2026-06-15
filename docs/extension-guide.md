# 拡張ガイド

機能追加・変更時のチェックリストです。変更は最小限のファイルに留め、既存のパターンに従ってください。

## 新しいブロックタイプの追加

以下の順序で変更します。

### 1. 型定義 — `lib/types.ts`

`BlockType` union に新しい種別を追加します。専用の状態フィールドが必要な場合は `Block` interface に optional フィールドを追加します。

```typescript
export type BlockType =
  | "paragraph"
  // ... 既存の種別
  | "myBlock";  // 追加

export interface Block {
  // ... 既存フィールド
  myField?: string;  // 必要な場合のみ
}
```

### 2. ブロック定義 — `lib/blockDefs.ts`

`BLOCK_DEFS` 配列にエントリを追加し、スラッシュメニューで検索・表示できるようにします。

```typescript
{
  type: "myBlock",
  label: "マイブロック",
  description: "説明文",
  keywords: ["my", "block", "まい"],
  icon: "★",
},
```

空のときに表示するプレースホルダーが必要なら `PLACEHOLDERS` にも追加します。

```typescript
export const PLACEHOLDERS: Partial<Record<BlockType, string>> = {
  // ... 既存
  myBlock: "テキストを入力",
};
```

### 3. レンダリング — `components/editor/Editor.tsx`

#### BlockRow の分岐を追加

`BlockRow` 内の `switch (block.type)` に新しい case を追加します。

```typescript
case "myBlock":
  body = (
    <div className="my-block-wrapper">
      {editable}
    </div>
  );
  break;
```

`divider` や `page` のようにテキスト入力が不要なブロックは `EditableBlock` を使わず、専用 UI を実装します。

#### contentClass / marginTop（任意）

見出しレベルに相当するスタイルが必要なら、`contentClass` や `marginTop` の switch に case を追加します。

#### Markdown ショートカット（任意）

行頭変換を追加する場合、`MD_SHORTCUTS` 配列にエントリを追加します。

```typescript
["!!", "myBlock"],
```

#### ブロック作成ロジック

スラッシュメニューやタイプ変換で新種別を選んだときの初期化処理が必要なら、`applyBlockType` や `newBlock` 周辺のロジックを確認・更新します。初期状態のフィールド（`checked`, `collapsed` 等）を設定してください。

### 4. スタイル — `app/globals.css`（必要な場合）

Tailwind クラスで足りない場合のみ、CSS 変数や専用セレクタを追加します。既存の `.block-content` パターンに合わせてください。

### チェックリスト

- [ ] `lib/types.ts` — `BlockType` に追加
- [ ] `lib/blockDefs.ts` — `BLOCK_DEFS` に追加
- [ ] `lib/blockDefs.ts` — `PLACEHOLDERS` に追加（テキスト入力ブロックの場合）
- [ ] `components/editor/Editor.tsx` — `BlockRow` のレンダリング分岐
- [ ] `components/editor/Editor.tsx` — `MD_SHORTCUTS`（任意）
- [ ] `app/globals.css` — 専用スタイル（任意）
- [ ] 動作確認: スラッシュメニュー、タイプ変換、キーボード操作、D&D

---

## ページカバーの追加

`lib/covers.ts` の `COVERS` オブジェクトにキーとグラデーションを追加します。

```typescript
export const COVERS: Record<string, string> = {
  // ... 既存
  aurora: "linear-gradient(120deg, #667eea 0%, #764ba2 100%)",
};
```

`COVER_KEYS` は `Object.keys(COVERS)` で自動生成されるため、個別の更新は不要です。

---

## ページアイコン（絵文字）の追加

`lib/emojis.ts` の配列に絵文字を追加します。`PageHeader.tsx` のピッカー UI はこのリストを参照します。

---

## Store アクションの追加

新しいデータ操作を追加する場合、`lib/store.tsx` を以下の順で変更します。

### 1. StoreValue interface にメソッドを追加

```typescript
interface StoreValue {
  // ... 既存
  myAction: (id: string) => void;
}
```

### 2. useCallback で実装

既存の `createPage` や `updatePage` と同様に、`setData` でイミュータブルに更新します。

```typescript
const myAction = useCallback((id: string) => {
  setData((d) => {
    // イミュータブルな更新
    return { ...d, /* ... */ };
  });
}, []);
```

### 3. useMemo の value に追加

```typescript
const value = useMemo<StoreValue>(
  () => ({
    // ... 既存
    myAction,
  }),
  [/* ... 既存の依存 + myAction */]
);
```

### チェックリスト

- [ ] `StoreValue` interface に型定義
- [ ] `useCallback` で実装
- [ ] `useMemo` の value と依存配列に追加
- [ ] 呼び出し元のコンポーネントで `useStore()` 経由で使用

---

## LocalStorage スキーマの変更

スキーマを破壊的に変更する場合:

1. 新しいストレージキー（例: `notion-clone:data:v2`）を定義
2. `StoreProvider` の初回ロードで旧キーからのマイグレーション処理を実装
3. マイグレーション後に旧キーを削除

```typescript
const STORAGE_KEY = "notion-clone:data:v2";
const LEGACY_KEY = "notion-clone:data:v1";

// useEffect 内で:
const raw = localStorage.getItem(STORAGE_KEY)
  ?? migrateFromV1(localStorage.getItem(LEGACY_KEY));
```

---

## 静的エクスポートの制約

機能追加時に守るべき制約です。

| 制約 | 対処 |
|------|------|
| サーバー API が使えない | すべてクライアント側で完結させる |
| SSR で LocalStorage にアクセスできない | `useEffect` 内でのみ読み書き |
| 動的ルートのサーバー生成不可 | ハッシュルーティング（`#pageId`）を維持 |
| `next/image` 最適化不可 | `<img>` または `unoptimized: true` |

新しい Next.js ページを追加する場合も、`output: "export"` と整合するよう静的にビルド可能であることを確認してください。

---

## 新しい UI コンポーネントの追加

1. `components/` にファイルを作成（既存の命名規則: PascalCase.tsx）
2. データ操作が必要なら `useStore()` を使用
3. `app/page.tsx` または適切な親コンポーネントから import
4. スタイルは Tailwind クラスを優先。テーマ対応には CSS 変数（`bg-bg`, `text-muted` 等）を使用

---

## 補助スクリプト

### スモークテスト — `scripts/smoke-test.mjs`

Playwright による E2E スモークテストです。`localhost:3100` でサーバーが起動している前提です。

```bash
# Playwright は package.json の依存に含まれないため手動インストール
npm install -D playwright
npx playwright install chromium

# 別ターミナルでサーバー起動後
node scripts/smoke-test.mjs
```

新機能を追加したら、該当するテストケースを `smoke-test.mjs` に追加することを推奨します。

### スクリーンショット — `scripts/screenshots.mjs`

PR 用のスクリーンショットを撮影するスクリプトです。同様に Playwright が必要です。

---

## 開発時の確認事項

```bash
npm run dev      # 開発サーバー (localhost:3000)
npm run build    # 静的エクスポート (out/)
npm run lint     # ESLint
```

ビルドが通ること、LocalStorage への保存・復元が正常であること、ライト/ダーク両テーマで表示が崩れないことを確認してください。
