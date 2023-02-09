import cloudinary from 'cloudinary'
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from '../../server-constants'

function existsConfig(): boolean {
  return !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)
}

if (existsConfig()) {
  cloudinary.v2.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  })
}


export async function uploadImageWithKey(url: string, key: string): Promise<string> {
  if (!existsConfig() || !url || !key) {
    return ''
  }

  try {
    const res = await cloudinary.v2.uploader.upload(url, { public_id: key })
    return res.secure_url
  } catch (err) {
    console.log(err)
    return ''
  }
}

export function imageURLWithKey(key: string): string {
  if (!existsConfig() || !key) {
    return ''
  }

  return cloudinary.v2.url(key)
}
