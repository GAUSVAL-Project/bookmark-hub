# Bookmark Hub Ver.0.2 更新手順（初めての方向け）

## 更新前に必ず行うこと

1. 今まで使っていたBookmark Hubを、いつものブラウザ・いつものURLで開きます。
2. 「JSONを書き出す」を押し、ダウンロードしたJSONを安全な場所に保存します。
3. Bookmark Hubを開いている他のタブやインストール済みアプリを閉じます。

データベース名 `bookmark-hub`、バージョン1、`data` ストア、`state` キーとJSONのversion:1を維持しています。Ver.0.2になってもJSONのversionは1です。同じサイトのオリジン・同じブラウザプロファイルで使う限り、既存のIndexedDBを読み込みます。サイトデータやブラウザ履歴の保存データを削除しないでください。別のブラウザ・端末・ドメインには自動移行されません。

## GoogleクライアントIDを設定する

1. Google Cloudでプロジェクト `bookmark-hub-512014` を選び、Google Auth Platform → クライアントから作成済みの「ウェブ アプリケーション」を開きます。
2. 「承認済みのJavaScript生成元」に `https://あなたのGitHubユーザー名.github.io` を登録します。末尾の `/bookmark-hub/` は含めません。独自ドメインならその `https://ドメイン名` を登録します。このトークン方式でリダイレクトURIの追加は不要です。
3. クライアントID（末尾が `.apps.googleusercontent.com`）をコピーします。クライアントシークレットは使いません。ダウンロードした認証情報JSONをリポジトリに入れないでください。
4. ソースZIPを「すべて展開」し、`public/google-config.js` をメモ帳などで開きます。
5. `YOUR_CLIENT_ID.apps.googleusercontent.com` だけを実際のIDに置き換えます。前後のシングルクォートは残して保存します。

例（この例の文字列は使えません）:

```js
window.BOOKMARK_HUB_GOOGLE_CLIENT_ID = '実際のID.apps.googleusercontent.com';
```

クライアントIDは公開ウェブアプリの識別子なので配信ファイルから見えることを前提とします。Google側で承認済み生成元を限定してください。アクセストークン・シークレット・個人データは設定ファイルやGitHubに書きません。Drive API有効化、drive.appdata、テストユーザーは設定済みとのことなので、その設定を維持します。

## GitHub Pagesを更新する（推奨：ソースZIP）

1. 既存の `bookmark-hub` リポジトリを開き、ブランチが `main` であることを確認します。
2. Add file → Upload filesで、展開したソースフォルダの「中身」をアップロードします。フォルダごとやZIP自体をアップロードしないでください。リポジトリ直下に `package.json`、`src`、`public` がある状態にします。
3. `.github/workflows/deploy.yml` も含まれることを確認します。表示されない場合は既存の同名ワークフローを残し、このZIPの内容と一致させます。`node_modules`、`dist`、テスト実行結果はアップロード不要です。
4. Commit changesを押します。Settings → Pages → Sourceは GitHub Actions にします。
5. Actionsの「Deploy Bookmark Hub to Pages」でbuild・deployが両方成功するのを待ちます。
6. すべてのBookmark Hub画面を閉じ、いつものURLで開き直します。Service Workerが旧版を使用していた場合、もう一度全画面を閉じて開き直します。v0.2表示を確認します。サイトデータの削除はしません。
7. 以前のお気に入りが残っていること、追加・編集・検索ができることを確認します。

既存のリポジトリ名が `bookmark-hub` と違う場合は、`vite.config.js` のbaseと `public/manifest.webmanifest` のURL設定を既存の公開パスに合わせてからビルドしてください。既存URLの維持を優先します。

## ビルド済みZIPを使う場合

ビルド済みZIPは静的ファイル専用の配備先に展開できます。想定URLは `/bookmark-hub/` です。ZIP内の `google-config.js` にIDを設定します。通常のmainブランチのソースをビルド済みファイルで置き換えないでください。既存Actions構成では上記ソースZIPを使う方が簡単です。

ビルド後にconfigだけ変更した場合は、Service Workerの版も更新するためソース側の `public/google-config.js` へ同じIDを設定し、再ビルドしたdistを配備するのが確実です。ID設定後に初めて公開する場合はそのまま利用できます。

## 使い方：端末からDriveへ保存

1. オンラインで「Googleに接続」を押します。登録済みのテストユーザーを選び、アプリデータへのアクセスを許可します。
2. 「接続中」と表示されたら「Driveへ保存」を押します。
3. 確認画面を読み、実行します。既存のDriveデータがあれば、まず別名のJSONバックアップをDriveに作成してから上書きします。バックアップに失敗したら上書きしません。
4. 成功メッセージと最終同期日時を確認します。

Driveには `bookmark-hub.json` がappDataFolderに保存されます。通常の「マイドライブ」には表示されません。上書き前ファイルは `bookmark-hub-before-upload-日時.json` として保持し、自動削除しません。この版の画面で復元対象になるのは最新の `bookmark-hub.json` のみです。過去のDriveバックアップ選択機能はありません。独立したJSON書き出しも継続してください。

## 別端末でDriveから復元

1. 同じアプリを開き、同じGoogleアカウントに接続します。
2. 「Driveから復元」を押します。内容を検証した後、件数のある確認画面が出ます。
3. 実行すると、この端末の全データを置き換えます。統合ではありません。直前のデータはIndexedDBへ原子的に保存します。保存に失敗すると置き換えません。
4. 戻したい場合は「復元前バックアップを書き出す」でJSONを保存し、「JSONから復元」を使います。端末の復元前バックアップは直近1回分で、次のJSON/Drive復元で更新されます。

自動同期はありません。PCで保存→iPhoneで復元、iPhoneで変更後保存→PCで復元、という順で使います。同時編集は避けてください。Driveの上書きに他端末間の排他制御はないため、操作が重なると最後の保存が優先されます。最終同期日時はこのブラウザで保存または復元が成功した時刻であり、他端末の変更検知ではありません。

## 接続表示とエラー

- 接続状態はDrive用アクセストークンの有効状態です。メールアドレスは取得しません。再読み込み・期限切れで未接続になります。再度ボタンを押して接続します。
- 「切断」はこの画面のトークンを破棄します。Googleアカウント全体のログアウトや許可取り消しではありません。許可取り消しはGoogleアカウントの接続管理から行います。
- ポップアップを許可してください。認証を閉じた・拒否した場合はデータを変更しません。
- `origin_mismatch`：Googleの承認済み生成元を確認します。反映に時間がかかる場合があります。
- `access_denied`／403：テストユーザー、drive.appdata、Drive API、容量を確認します。
- 401／期限切れ：再接続します。オフラインでは既存の端末内機能だけを使います。
- 通信切断・タイムアウト：保存がDrive側で完了している可能性があります。自動再送はしません。再操作前に別端末の編集を止め、内容を確認してください。
- JSON不正、未対応バージョン、20MB超、同名Driveファイル複数の場合は処理を止めます。端末データは維持します。
- 空のライブラリで保存すればDriveも空になります。必ず件数と操作内容を確認してください。

## 開発者向け

Node.js 22.12以上、pnpm 10を使用します。

```
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm test:e2e
```

テストはChromeを使用します。`BROWSER_CHANNEL=msedge` でEdgeに変更できます。`pnpm-workspace.yaml` では既存のesbuildビルドを明示的に許可しています。クライアントシークレット・サーバー・APIキーは不要です。

仕様参照：
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/drive/api/guides/appdata
