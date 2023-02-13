const fs = require('fs');
const { setTimeout } = require('timers/promises');
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_SECRET });

const requestDuration = 300;

const retry = (maxRetries, fn) => {
  return fn().catch(function (err) {
    if (maxRetries <= 0) {
      throw err;
    }
    return retry(maxRetries - 1, fn);
  });
};

const retrieveAndWriteBlockChildren = async (blockId) => {
  const params = { block_id: blockId };

  let results = [];

  while (true) {
    // For Notion API Requests limits
    // See https://developers.notion.com/reference/request-limits
    await setTimeout(requestDuration);

    const res = await retry(3, () => notion.blocks.children.list(params));

    results = results.concat(res.results);

    if (!res.has_more) {
      break;
    }

    params['start_cursor'] = res.next_cursor;
  }

  fs.writeFileSync(`tmp/${blockId}.json`, JSON.stringify(results));

  results.forEach(async (block) => {
    if (
      block.type === 'synced_block' &&
      block.synced_block.synced_from &&
      block.synced_block.synced_from.block_id
    ) {
      try {
        await retrieveAndWriteBlock(block.synced_block.synced_from.block_id);
      } catch (err) {
        console.log(
          `Could not retrieve the original synced_block. error: ${err}`
        );
        throw err;
      }
    } else if (block.has_children) {
      await retrieveAndWriteBlockChildren(block.id);
    }
  });
};

const retrieveAndWriteBlock = async (blockId) => {
  const params = { block_id: blockId };

  // For Notion API Requests limits
  // See https://developers.notion.com/reference/request-limits
  await setTimeout(requestDuration);

  const block = await retry(3, () => notion.blocks.retrieve(params));

  fs.writeFileSync(`tmp/${blockId}.json`, JSON.stringify(block));

  if (block.has_children) {
    await retrieveAndWriteBlockChildren(block.id);
  }
};

(async () => {
  const blockId = process.argv[2];
  await retrieveAndWriteBlockChildren(blockId);
})();
