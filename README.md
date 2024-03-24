# astro-notion-blog
Notionで書いたコンテンツをAstroでブログ化しLolipopにデプロイする
## セットアップ
### 必要なもの
- Notion
- ロリポップレンタルサーバの契約
### ステップ
1. [ブログテンプレート](https://otoyo.notion.site/e2c5fa2e8660452988d6137ba57fd974?v=abe305cd8b3d467285e91a2a85f4d8de) を自分のNotionへ複製
2. 複製したページ(データベース)のアイコン、タイトル、説明を任意に変更
3. 複製したページ(データベース)のURL `https://notion.so/your-account/<ここ>?v=xxxx` を `DATABASE_ID` としてメモ
4. [Create an integration](https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration) からコネクトを新規作成し "Internal Integration Token" を `NOTION_API_SECRET` としてメモ
5. 複製したページを再度開き [Share a database with your integration](https://developers.notion.com/docs/create-a-notion-integration#step-2-share-a-database-with-your-integration) の手順でデータベースに上記のコネクト接続
6. [ロリポップのユーザー設定](https://user.lolipop.jp/?mode=account)を開き、ＦＴＰサーバーを`FTP_HOST`としてメモ、ＦＴＰ・WebDAVアカウントを`FTP_USERNAME`としてメモ、ＦＴＰ・WebDAVパスワードを`FTP_PASSWORD`としてメモしておく
7. GitHub の Settings > 左メニューのSecrets and variables > Actions を開く
8. New repository secret で、`DATABASE_ID`とかをNameに、めもした内容をSecretに入力し、以下のとおり合計6つのSecretを作成
- DATABASE_ID
- NOTION_API_SECRET
- FTP_HOST
- FTP_USERNAME
- FTP_PASSWORD
- FTP_REMOTE_ROOT

※FTP_REMOTE_ROOTは自分の契約したレンタルサーバーのどこにデプロイするかの設定。直下でいいならSecretの内容は半角スラッシュ「/」だけで作成(契約したレンタルサーバのアドレスにアクセスするとブログが見られるようになる)

9. GitHub の Actionsを開き、workflowを作成
```
   name: deploy

on:
  workflow_dispatch:
  schedule:
    - cron:  '00 10 * * *'
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: install packages
        run: yarn install
      - name: build
        run: yarn build
        env:
          NOTION_API_SECRET: ${{ secrets.NOTION_API_SECRET }}
          DATABASE_ID: ${{ secrets.DATABASE_ID }}
      - name: Deploy via FTP
        uses: SamKirkland/FTP-Deploy-Action@4.3.0
        with:
          server: ${{ secrets.FTP_HOST }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          server-dir: ${{ secrets.FTP_REMOTE_ROOT }}
          local-dir: ./dist/
```

※astro-notion-blog では新しい記事や変更を公開したいとき毎回デプロイが必要。  

## :hammer_and_pick: カスタマイズするには
### 追加の必要要件
- Node.js v18.14.1 かそれ以上
- Git
### ステップ
1. 下記コマンドを実行して秘密情報を環境変数に設定
```sh
export NOTION_API_SECRET=<YOUR_NOTION_API_SECRET>
export DATABASE_ID=<YOUR_DATABASE_ID>
```
2. 依存関係をインストールしローカルサーバーを起動
```sh
npm install
npm run dev
```
3. ブラウザで [http://localhost:4321](http://localhost:4321) を開く
4. 開発サーバーを停止するにはターミナルで `Ctrl+C`

### その他の情報
[wiki](https://github.com/otoyo/astro-notion-blog/wiki)
[初心者がastro-notion-blogをカスタマイズしてみた【具体例多数】](https://rakuraku-engineer.com/posts/anb-custom/)
[【astro-notion-blog】右メニューに目次を追加してみた](https://varubogu.com/posts/astro-notion-blog-add-headline/)
[astro-notion-blogカスタマイズメモ](https://suzu-mono-gram.com/blog/astro-notion-blog-memo/)

## :two_hearts:
astro-notion-blogの開発者さまを支援するには[![GitHub sponsors](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86)](https://github.com/sponsors/otoyo)
