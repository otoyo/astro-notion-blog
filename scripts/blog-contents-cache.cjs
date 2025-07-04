const { exec } = require('child_process');
const { Client } = require('@notionhq/client');
const cliProgress = require('cli-progress');
const { PromisePool } = require('@supercharge/promise-pool');

const notion = new Client({ auth: process.env.NOTION_API_SECRET });

const getAllPages = async () => {
  const params = {
    database_id: process.env.DATABASE_ID,
    filter: {
      and: [
        {
          property: 'Published',
          checkbox: {
            equals: true,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_before: new Date().toISOString(),
          },
        },
      ],
    },
  };

  let results = [];
  while (true) {
    const res = await notion.databases.query(params);

    results = results.concat(res.results);

    if (!res.has_more) {
      break;
    }

    params['start_cursor'] = res.next_cursor;
  }

  const pages = results.map((result) => {
    return {
      id: result.id,
      last_edited_time: result.last_edited_time,
      slug: result.properties.Slug.rich_text
        ? result.properties.Slug.rich_text[0].plain_text
        : '',
    };
  });

  return pages;
};

(async () => {
  const pages = await getAllPages();

  const concurrency = parseInt(process.env.CACHE_CONCURRENCY || '4', 10);

  const progressBar = new cliProgress.SingleBar(
    { stopOnComplete: true },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(pages.length, 0);

  let errorCount = 0;
  const errors = [];

  await PromisePool.withConcurrency(concurrency)
    .for(pages)
    .process(async (page) => {
      return new Promise((resolve) => {
        const command = `NX_BRANCH=main npx nx run astro-notion-blog:_fetch-notion-blocks ${page.id} ${page.last_edited_time}`;
        const options = { timeout: 120000 };

        exec(command, options, (err, stdout, stderr) => {
          if (err) {
            errorCount++;
            errors.push({ page: page.slug || page.id, error: err.message });
            console.error(
              `Error processing ${page.slug || page.id}: ${err.message}`
            );
          }
          progressBar.increment();
          return resolve();
        });
      });
    });

  console.log(
    `\nキャッシュ処理完了: ${pages.length - errorCount}/${pages.length} 成功`
  );
  if (errorCount > 0) {
    console.log(`エラー数: ${errorCount}`);
    console.log('エラー詳細:');
    errors.forEach(({ page, error }) => {
      console.log(`  - ${page}: ${error}`);
    });
  }
})();
