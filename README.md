# Bookmark Hub v0.2

既存のお気に入り管理・フォルダ・検索・HTML/JSON取り込み・IndexedDB・PWAを維持し、Google Identity Servicesのトークン方式とGoogle Drive appDataFolderへの手動JSON保存・復元を追加しました。

最初に [初心者向け更新手順](UPDATE-v0.2-ja.md) をお読みください。`public/google-config.js` のクライアントIDを設定してから既存のGitHub Actionsで配備できます。シークレットは使用しません。

データベースとJSON形式はversion:1のままです。自動同期はありません。Drive上書き前の別名バックアップ、JSON/Drive復元前の端末内バックアップ、接続状態・最終成功日時、期限切れ・権限・通信エラーを扱います。

開発: Node.js 22.12以上 / pnpm 10。`pnpm install --frozen-lockfile` → `pnpm test` → `pnpm build` → `pnpm test:e2e`。
