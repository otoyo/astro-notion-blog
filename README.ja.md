[English](README.md) | 日本語

# astro-notion-blog

[![GitHub stars](https://img.shields.io/github/stars/otoyo/astro-notion-blog)](https://github.com/otoyo/astro-notion-blog/stargazers)
[![GitHub license](https://img.shields.io/github/license/otoyo/astro-notion-blog)](https://github.com/otoyo/astro-notion-blog/blob/main/LICENSE)

<img src="https://user-images.githubusercontent.com/1063435/213838069-c9654c32-ec9b-4e82-a3b5-2acbd665b16a.png" width="480">

astro-notion-blog を使えば [Notion](https://www.notion.so) で書けるブログを作ることができます。  
ブログは [Astro](https://astro.build/) を使って静的生成されるので非常に高速です。

- :rocket: ページの表示が**爆速**
- :pencil: **Notionで**ブログが書ける
- :hammer_and_wrench: ブログの見た目を**自由にカスタマイズ可能**
- :white_check_mark: **Notion 公式API**を使っているため安心

## クイックスタート

### 必要なもの

- [Notion](https://www.notion.so/)
- [Cloudflare Pages](https://pages.cloudflare.com/)

### ステップ

1. このリポジトリを**スターします** :wink:
    * スターしていただけると開発の励みになります
2. [ブログテンプレート](https://otoyo.notion.site/e2c5fa2e8660452988d6137ba57fd974?v=abe305cd8b3d467285e91a2a85f4d8de) を自分の Notion へ複製します
3. 複製したページ(データベース)の URL `https://notion.so/your-account/<ここ>?v=xxxx` を `DATABASE_ID` としてメモします

<img src="https://user-images.githubusercontent.com/1063435/213966685-3a2afed2-45c0-4ea5-8070-e634d8d648de.png" width="260">

<img src="https://user-images.githubusercontent.com/1063435/213966934-4442ce75-f88e-465f-b4f4-545d46b8eec9.png" width="600">

4. [Create an integration](https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration) からインテグレーションを作成し "Internal Integration Token" を `NOTION_API_SECRET` としてメモします
5. 複製したページを再度開き [Share a database with your integration](https://developers.notion.com/docs/create-a-notion-integration#step-2-share-a-database-with-your-integration) の手順でインテグレーションにデータベースを共有します
6. このリポジトリを自分のアカウントヘフォークします
    * フォークボタンは画面上部右側のスターの左にあります
7. [Cloudflare Pages](https://pages.cloudflare.com/) を開きサインインします
    * 言語設定を日本語に変更します

<img src="https://user-images.githubusercontent.com/1063435/213967607-338b8728-d7c9-47e4-8192-e955e3f4ce30.png" width="220">

8. プロジェクトを "Connect to Git" を選んで作成し、先ほどフォークした `<your-account>/astro-notion-blog` リポジトリを選んで "Begin setup" をクリックします
9. 「ビルドの設定」で、
    1. 「フレームワーク プリセット」でAstroを選択します
    2. 「環境変数(アドバンスド)」 を開き `NODE_VERSION`, `NOTION_API_SECRET`, `DATABASE_ID` の3つを設定します
        * `NODE_VERSION` は `v16.13.0` かそれ以上を指定します
        * 詳しくは [How to deploy a site with Git](https://docs.astro.build/en/guides/deploy/cloudflare/#how-to-deploy-a-site-with-git) をご覧ください

<img src="https://user-images.githubusercontent.com/1063435/213967111-72ea2ad1-ad3b-4629-8b65-7b25bc6ddb31.png" width="400">

<img src="https://user-images.githubusercontent.com/1063435/213967331-a1de0810-a8b4-4fae-adba-110f3f4400cc.png" width="600">

10. "Save and Deploy" をクリックし、デプロイが完了すると Notion Blog が見えるようになります

astro-notion-blog では新しい記事や変更を公開したいとき毎回デプロイが必要になります。  
Cloudflare Pages のダッシュボードから手動でデプロイするか、GitHub Action のような CI を使って定時デプロイしてください。

## デモ

[https://astro-notion-blog.pages.dev/blog](https://astro-notion-blog.pages.dev/blog)  

## カスタマイズするには

### 追加の必要要件

- Node.js v16 かそれ以上
- Git
- [Yarn](https://yarnpkg.com/getting-started)

### ステップ

1. プロジェクトルートに `.env` ファイルを作成し下記のように環境変数を書き込みます

```sh
NOTION_API_SECRET=<YOUR_NOTION_API_SECRET>
DATABASE_ID=<YOUR_DATABASE_ID>
```

2. 依存関係をインストールしローカルサーバーを起動します

```sh
yarn install
yarn dev
```

3. ブラウザで [http://localhost:3000](http://localhost:3000) を開きます
4. 開発サーバーを停止するにはターミナルで `Ctrl+C` を押します。

## ビルドの高速化(記事数が多い人向け)

<details>
  <summary>記事数が多い人向けにビルドを高速化する方法を説明します。</summary>

  ### 追加の必要要件

  - [Nx Cloud](https://nx.app/)

  ### ステップ

  1. 下記コマンドを実行し Nx Cloud のアクセストークンを生成します

  ```bash
  yarn install && yarn nx g @nrwl/nx-cloud:init
  ```

  2. プロジェクトルートにある `nx.json` を開き `accessToken` の値をメモします
  3. 下記コマンドを実行して `nx.json` から `accessToken` を削除します

  ```sh
  git checkout -- nx.json
  ```

  4. ブラウザで [Nx Cloud](https://nx.app/) を開いてアカウントを作成しサインインします
  5. "Connect a Workspace" を選択します

  <img src="https://user-images.githubusercontent.com/1063435/215296989-296836ae-42f1-42d4-b238-696cbd261722.png" width="600">

  6. "01 Check for Nx Cloud package" で "Yes, I'm using @nrwl/nx-cloud" を選択します

  <img src="https://user-images.githubusercontent.com/1063435/215296991-313ebd38-252a-40d7-9ef2-80ff33347a96.png" width="480">

  7. "03 Setup The Access Token" でメモした `accessToken` を入力し "Connect The Workspace" を選択します

  <img src="https://user-images.githubusercontent.com/1063435/215296993-3e407498-9202-435e-bd9c-e385ae4a5152.png" width="480">

  8. "View Your Workspace" を選択したら一度ターミナルに戻ります
  9. `NOTION_API_SECRET` が正しくセットされていることを確認します

  ```sh
  echo $NOTION_API_SECRET
  ```

  設定されていなければ下記のように設定します。

  ```sh
  export NOTION_API_SECRET=<YOUR_NOTION_API_SECRET>
  ```

  10. `DATABASE_ID` が Cloudflare Pages のビルド環境と同じであることを確認します

  ```sh
  echo $DATABASE_ID
  ```

  異なる場合は同じ値を設定します。

  ```sh
  export DATABASE_ID=<YOUR_DATABASE_ID>
  ```

  11. メモした `accessToken` を環境変数 `NX_CLOUD_ACCESS_TOKEN` にセットし、正しくセットされていることを確認します

  ```sh
  export NX_CLOUD_ACCESS_TOKEN=<メモしたaccessToken>
  echo $NX_CLOUD_ACCESS_TOKEN
  ```

  12. 下記コマンドを実行してキャッシュを生成します

  ```sh
  yarn cache:fetch
  ```

  13. 再度コマンドを実行しキャッシュが生成されていることを確認します(正常にキャッシュが生成されていると今回は実行が速くなります)
    * キャッシュは Notion Page の `last_edited_time` を見て以降は自動で更新されるため、この操作は再度行う必要はありません

  ```sh
  yarn cache:fetch
  ```

  14. ブラウザで Nx Cloud の Workspace を開きキャッシュの結果が "Local Cache Hit" になっていることを確認します

  <img src="https://user-images.githubusercontent.com/1063435/215297425-be6ce7cd-15be-46db-b7b0-278acde15970.png" width="480">

  <img src="https://user-images.githubusercontent.com/1063435/215297426-c6292008-3268-4eac-8073-9484fbf0cae0.png" width="480">

  15. [Cloudflare Pages](https://pages.cloudflare.com/) のダッシュボードから環境変数を開き、メモしたアクセストークンを `NX_CLOUD_ACCESS_TOKEN` として Production と Preview の両方に追加します

  <img src="https://user-images.githubusercontent.com/1063435/216225421-a880846d-3683-478d-ad29-9e678a525d41.png" width="480">

  16. ビルド設定を開きます

  <img src="https://user-images.githubusercontent.com/1063435/215303878-d674cf07-86cf-4df7-8ea7-ecd3c693de7d.png" width="480">

  17. "Build command" を下記に変更して保存します

  ```bash
  npm run build:cached
  ```

  <img src="https://user-images.githubusercontent.com/1063435/215303883-819ba65b-1dfd-4213-b4be-0e796af8d352.png" width="480">

  18. ブランチを GitHub に push してデプロイし、Nx Cloud でキャッシュの結果が "Remote Cache Hit" になっていることを確認します

  <img src="https://user-images.githubusercontent.com/1063435/215297683-450ef3e5-2938-4a37-9e4b-e9ae04d75a11.png" width="480">

</details>

### その他の情報

[wiki](https://github.com/otoyo/astro-notion-blog/wiki) をご覧ください。

## バグ報告 & 機能要望

Issue を作成してください。日本語で大丈夫です。

## 貢献

Pull requests 歓迎です。

---

astro-notion-blog は [otoyo/notion-blog](https://github.com/otoyo/notion-blog) をベースにしています。

