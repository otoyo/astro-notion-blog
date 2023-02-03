English | [日本語](README.ja.md)

# astro-notion-blog

[![GitHub stars](https://img.shields.io/github/stars/otoyo/astro-notion-blog)](https://github.com/otoyo/astro-notion-blog/stargazers)
[![GitHub license](https://img.shields.io/github/license/otoyo/astro-notion-blog)](https://github.com/otoyo/astro-notion-blog/blob/main/LICENSE)

<img src="https://user-images.githubusercontent.com/1063435/213838069-c9654c32-ec9b-4e82-a3b5-2acbd665b16a.png" width="480">

astro-notion-blog helps to create a blog you can write with [Notion](https://www.notion.so/).  
The blog is generated statically by [Astro](https://astro.build/) so very fast.

- :rocket: **Very fast** page view
- :pencil: Can write a blog **with Notion**
- :hammer_and_wrench: **Can fully customize** the site's appearance
- :white_check_mark: Using **official Notion APIs**

## Screenshots

<img src="https://user-images.githubusercontent.com/1063435/216562042-818bc312-1941-4b5d-b281-15e0bcb6f153.png" width="480">

## Demo

[https://astro-notion-blog.pages.dev/blog](https://astro-notion-blog.pages.dev/blog)

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

### For more information

See [wiki](https://github.com/otoyo/astro-notion-blog/wiki).

## Bug reports & feature requests

Please create an issue. **Both in English and in Japanese are OK.** :wink:

## :bird: Twitter community

You can support other members and/or can be supported by other members.

- [astro-notion-blog](https://twitter.com/i/communities/1618017732653613056)

## Contribution

Pull requests are welcome.

---

astro-notion-blog is based [otoyo/notion-blog](https://github.com/otoyo/notion-blog)
