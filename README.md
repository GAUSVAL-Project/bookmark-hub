# Bookmark Hub v0.3

お気に入りを階層フォルダと開閉できるフォルダツリーで整理する日本語PWAです。PCは左側、スマートフォンは上部のツリーで選択します。文字検索、HTML/JSON転送、Google Driveへの手動保存・復元、オフライン編集を利用できます。

[更新手順とフォルダツリーの使い方](UPDATE-v0.3-ja.md) をお読みください。旧データは読み込めます。新JSONはversion:2です。既存DBの名前とストアは維持しています。Google連携する全端末をv0.3に更新してください。

`public/google-config.js` に既存のOAuthクライアントIDを引き継いでください。クライアントシークレットは使用しません。実アカウントのGoogle接続はID設定後に確認が必要です。

開発: Node.js 22.12以上 / pnpm 10。`pnpm install --frozen-lockfile` → `pnpm test` → `pnpm build` → `pnpm test:e2e`。GitHub Pagesの既存Actionsと `/bookmark-hub/` の公開パスを維持しています。
