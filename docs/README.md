# 開発者向けドキュメント

Notion クローンの内部構造・データモデル・拡張方法をまとめたドキュメントです。

## ドキュメント一覧

| ドキュメント | 内容 |
|-------------|------|
| [architecture.md](architecture.md) | システム全体のアーキテクチャ、ルーティング、状態管理、CI/CD |
| [data-model.md](data-model.md) | 型定義、ページツリー、Store API、LocalStorage スキーマ |
| [components.md](components.md) | ディレクトリ構成、コンポーネント責務、Editor の内部構造 |
| [extension-guide.md](extension-guide.md) | ブロック追加や Store 拡張のチェックリスト |

## 読み方の推奨順序

1. **architecture.md** — 全体像を把握する
2. **data-model.md** — データ構造と Store API を理解する
3. **components.md** — UI レイヤーの責務分担を確認する
4. **extension-guide.md** — 機能を追加・変更するときに参照する

## 前提知識

- [Next.js](https://nextjs.org/) App Router（静的エクスポート）
- React 19 / TypeScript
- Tailwind CSS v4

セットアップ手順や機能一覧はルートの [README.md](../README.md) を参照してください。
