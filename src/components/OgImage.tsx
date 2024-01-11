import satori from 'satori';
import sharp from 'sharp';

// サイト名
const site = 'MEGUMI SHIMABUKURO';
const url = 'https://blog.shimabukuromeg.dev/';

// ユーザー
const user = 'シマブクロメグミ';
const x = '@20092014';

export async function getOgImage(title: string) {
    const fontData = (await getFontData()) as ArrayBuffer;
    const svg = await satori(
        <div
            style={{
                width: '1200px',
                height: '630px',
                backgroundColor: '#52ACFF',
                backgroundImage: 'linear-gradient(225deg, #52ACFF 34%, #FFE32C 100%)',
                display: 'flex',
                flexWrap: 'nowrap',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    width: '1140px',
                    height: '567px',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '8px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                }}
            >
                <div
                    style={{
                        width: '960px',
                        height: '80%',
                        fontSize: '64px',
                        color: '#222',
                        textShadow: '2px 2px 3px #d5d5d5',
                        alignItems: 'center',
                    }}
                >
                    {title}
                </div>
                <div
                    style={{
                        display: 'flex',
                        width: '960px',
                        paddingBottom: '4px',
                        height: '40px',
                        fontSize: '2rem',
                    }}
                >
                    {user + x}
                </div>
                <div
                    style={{
                        flexBasis: '54%',
                        marginRight: '5.5rem',
                        display: 'flex',
                    }}
                ></div>
            </div>
        </div>,
        {
            width: 1200,
            height: 630,
            fonts: [
                {
                    name: 'Noto Sans JP',
                    data: fontData,
                    style: 'normal',
                },
            ],
        }
    );

    return await sharp(Buffer.from(svg)).png().toBuffer();
}

async function getFontData() {
    const API = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700`;

    const css = await (
        await fetch(API, {
            headers: {
                // Make sure it returns TTF.
                'User-Agent':
                    'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
            },
        })
    ).text();

    const resource = css.match(
        /src: url\((.+)\) format\('(opentype|truetype)'\)/
    );

    if (!resource) return;

    return await fetch(resource[1]).then((res) => res.arrayBuffer());
}
