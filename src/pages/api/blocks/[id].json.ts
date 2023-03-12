import { getBlock } from '../../../lib/notion/client'

export const config = {
  runtime: 'serverless',
}

export async function get({ params }: { params: { id: string } }) {
  const blockId: string = params.id
  const block = await getBlock(blockId)

  if (block.Type !== 'image') {
    return new Response(null, { status: 400, statusText: 'Invalid block type' })
  }

  return new Response(JSON.stringify(block), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
