import type { APIRoute, APIContext } from 'astro'
import { getPostBySlug, incrementLikes } from '../../lib/notion/client'

export const get: APIRoute = async ({ request }: APIContext) => {
  const url = new URL(request.url)
  const params = new URLSearchParams(url.search)
  const slug = params.get('slug')

  if (!slug) {
    return new Response(null, { status: 400 })
  }

  const post = await getPostBySlug(slug)

  if (!post) {
    return new Response(null, { status: 404 })
  }

  return new Response(JSON.stringify({ likes: post.Like }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const post: APIRoute = async ({ request }: APIContext) => {
  const url = new URL(request.url)
  const params = new URLSearchParams(url.search)
  const slug = params.get('slug')

  if (!slug) {
    return new Response(null, { status: 400 })
  }

  const post = await getPostBySlug(slug)

  if (!post) {
    return new Response(null, { status: 404 })
  }

  const updatedPost = await incrementLikes(post)

  if (!updatedPost) {
    return new Response(null, { status: 404 })
  }

  return new Response(JSON.stringify({ likes: updatedPost.Like }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
