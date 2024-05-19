import React from 'react';

import {
  TwitterShareButton, XIcon,
  FacebookShareButton, FacebookIcon, FacebookShareCount,
  HatenaShareButton, HatenaIcon, HatenaShareCount,
} from 'react-share';

export const SocialShareButtons: React.FC<SocialShareArgs> = (props) => {
  const { url, title } = props
  return (
    <>
      <HatenaShareButton url={url} className="mx-2 flex-col">
        <HatenaIcon round size={40} />
        <HatenaShareCount url={url} className="text-blue-600 font-semibold" />
      </HatenaShareButton>
      <FacebookShareButton url={url} className="mx-2 flex-col">
        <FacebookIcon round size={40} />
        <FacebookShareCount url={url} className="text-blue-600 font-semibold" />
      </FacebookShareButton>
      <TwitterShareButton url={url} title={title} className="mx-2">
        <XIcon size={40} round />
      </TwitterShareButton>
    </>
  )
}