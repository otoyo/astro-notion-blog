import fetch, { Response, AbortError } from 'node-fetch'
import { REQUEST_TIMEOUT_MS } from '../server-constants'
import type {
  Post,
  Heading1,
  Heading2,
  Heading3,
  RichText,
} from './interfaces'

export const fetchImageAsDataURI = async (url: string): Promise<string> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => { controller.abort() }, REQUEST_TIMEOUT_MS)

  let res!: Response
  try {
    res = await fetch(url, { signal: controller.signal }) as Response
  } catch (err) {
    if (err instanceof AbortError) {
      console.log('Image fetch request was aborted');
      return Promise.resolve('')
    }
  } finally {
    clearTimeout(timeout)
  }

  if (!res || !res.body) {
    return Promise.resolve('')
  }
  const contentType = res.headers.get('Content-Type')
  const stream = res.body

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(`data:${contentType};base64,${Buffer.concat(chunks).toString('base64')}`))
  })
}

export const buildURLToHTMLMap = async (urls: URL[]): Promise<{[key: string]: string}> => {
  const htmls: string[] = await Promise.all(urls.map(async (url: URL) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => { controller.abort() }, REQUEST_TIMEOUT_MS)

    return fetch(url.toString(), { signal: controller.signal })
      .then(res => {
        return res.text()
      })
      .catch(() => {
        console.log('Request was aborted')
        return ''
      })
      .finally(() => {
        clearTimeout(timeout)
      })
  }))

  return urls.reduce((acc: {[key: string]: string}, url, i) => {
    if (htmls[i]) {
      acc[url.toString()] = htmls[i]
    }
    return acc
  }, {})
}

export const buildURLToImageMap = async (urls: URL[]): Promise<{[key: string]: string}> => {
  const images: string[] = await Promise.all(urls.map(async (url: URL) => {
    return fetchImageAsDataURI(url.toString())
  }))

  return urls.reduce((acc: {[key: string]: string}, url, i) => {
    if (images[i]) {
      acc[url.toString()] = images[i]
    }
    return acc
  }, {})
}

export const buildPostFeaturedImageURLs = (posts: Post[]): (URL | null)[] => {
  return posts
    .map((p: Post) => {
      if (!p.FeaturedImage) {
        return null
      }

      let url!: URL
      try {
        url = new URL(p.FeaturedImage)
      } catch (err) {
        console.log(err)
        return null
      }
      return url
    })
}

export const getPostLink = (slug: string) => {
  return `/blog/${slug}`
}

export const getTagLink = (tag: string) => {
  return `/blog/tag/${encodeURIComponent(tag)}`
}

export const getPageLink = (page: number, tag: string) => {
  if (page === 1) {
    return tag ? getTagLink(tag) : '/blog'
  }
  return tag ? `/blog/tag/${encodeURIComponent(tag)}/page/${page.toString()}` : `/blog/page/${page.toString()}`
}

export const getDateStr = (date: string) => {
  const dt = new Date(date)

  if(date.indexOf('T') !== -1){
    // Consider timezone
    const elements = date.split('T')[1].split(/([+-])/)
    if (elements.length > 1) {
      const diff = parseInt(`${elements[1]}${elements[2]}`, 10)
      dt.setHours(dt.getHours() + diff)
    }
  }

  const y = dt.getFullYear()
  const m = ('00' + (dt.getMonth() + 1)).slice(-2)
  const d = ('00' + dt.getDate()).slice(-2)
  return y + '-' + m + '-' + d
}

export const buildHeadingId = (heading: Heading1 | Heading2 | Heading3) => {
  return heading.RichTexts.map((richText: RichText) => {
    if (!richText.Text) {
      return ''
    }
    return richText.Text.Content
  }).join().trim()
}

export const isTweetURL = (url: URL): boolean => {
  return /https:\/\/twitter.com\/[^/]+\/status\/[\d]+/.test(url.toString())
}

export const isYouTubeURL = (url: URL): boolean => {
  if (['www.youtube.com', 'youtu.be'].includes(url.hostname)) {
    return true
  }
  return false
}

// Supported URL
//
// - http://youtu.be/0zM3nApSvMg
// - http://www.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index
// - http://www.youtube.com/watch?v=0zM3nApSvMg#t=0m10s
// - http://www.youtube.com/watch?v=0zM3nApSvMg
// - http://www.youtube.com/v/0zM3nApSvMg?fs=1&amp;hl=en_US&amp;rel=0
// - http://www.youtube.com/embed/0zM3nApSvMg?rel=0
export const parseYouTubeVideoId = (url: URL): string => {
  if (!isYouTubeURL(url)) return ''

  if (url.hostname === 'youtu.be') {
    return url.pathname.split('/')[1]
  } else if (url.pathname === '/watch') {
    return url.searchParams.get('v') || ''
  } else {
    const elements = url.pathname.split('/')

    if (elements.length < 2) return ''

    if (elements[1] === 'v' || elements[1] === 'embed') {
      return elements[2]
    }
  }

  return ''
}
