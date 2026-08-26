# polastack-docs — エージェント向け作業規約

このリポジトリは Polastack の**公開開発者ドキュメント**（docs.polastack.com・Mintlify）の正本。
読者は検討段階〜導入初期の開発者と AI エージェント。認証不要・テナント非依存の内容だけを書く。

## 絶対規約（Vale でも機械検査される）

1. **内部モジュール名の使用禁止**。公開コンテンツでは下の用語マッピング表の**公開名のみ**使う。
   `Pola` + 大文字で始まる語（例: PolaAuth）は Vale がエラーにする。
2. **死にドメインの使用禁止**: `polastack.io` / `polanest.io` / `docs.polastack.dev` は実在しない。
   実在するのは `polastack.com` 系のみ（docs は `docs.polastack.com`）。
3. **実装済みの表面だけを書く**。未公開の SDK（Python 等)・未実装の CLI コマンドは、実装が追いつくまで記載禁止。
4. **`api-reference/` と `sdk-artifacts/` は手編集禁止**。`openapi-public.json`（API 仕様)と
   `typedoc.json`（SDK リファレンス元データ)は、いずれも製品リポジトリの CI が自動 PR で更新する生成物。
5. **`brand/` は手編集禁止**。ロゴ等の正本は `Polastack_GTM/brand-assets/` で、`node scripts/sync-brand.mjs` の生成物をコミットする方式（親ワークスペース共通ルール）。直したいときは正本を直してから sync し直す。push 前に `node scripts/sync-brand.mjs --check` で乖離ゼロを確認する。
6. コード例は原則 `examples/` の実ファイルから抜粋する（`examples/` は CI でコンパイル検証される）。
   例題は共通のサンプルスキーマ世界（`projects` / `tasks`）で統一する。

## 用語マッピング表（左列の内部名は公開コンテンツで一切使わない）

| 内部名（禁止） | 公開名 |
|---|---|
| PolaAuth | Auth |
| PolaGate | Gateway |
| PolaStore | Database |
| PolaCast | Events |
| PolaBill | Billing |
| PolaNest | Hosting |
| PolaFind | Search |
| PolaWatch | Observability |
| PolaLens | Analytics |
| PolaVault | Config as Code |
| PolaKey | Developer Tools（SDK / CLI / Dashboard） |

（この表自体は執筆規約のための対応表であり、`content/` 配下には書かないこと）

## 執筆スタイル

- **一次言語は日本語**。全コンテンツを日本語で執筆する（英語追加は US GTM 起動時に判断）。
- MDX ソースは「1文＝1行」を基本とする（レビューしやすく、差分が意味単位になる）。
- ナビ構成（トップレベル 11 セクション）は `docs.json` の骨格を維持する。変更は CEO 裁定が必要。

## Git 運用

- main への直接 commit / push 禁止。ブランチ → PR → レビュー → squash マージ。
- ブランチ名: `feat/` `fix/` `docs/` `chore/` ＋ 短い英語スラッグ。
- PR 前にローカルで `vale content README.md` と `mint dev`（プレビュー確認）を通す。
