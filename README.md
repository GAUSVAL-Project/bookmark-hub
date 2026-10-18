# Bookmark Hub（初期試作版 v0.1）

Windows 11 と iPhone 向けの日本語PWAです。個人のお気に入りを端末内で管理します。

## できること

- お気に入りの登録・編集・削除、タイトル／URL／メモの検索、並び替え
- フォルダ作成・名前変更・削除（フォルダ削除時は中身を未分類へ移動）
- IndexedDBへの保存、再読み込み後の復元
- ブラウザから書き出したHTMLブックマークの追加インポート
- JSONバックアップの書き出し・復元（復元は全件置き換え）
- スマートフォン対応、PWAインストール、アプリ画面のオフライン起動・編集

**OneDrive・Microsoft Graph・MSALの同期とログインは未実装です。** WindowsとiPhoneのデータは自動共有されません。JSONで手動移行できます。外部サイトの内容はオフライン保存しません。

## Windows初心者向け：GitHubへアップロードする

リポジトリ名は **bookmark-hub**、既定ブランチは **main** を想定しています。GitHub PagesのSourceは、設定済みの **GitHub Actions** をそのまま使用します。公開時にパソコンへNode.jsを入れる必要はありません。

1. `bookmark-hub-source.zip` をダウンロードします。エクスプローラーでZIPを右クリックし「すべて展開」を選びます。ZIPの中身を直接編集しないでください。
2. 展開先の `bookmark-hub` フォルダを開きます。`index.html`、`package.json`、`src`、`public`、`.github`、`pnpm-lock.yaml` などが見える場所です。
3. ブラウザで自分のGitHubの **bookmark-hub** リポジトリを開きます。上部のブランチ選択が **main** であることを確認します。
4. **Add file（ファイルを追加）→ Upload files（ファイルをアップロード）** を選びます。
5. 手順2のフォルダの「中身」をすべて選び、アップロード欄へドラッグします。`bookmark-hub` フォルダそのものやZIPをアップロードしないでください。リポジトリの一番上に `package.json` が置かれる必要があります。既存READMEは同名ファイルで更新されます。
6. **重要：`.github/workflows/deploy.yml` がアップロード一覧にあるか確認します。** Windowsでは「表示 → 表示 → 隠しファイル」をオンにすると見つけやすくなります。ドットで始まるフォルダがブラウザのアップロードで省かれる場合は、下の「workflowだけ手動作成」を行ってください。
7. 下部の **Commit changes（変更をコミット）** を押し、mainへ保存します。新しいブランチを選んだ場合はmainへ取り込むまで公開されません。
8. リポジトリの **Actions** タブで **Deploy Bookmark Hub to Pages** を開き、build と deploy の両方が緑色になるのを待ちます。
9. **Settings → Pages** に表示された公開URL、またはActionsのdeploy結果のURLを開きます。通常は `https://あなたのユーザー名.github.io/bookmark-hub/` です。初回は反映まで数分かかることがあります。

### workflowだけ手動作成する場合

リポジトリで **Add file → Create new file** を開き、ファイル名に `.github/workflows/deploy.yml` と入力します。展開した同名ファイルをメモ帳で開き、中身をすべてコピーしてGitHubの編集欄へ貼り付け、mainへコミットします。これで隠しフォルダのアップロード漏れを補えます。Actions自体が無効な場合はリポジトリのActions設定を有効にしてください。

### よくある問題

- **Actionsに何も出ない**：`.github/workflows/deploy.yml` とmainへのコミットを確認。Actionsの「Run workflow」でも実行可能です。既存のPages用workflowがある場合は、競合しないよう本ファイルのworkflowへ統一してください。
- **白い画面／404**：リポジトリ名が `bookmark-hub` か、ファイルが余分なサブフォルダの中に入っていないか確認。`vite.config.js` の `base` は `/bookmark-hub/` です。
- **deployが権限エラー**：Settings → Pages のSourceがGitHub Actionsか確認。組織の制限、Pagesの利用可否、環境の承認待ちも確認してください。
- **古い画面のまま**：開いているBookmark Hubのタブとアプリをすべて閉じて開き直してください。更新チェックにはオンライン接続が必要です。ブラウザデータを消すとお気に入りも失うため、先にJSONを書き出してください。
- `dist` はGitHubにアップロード不要です。Actionsがソースから作ります。`node_modules` もアップロードしません。

## アプリとして使う

### Windows 11

