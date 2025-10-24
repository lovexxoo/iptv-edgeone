/**
 * MD5哈希 - 基于blueimp-md5实现
 * 经过验证可以生成正确的MD5哈希值
 */
function md5(string: string): string {
  function md5cycle(x: number[], k: number[]): void {
    let a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function md51(s: string): number[] {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i: number;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) {
        tail[i] = 0;
      }
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s: string): number[] {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  const hex_chr = '0123456789abcdef'.split('');

  function rhex(n: number): string {
    let s = '';
    for (let j = 0; j < 4; j++) {
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
    }
    return s;
  }

  function hex(x: number[]): string {
    for (let i = 0; i < x.length; i++) {
      x[i] = rhex(x[i]);
    }
    return x.join('');
  }

  function add32(a: number, b: number): number {
    return (a + b) & 0xFFFFFFFF;
  }

  return hex(md51(string));
}

/**
 * 转换时间戳
 */
function transformTimestamp(timestamp: number): number {
  const parts = [
    255 & timestamp,
    (timestamp & 65280) >> 8,
    (timestamp & 16711680) >> 16,
    (timestamp & 4278190080) >> 24,
  ];

  for (let i = 0; i < parts.length; i++) {
    parts[i] = ((240 & parts[i]) ^ 240) | ((1 + (parts[i] & 15)) & 15);
  }

  return (
    parts[3] |
    (((parts[2] << 8) << 32) >> 32) |
    (((parts[1] << 16) << 32) >> 32) |
    (((parts[0] << 24) << 32) >> 32)
  );
}

/**
 * 获取访问Token
 */
async function getAccessToken(): Promise<string | null> {
  const tm = Math.floor(Date.now() / 1000);
  const signStr = `${SECRET}/JwtAuth/GetWebToken?AppID=${APP_ID}appId${APP_ID}platform41uuid${UUID}${tm}`;
  const sign = md5(signStr);
  const tt = transformTimestamp(tm);

  const apiAuthUrl = `https://api-auth-lizhi.jstv.com/JwtAuth/GetWebToken?AppID=${APP_ID}&TT=${tt}&Sign=${sign}`;

  const postData = {
    platform: 41,
    uuid: UUID,
    appId: APP_ID,
  };

  try {
    const response = await fetch(apiAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://live.jstv.com/',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.data?.accessToken || null;
  } catch (error) {
    console.error('Get access token error:', error);
    return null;
  }
}

/**
 * 获取播放地址
 */
async function getStreamUrl(extraId: number, authorization: string): Promise<string | null> {
  const playDataUrl = 'https://publish-lizhi.jstv.com/nav/7510';

  try {
    const response = await fetch(playDataUrl, {
      headers: {
        'Authorization': `Bearer ${authorization}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    // 查找对应频道
    if (data?.data?.childList?.[0]?.articles) {
      for (const article of data.data.childList[0].articles) {
        if (article.extraId === extraId) {
          return article.extraJson?.url || null;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Get stream URL error:', error);
    return null;
  }
}

/**
 * GET请求处理
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'jsws';

  // 如果是list请求，返回频道列表
  if (id === 'list') {
    let m3u8Content = '#EXTM3U\n';
    
    const url = new URL(request.url);
    let baseHost = url.host;
    
    if (baseHost.includes('localhost') || baseHost.includes('pages-scf') || baseHost.includes('qcloudteo.com')) {
      const referer = request.headers.get('referer');
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          baseHost = refererUrl.host;
        } catch {}
      }
    }
    
    const baseUrl = `${url.protocol}//${baseHost}/api/jiangsu`;

    for (const [cid, _] of Object.entries(CHANNEL_MAP)) {
      const channelName = CHANNEL_NAMES[cid];
      m3u8Content += `#EXTINF:-1,${channelName}\n`;
      m3u8Content += `${baseUrl}?id=${cid}\n`;
    }

    return new NextResponse(m3u8Content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // 检查频道是否存在
  if (!CHANNEL_MAP[id]) {
    return new NextResponse(
      `Channel not found: ${id}\nAvailable channels: ${Object.keys(CHANNEL_MAP).join(', ')}`,
      {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }

  const extraId = CHANNEL_MAP[id];

  // 获取访问Token
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return new NextResponse('Failed to get access token', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 获取播放地址
  const streamUrl = await getStreamUrl(extraId, accessToken);

  if (!streamUrl) {
    return new NextResponse('Stream not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
