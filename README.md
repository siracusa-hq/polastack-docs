# Polastack Docs

Polastack の公開開発者ドキュメント（[docs.polastack.com](https://docs.polastack.com)）のソースリポジトリです。
[Mintlify](https://mintlify.com) でホストされ、main へのマージで自動デプロイされます。

## 構成

```
docs.json          Mintlify 設定（ナビゲーション・テーマ）
content/           手書きドキュメント（MDX・日本語）
api-reference/     OpenAPI 仕様（自動更新される生成物。手編集禁止）
brand/             ロゴ等のブランドアセット（正本からの同期生成物。手編集禁止）
examples/          ドキュメントに掲載するコード例の実体（CI でコンパイル検証）
.vale/             表記・命名ガードレール
```

## コントリビューション

誤記の修正・説明の改善など、PR を歓迎します。

1. このリポジトリを fork してブランチを作成
2. `content/` 配下の MDX を編集（日本語・1文＝1行を基本）
3. PR を作成

PR には自動チェックが走ります。

- **Vale**: 表記・命名ルール（使用禁止の旧ドメイン表記などを機械検査）
- **リンク切れ検査**: `mint broken-links`
- **コード例の検証**: `examples/` 配下は TypeScript コンパイルが通ること

`api-reference/` 配下は自動生成物のため、直接の変更 PR は受け付けられません。

## ローカルプレビュー

```bash
npm install -g mint
mint dev
```

## ライセンスと報告

問題の報告は [Issues](https://github.com/siracusa-hq/polastack-docs/issues) へお願いします。