EdgeまたはChromeで公開URLを開き、ブラウザのアドレスバーやメニューにあるアプリのインストール機能を使用します。対応ブラウザではアプリ内にもインストールボタンが表示されます。表示されなくてもWebサイトとして利用できます。

### iPhone

Safariで公開URLを開き、共有メニューから「ホーム画面に追加」を選びます。OSの版によりメニュー表記は異なります。Safariまたは追加したアプリで一度オンライン起動し、「オフライン利用の準備ができました」の表示を確認してください。実機での最終確認は下の検証記録を参照してください。

## 保存とバックアップ

データはアクセス中のブラウザ・オリジンのIndexedDBに保存します。サーバーへアップロードしません。端末、ブラウザ、別のサイトアドレスごとに保存場所が異なります。ホーム画面アプリとSafariの保存領域が同じとは仮定しないでください。プライベートブラウズは使用せず、定期的に **JSONを書き出す** を押して保存を確認してください。OSによる保存領域の回収、ブラウザデータ消去、端末故障でデータを失う可能性があります。初期試作版のため複数タブの同時編集は避けてください。

JSON復元はスキーマとURLを検査してから確認画面を表示し、全データを置き換えます。キャンセル時は変更しません。復元前に現在のJSONを書き出してください。他端末に移す場合も、JSONを手動転送して復元します。

HTML取り込みはEdge／Chrome／Safari等の一般的なNetscape HTML形式を想定します。親子フォルダは「親 / 子」という平坦なフォルダ名になります。同名フォルダをまとめ、正規化後のURL完全一致で重複を除外します。HTTP/HTTPS以外のリンクを除外します。HTML内のスクリプトや画像は挿入しません。ファイル上限20MB、最大50,000件のお気に入り・10,000フォルダです。文字コードはUTF-8を想定します。

公開されるのはアプリのソースと画面です。お気に入りのデータはリポジトリに入れないでください。登録リンクは新しいタブで開きます。リンクを開いた先への通信は発生します。ファビコン取得や解析サービスへの送信は行いません。

## 開発者向け

Node.js 22.12以上（22 LTS推奨）とpnpm 10を用意します。

```powershell
corepack enable
corepack prepare pnpm@10 --activate
pnpm install --frozen-lockfile
pnpm dev
```

表示されたローカルURLの `/bookmark-hub/` を開きます。HTMLファイルのダブルクリックでは動きません。

```powershell
pnpm test
pnpm build
pnpm preview
pnpm test:e2e
```

ブラウザテストはインストール済みChromeを使います。Edgeで実行する場合はPowerShellで `$env:BROWSER_CHANNEL='msedge'` を設定します。開発モードではService Workerを登録しません。PWAの検証はbuild後のpreviewで行います。

## モジュール構成と今後の同期

- `src/model.js`：データ構造・検証・検索・インポート結合
- `src/storage/indexeddb.js`：非同期repository（load/save、保存完了をトランザクションで確認）
- `src/transfer.js`：HTML読み込みとJSON書き出し
- `src/sync/provider.js`：同期プロバイダーの境界。`available: false`、sync呼び出しは明示的にエラー
- `src/main.js` / `src/style.css`：日本語UI
- `scripts/generate-sw.mjs`：ビルド成果物のハッシュからService Workerを生成
- `public/manifest.webmanifest` / `public/icons`：PWAの設定とローカル画像
- `.github/workflows/deploy.yml`：テスト・ビルド・Pages公開

将来はMSAL認証・Microsoft Graphの個人用OneDrive保存アダプターを追加し、repositoryとsyncProviderを接続します。アプリ登録、権限・同意、競合解決、削除履歴、エラー再試行、スキーマ移行、トークンの安全な扱いの設計と実装が別途必要です。現在はMicrosoftのアプリIDも認証ライブラリも含めず、同期済みという表示もしません。秘密鍵やクライアントシークレットをPWAへ埋め込まないでください。

Service Workerはこのアプリの配下のビルド済みファイルだけを事前保存します。新しい版は既存タブをすべて閉じた後で有効になります。JSONやIndexedDBはService Workerのキャッシュ更新で削除しません。リポジトリ名や公開パスを変えた場合は `base` を変更し、保存データの手動移行を行ってください。

## 検証

実行結果・未実施事項は同梱の `VERIFICATION.md` に記録しています。

## 公式資料

- [Vite: GitHub Pagesへの配置](https://vite.dev/guide/static-deploy.html#github-pages)
- [GitHub: Pagesのカスタムworkflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## ライセンス

この試作版のソースはMIT Licenseです（`LICENSE`）。依存パッケージには各パッケージのライセンスが適用されます。
