English | [日本語](README.ja.md)

# astro-notion-blog

[![GitHub stars](https://img.shields.io/github/stars/otoyo/astro-notion-blog)](https://github.com/otoyo/astro-notion-blog/stargazers)
[![GitHub license](https://img.shields.io/github/license/otoyo/astro-notion-blog)](https://github.com/otoyo/astro-notion-blog/blob/main/LICENSE)

<img src="https://user-images.githubusercontent.com/1063435/213838069-c9654c32-ec9b-4e82-a3b5-2acbd665b16a.png" width="480">

astro-notion-blog enables you to create a blog using [Notion](https://www.notion.so/) and generates it statically, resulting in lightning-fast page views.

- :rocket: **Lightning-fast** page views
- :pencil: With the ability to write blog content in **Notion**
- :hammer_and_wrench: **Customize** your site's appearance to your liking
- :white_check_mark: Take advantage of **the official Notion APIs**

## Screenshots

<img src="https://user-images.githubusercontent.com/1063435/223610351-58d157cc-fe50-4ff3-be0c-5373bec07589.png" width="600">

## Demo

[https://astro-notion-blog.pages.dev](https://astro-notion-blog.pages.dev)

## Quick Start

### Requirements

- [Notion](https://www.notion.so/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- Git

### Steps

1. If you enjoy using this repo, **don't forget to give it a star!** :wink:
   - This is very motivating!
2. Simply duplicate [the blog template](https://otoyo.notion.site/e2c5fa2e8660452988d6137ba57fd974?v=abe305cd8b3d467285e91a2a85f4d8de) into your Notion workspace.
3. Once you've duplicated the page (database), customize it to your liking by changing the icon, title, and description.

<img src="https://user-images.githubusercontent.com/1063435/223611374-86d7172c-9cda-477b-b8a3-dc724fa7ccf4.png" width="600">

4. For future reference, identify the `DATABASE_ID` by noting the portion of the duplicated page (database) URL that appears as https://notion.so/your-account/<HERE>?v=xxxx.

<img src="https://user-images.githubusercontent.com/1063435/213966685-3a2afed2-45c0-4ea5-8070-e634d8d648de.png" width="260">

<img src="https://user-images.githubusercontent.com/1063435/213966888-c3f1f741-62ac-42f3-9af2-94ab375b5676.png" width="600">

5. [Create an integration](https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration) and note "Internal Integration Token" as `NOTION_API_SECRET`
6. To integrate your application with Notion, [share a database with your integration](https://developers.notion.com/docs/create-a-notion-integration#step-2-share-a-database-with-your-integration).
7. To make a copy of this repository in your own account, fork it by clicking on the 'Fork' button in the top-right corner of the repository page.
8. Go to [Cloudflare Pages](https://pages.cloudflare.com/) and sign in
9. Create new project with "Connect to Git" with your forked repository `<your-account>/astro-notion-blog`, then click "Begin setup"
10. In "Build settings" section,
    1. Select "Astro" as "Framework preset"
    2. Open "Environment Variables (advanced)" and set `NODE_VERSION`, `NOTION_API_SECRET` and `DATABASE_ID`
       - `NODE_VERSION` is `v16.13.0` or higher
       - [How to deploy a site with Git](https://docs.astro.build/en/guides/deploy/cloudflare/#how-to-deploy-a-site-with-git) is helpful

<img src="https://user-images.githubusercontent.com/1063435/213967061-06f488fe-0b42-40a5-8f19-ac441f0168ff.png" width="400">

<img src="https://user-images.githubusercontent.com/1063435/213967200-6d497b44-f26f-4ad7-8cf9-1780cf5cd2e0.png" width="600">

11. After clicking the 'Save and Deploy' button, your Notion Blog will be published once the deployment process is complete.

Please note that the astro-notion-blog requires manual deployment every time you publish a new post or make updates. You can deploy manually from the Cloudflare Pages dashboard or set up a scheduled deploy using CI tools such as GitHub Actions.

## How to customize

### Additional requirements

- Node.js v16 or higher
- [Yarn](https://yarnpkg.com/getting-started)

### Steps

1. To set your secrets as environment variables, run the following commands in your terminal:

```sh
export NOTION_API_SECRET=<YOUR_NOTION_API_SECRET>
export DATABASE_ID=<YOUR_DATABASE_ID>
```

2. Install dependencies and start local server

```sh
yarn install
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser
4. Press `Ctrl+C` in the terminal to stop

### For more information

See [wiki](https://github.com/otoyo/astro-notion-blog/wiki).

## Bug reports & feature requests

To report an issue, please create a new Issue. You can use **either English or Japanese** to describe the issue. :wink:

## :bird: Twitter community

In our community, you have the opportunity to both support and be supported by other members.

- [astro-notion-blog](https://twitter.com/i/communities/1618017732653613056)

## Contribution

We welcome pull requests from anyone who wants to contribute to our project. Your contributions are greatly appreciated!

---

astro-notion-blog is based [otoyo/notion-blog](https://github.com/otoyo/notion-blog)
