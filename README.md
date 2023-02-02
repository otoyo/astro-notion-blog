English | [日本語](README.ja.md)

# astro-notion-blog

[![GitHub stars](https://img.shields.io/github/stars/otoyo/astro-notion-blog)](https://github.com/otoyo/astro-notion-blog/stargazers)
[![GitHub license](https://img.shields.io/github/license/otoyo/astro-notion-blog)](https://github.com/otoyo/astro-notion-blog/blob/main/LICENSE)

<img src="https://user-images.githubusercontent.com/1063435/213838069-c9654c32-ec9b-4e82-a3b5-2acbd665b16a.png" width="480">

astro-notion-blog helps to create a blog you can writte with [Notion](https://www.notion.so/).  
The blog is generated statically by [Astro](https://astro.build/) so very fast.

- :rocket: **Very fast** page view
- :pencil: Can write a blog **with Notion**
- :hammer_and_wrench: **Can fully customize** the site's appearance
- :white_check_mark: Using **official Notion APIs**

## Quick Start

### Requirements

- [Notion](https://www.notion.so/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- Git

### Steps

1. **Star this repo** :wink:
    * It makes me motivative!
2. Duplicate [the blog template](https://otoyo.notion.site/e2c5fa2e8660452988d6137ba57fd974?v=abe305cd8b3d467285e91a2a85f4d8de) into your Notion.
3. Note the part of the page (database) URL `https://notion.so/your-account/<HERE>?v=xxxx` as `DATABASE_ID`

<img src="https://user-images.githubusercontent.com/1063435/213966685-3a2afed2-45c0-4ea5-8070-e634d8d648de.png" width="260">

<img src="https://user-images.githubusercontent.com/1063435/213966888-c3f1f741-62ac-42f3-9af2-94ab375b5676.png" width="600">

4. [Create an integration](https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration) and note "Internal Integration Token" as `NOTION_API_SECRET`
5. [Share a database with your integration](https://developers.notion.com/docs/create-a-notion-integration#step-2-share-a-database-with-your-integration) at the Notion database page
6. Fork this repository into your account
    * The Fork button is at the top of the page and the left of the Star
7. Go to [Cloudflare Pages](https://pages.cloudflare.com/) and sign in
8. Create new project with "Connect to Git" with your forked repository `<your-account>/astro-notion-blog`, then click "Begin setup"
9. In "Build settings" section,
    1. Select "Astro" as "Framework preset"
    2. Open "Environment Variables (advanced)" and set `NODE_VERSION`, `NOTION_API_SECRET` and `DATABASE_ID`
        * `NODE_VERSION` is `v16.13.0` or higher
        * [How to deploy a site with Git](https://docs.astro.build/en/guides/deploy/cloudflare/#how-to-deploy-a-site-with-git) is helpful

<img src="https://user-images.githubusercontent.com/1063435/213967061-06f488fe-0b42-40a5-8f19-ac441f0168ff.png" width="400">

<img src="https://user-images.githubusercontent.com/1063435/213967200-6d497b44-f26f-4ad7-8cf9-1780cf5cd2e0.png" width="600">

10. Click the "Save and Deploy" button, then your Notion Blog will be published after deploy

Note that astro-notion-blog requires a deploy every time if you publish a new post or updates.  
Deploy manually from the Cloudflare Pages dashboard or use a scheduled deploy using CI like GitHub Actions.

## Demo

[https://astro-notion-blog.pages.dev/blog](https://astro-notion-blog.pages.dev/blog)  

## How to customize

### Additional requirements

- Node.js v16 or higher
- [Yarn](https://yarnpkg.com/getting-started)

### Steps

1. Create `.env` file under the project root and put your environment variables as follows:

```sh
NOTION_API_SECRET=<YOUR_NOTION_API_SECRET>
DATABASE_ID=<YOUR_DATABASE_ID>
```

2. Install dependencies and start local server.

```sh
yarn install
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.
4. Press `Ctrl+C` in the terminal to stop.

## Speed up buildings (for persons who has many posts)

<details>
  <summary>This section explains to speed up buildings for persons who has many posts.</summary>

  ### Additional requirements

  - [Nx Cloud](https://nx.app/)

  ### Steps

  1. Run the following command to generate an access token of Nx Cloud

  ```bash
  yarn install && yarn nx g @nrwl/nx-cloud:init
  ```

  2. Note the value of `accessToken` in `nx.json` in the project root
  3. Run the following command to delete `accessToken` from `nx.json`

  ```sh
  git checkout -- nx.json
  ```

  4. Open [Nx Cloud](https://nx.app/) in a browser and sign up and sign in
  5. Select "Connect a Workspace"

  <img src="https://user-images.githubusercontent.com/1063435/215296989-296836ae-42f1-42d4-b238-696cbd261722.png" width="600">

  6. Select "Yes, I'm using @nrwl/nx-cloud" at "01 Check for Nx Cloud package"

  <img src="https://user-images.githubusercontent.com/1063435/215296991-313ebd38-252a-40d7-9ef2-80ff33347a96.png" width="480">

  7. Select "Connect The Workspace" at "03 Setup The Access Token" and input the value of `accessToken` which you noted before

  <img src="https://user-images.githubusercontent.com/1063435/215296993-3e407498-9202-435e-bd9c-e385ae4a5152.png" width="480">

  8. Select "View Your Workspace" and go back to the terminal
  9. Confirm `NOTION_API_SECRET` is set to an environment variable properly

  ```sh
  echo $NOTION_API_SECRET
  ```

  If not so, set your Notion API secret.

  ```sh
  export NOTION_API_SECRET=<YOUR_NOTION_API_SECRET>
  ```

  10. Confirm `DATABASE_ID` environment variable is equivalent with the Cloudflare Pages building environment

  ```sh
  echo $DATABASE_ID
  ```

  Set the same value if it's not same.

  ```sh
  export DATABASE_ID=<YOUR_DATABASE_ID>
  ```

  11. Set the value of `accessToken` which you noted before to an environment variable as `NX_CLOUD_ACCESS_TOKEN`, and confirm it

  ```sh
  export NX_CLOUD_ACCESS_TOKEN=<The value of accessToken>
  echo $NX_CLOUD_ACCESS_TOKEN
  ```

  12. Run the following command to generate the caches

  ```sh
  yarn cache:fetch
  ```

  13. Run the command again to confirm whether the caches are generated (if the caches are generated properly, the command will be done faster than previous)
    * The caches will be updated automatically if `last_edited_time` of Notion Page are changed so you don't need to run the command after this confirmation

  ```sh
  yarn cache:fetch
  ```

  14. Open Nx Cloud in a browser and confirm whether the result is "Local Cache Hit"

  <img src="https://user-images.githubusercontent.com/1063435/215297425-be6ce7cd-15be-46db-b7b0-278acde15970.png" width="480">

  <img src="https://user-images.githubusercontent.com/1063435/215297426-c6292008-3268-4eac-8073-9484fbf0cae0.png" width="480">

  15. Open [Cloudflare Pages](https://pages.cloudflare.com/) and go to "Environment variables", set the value of `accessToken` as `NX_CLOUD_ACCESS_TOKEN` into both Production and Preview

  <img src="https://user-images.githubusercontent.com/1063435/216225421-a880846d-3683-478d-ad29-9e678a525d41.png" width="480">

  16. Go to the build settings

  <img src="https://user-images.githubusercontent.com/1063435/215303878-d674cf07-86cf-4df7-8ea7-ecd3c693de7d.png" width="480">

  17. Change "Build command" as the following and save

  ```bash
  npm run build:cached
  ```

  <img src="https://user-images.githubusercontent.com/1063435/215303883-819ba65b-1dfd-4213-b4be-0e796af8d352.png" width="480">

  18. Push the branch to GitHub to deploy, and go to Nx Cloud to confirm whether the result is "Remote Cache Hit"

  <img src="https://user-images.githubusercontent.com/1063435/215297683-450ef3e5-2938-4a37-9e4b-e9ae04d75a11.png" width="480">

</details>

### For more information

See [wiki](https://github.com/otoyo/astro-notion-blog/wiki).

## Bug reports & feature requests

Please create an issue. **Both in English and in Japanese are OK.** :wink:

## Contribution

Pull requests are welcome.

---

astro-notion-blog is based [otoyo/notion-blog](https://github.com/otoyo/notion-blog)
