import React from 'react';

import {
  TwitterShareButton, XIcon,
  FacebookShareButton, FacebookIcon, FacebookShareCount,
  HatenaShareButton, HatenaIcon, HatenaShareCount,
} from 'react-share';

interface Props {
  url: string;
  title: string;
}

export const SocialShareButtons: React.FC<Props> = (props) => {
  const { url, title } = props
  const buttonStyle = {
    padding: "4px",
    margin: "4px",
    alignItems: "center"
  };

  return (
    <>
      <HatenaShareButton url={url} style={buttonStyle}>
        <HatenaIcon round size={40} />
        {/*<HatenaShareCount url={url} className="text-blue-600 font-semibold" />*/}
      </HatenaShareButton>
      <FacebookShareButton url={url} style={buttonStyle}>
        <FacebookIcon round size={40} />
        {/*<FacebookShareCount url={url} className="text-blue-600 font-semibold" />*/}
      </FacebookShareButton>
      <TwitterShareButton url={url} title={title} style={buttonStyle}>
        <XIcon size={40} round />
      </TwitterShareButton>
    </>
  )
}

