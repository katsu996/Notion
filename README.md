# Notion クローン

Notion 風のドキュメント作成アプリです。Next.js(静的エクスポート)で構築されており、データはすべてブラウザの **LocalStorage** に保存されます。ログインやサーバーは不要です。

## 主な機能

- **ブロックエディタ**
  - テキスト / 見出し1〜3 / ToDoリスト / 箇条書き / 番号付きリスト / トグル / 引用 / コールアウト / コード / 区切り線 / サブページ
  - `/` でスラッシュコマンドメニュー
  - Markdown ショートカット(`# `、`- `、`1. `、`[] `、`> `、`" `、` ``` `、`--- ` など)
  - `Ctrl/⌘ + B / I / U / Shift+S` でインライン書式(太字・斜体・下線・取り消し線)
  - ドラッグ&ドロップによるブロックの並べ替え、`Tab` / `Shift+Tab` でインデント
  - ブロックメニュー(削除・複製・移動・タイプ変更)
- **ページ管理**
  - ネスト可能なページツリー、サブページ
  - ページアイコン(絵文字)とカバー(グラデーション)
  - お気に入り、ゴミ箱(復元・完全削除)、ページ複製
  - `Ctrl/⌘ + K` で全ページ検索(タイトル・本文)
- **UI**
  - ダークモード対応
  - モバイル対応(ドロワー式サイドバー、タッチ操作)
  - データは LocalStorage に自動保存

## 開発

```bash
npm install
npm run dev
```

http://localhost:3000 で起動します。

## ビルド(静的エクスポート)

```bash
npm run build
```

`out/` ディレクトリに静的ファイルが生成されます。サブパスに配置する場合は `NEXT_PUBLIC_BASE_PATH` を指定してください:

```bash
NEXT_PUBLIC_BASE_PATH=/Notion npm run build
```

## GitHub Pages へのデプロイ

`main` ブランチへ push すると、GitHub Actions(`.github/workflows/deploy.yml`)が自動でビルドして GitHub Pages にデプロイします。

**初回のみ**、リポジトリの設定が必要です:

1. GitHub のリポジトリページで **Settings → Pages** を開く
2. **Build and deployment → Source** を **GitHub Actions** に変更する

以後、`https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます。

## 技術スタック

- [Next.js](https://nextjs.org/)(App Router、`output: "export"` による静的エクスポート)
- React 19 / TypeScript
- Tailwind CSS v4
- LocalStorage(永続化)

## 開発者向けドキュメント

アーキテクチャ・データモデル・コンポーネント構成・拡張ガイドは [docs/](docs/README.md) を参照してください。
