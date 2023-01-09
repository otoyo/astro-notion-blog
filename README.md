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
3. Note the part of URL `https://notion.so/your-account/<HERE>?v=xxxx` as `DATABASE_ID`
    * ex) `158bd90116004cd19aca26ad88cb5c07`
        * :warning: **CAUTION:** `?v=NOT_THIS_VALUE`. Use ahead strings.
    * URL is retrieved from "Copy link"
4. [Create an integration](https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration) and note "Internal Integration Token" as `NOTION_API_SECRET`
5. [Share a database with your integration](https://developers.notion.com/docs/create-a-notion-integration#step-2-share-a-database-with-your-integration) at the Notion database page
6. Fork this repository into your account
    * The Fork button is at the top of the page and the left of the Star
7. Go to [Cloudflare Pages](https://pages.cloudflare.com/) and sign in
8. Create new project with "Connect to Git" with your forked repository `<your-account>/astro-notion-blog`, then click "Begin setup"
9. In build settings, open "Environment Variables" and set `NODE_VERSION`, `NOTION_API_SECRET` and `DATABASE_ID`
    * `NODE_VERSION` is `v16.13.0` or higher
    * [How to deploy a site with Git](https://docs.astro.build/en/guides/deploy/cloudflare/#how-to-deploy-a-site-with-git) is helpful

<img src="https://user-images.githubusercontent.com/1063435/213854918-88028226-dc19-457c-9c1c-b68498b3a40a.png" width="600">

Please add `NOTION_API_SECRET` and `DATABASE_ID` as a encrypted value, and add `NODE_VERSION` with `v16.13.0` or higher to Production and Preview.

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

### For more information

See [wiki](https://github.com/otoyo/astro-notion-blog/wiki).

## Bug reports & feature requests

Please create an issue. **Both in English and in Japanese are OK.** :wink:

## Contribution

Pull requests are welcome.

---

astro-notion-blog is based [otoyo/notion-blog](https://github.com/otoyo/notion-blog)
