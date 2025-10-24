/**
 * 江苏TV API路由
 * 支持10个江苏广播电视台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 频道映射表（extraId）
const CHANNEL_MAP: { [key: string]: number } = {
  'jsws': 670,    // 江苏卫视
  'jsws4k': 676,  // 江苏卫视4K超高清
  'jscs': 669,    // 江苏城市
  'jszy': 663,    // 江苏综艺
  'jsys': 664,    // 江苏影视
  'jsxw': 668,    // 江苏新闻
  'jsjy': 666,    // 江苏教育
  'jsxx': 665,    // 体育休闲
  'ymkt': 667,    // 优漫卡通
  'jsgj': 671,    // 江苏国际
};

// 频道名称映射
const CHANNEL_NAMES: { [key: string]: string } = {
  'jsws': '江苏卫视',
  'jsws4k': '江苏卫视4K',
  'jscs': '江苏城市',
  'jszy': '江苏综艺',
  'jsys': '江苏影视',
  'jsxw': '江苏新闻',
  'jsjy': '江苏教育',
  'jsxx': '体育休闲',
  'ymkt': '优漫卡通',
  'jsgj': '江苏国际',
};

const APP_ID = '3b93c452b851431c8b3a076789ab1e14';
const SECRET = '9dd4b0400f6e4d558f2b3497d734c2b4';
const UUID = 'D5COmve6IQgwXvsJ4E3uxBstqxtDSCYW';

/**
 * MD5哈希
 */
function md5(text: string): string {
  // MD5实现 - 基于RFC 1321
  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift));
  }

  function addUnsigned(x: number, y: number): number {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function md5F(x: number, y: number, z: number): number {
    return (x & y) | ((~x) & z);
  }

  function md5G(x: number, y: number, z: number): number {
    return (x & z) | (y & (~z));
  }

  function md5H(x: number, y: number, z: number): number {
    return x ^ y ^ z;
  }

  function md5I(x: number, y: number, z: number): number {
    return y ^ (x | (~z));
  }

  function md5FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function md5GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function md5HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function md5II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(text: string): number[] {
    const wordArray: number[] = [];
    for (let i = 0; i < text.length * 8; i += 8) {
      wordArray[i >> 5] |= (text.charCodeAt(i / 8) & 0xFF) << (i % 32);
    }
    return wordArray;
  }

  function wordToHex(value: number): string {
    let hex = '';
    for (let i = 0; i <= 3; i++) {
      const byte = (value >>> (i * 8)) & 0xFF;
      hex += ('0' + byte.toString(16)).slice(-2);
    }
    return hex;
  }

  // 准备消息
  const msgLength = text.length;
  const wordArray = convertToWordArray(text);
  wordArray[msgLength >> 5] |= 0x80 << ((msgLength % 32));
  wordArray[(((msgLength + 64) >>> 9) << 4) + 14] = msgLength * 8;

  // MD5常量
  let a = 0x67452301;
  let b = 0xEFCDAB89;
  let c = 0x98BADCFE;
  let d = 0x10325476;

  // 主循环
  for (let i = 0; i < wordArray.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    a = md5FF(a, b, c, d, wordArray[i + 0], 7, 0xD76AA478);
    d = md5FF(d, a, b, c, wordArray[i + 1], 12, 0xE8C7B756);
    c = md5FF(c, d, a, b, wordArray[i + 2], 17, 0x242070DB);
    b = md5FF(b, c, d, a, wordArray[i + 3], 22, 0xC1BDCEEE);
    a = md5FF(a, b, c, d, wordArray[i + 4], 7, 0xF57C0FAF);
    d = md5FF(d, a, b, c, wordArray[i + 5], 12, 0x4787C62A);
    c = md5FF(c, d, a, b, wordArray[i + 6], 17, 0xA8304613);
    b = md5FF(b, c, d, a, wordArray[i + 7], 22, 0xFD469501);
    a = md5FF(a, b, c, d, wordArray[i + 8], 7, 0x698098D8);
    d = md5FF(d, a, b, c, wordArray[i + 9], 12, 0x8B44F7AF);
    c = md5FF(c, d, a, b, wordArray[i + 10], 17, 0xFFFF5BB1);
    b = md5FF(b, c, d, a, wordArray[i + 11], 22, 0x895CD7BE);
    a = md5FF(a, b, c, d, wordArray[i + 12], 7, 0x6B901122);
    d = md5FF(d, a, b, c, wordArray[i + 13], 12, 0xFD987193);
    c = md5FF(c, d, a, b, wordArray[i + 14], 17, 0xA679438E);
    b = md5FF(b, c, d, a, wordArray[i + 15], 22, 0x49B40821);

    a = md5GG(a, b, c, d, wordArray[i + 1], 5, 0xF61E2562);
    d = md5GG(d, a, b, c, wordArray[i + 6], 9, 0xC040B340);
    c = md5GG(c, d, a, b, wordArray[i + 11], 14, 0x265E5A51);
    b = md5GG(b, c, d, a, wordArray[i + 0], 20, 0xE9B6C7AA);
    a = md5GG(a, b, c, d, wordArray[i + 5], 5, 0xD62F105D);
    d = md5GG(d, a, b, c, wordArray[i + 10], 9, 0x02441453);
    c = md5GG(c, d, a, b, wordArray[i + 15], 14, 0xD8A1E681);
    b = md5GG(b, c, d, a, wordArray[i + 4], 20, 0xE7D3FBC8);
    a = md5GG(a, b, c, d, wordArray[i + 9], 5, 0x21E1CDE6);
    d = md5GG(d, a, b, c, wordArray[i + 14], 9, 0xC33707D6);
    c = md5GG(c, d, a, b, wordArray[i + 3], 14, 0xF4D50D87);
    b = md5GG(b, c, d, a, wordArray[i + 8], 20, 0x455A14ED);
    a = md5GG(a, b, c, d, wordArray[i + 13], 5, 0xA9E3E905);
    d = md5GG(d, a, b, c, wordArray[i + 2], 9, 0xFCEFA3F8);
    c = md5GG(c, d, a, b, wordArray[i + 7], 14, 0x676F02D9);
    b = md5GG(b, c, d, a, wordArray[i + 12], 20, 0x8D2A4C8A);

    a = md5HH(a, b, c, d, wordArray[i + 5], 4, 0xFFFA3942);
    d = md5HH(d, a, b, c, wordArray[i + 8], 11, 0x8771F681);
    c = md5HH(c, d, a, b, wordArray[i + 11], 16, 0x6D9D6122);
    b = md5HH(b, c, d, a, wordArray[i + 14], 23, 0xFDE5380C);
    a = md5HH(a, b, c, d, wordArray[i + 1], 4, 0xA4BEEA44);
    d = md5HH(d, a, b, c, wordArray[i + 4], 11, 0x4BDECFA9);
    c = md5HH(c, d, a, b, wordArray[i + 7], 16, 0xF6BB4B60);
    b = md5HH(b, c, d, a, wordArray[i + 10], 23, 0xBEBFBC70);
    a = md5HH(a, b, c, d, wordArray[i + 13], 4, 0x289B7EC6);
    d = md5HH(d, a, b, c, wordArray[i + 0], 11, 0xEAA127FA);
    c = md5HH(c, d, a, b, wordArray[i + 3], 16, 0xD4EF3085);
    b = md5HH(b, c, d, a, wordArray[i + 6], 23, 0x04881D05);
    a = md5HH(a, b, c, d, wordArray[i + 9], 4, 0xD9D4D039);
    d = md5HH(d, a, b, c, wordArray[i + 12], 11, 0xE6DB99E5);
    c = md5HH(c, d, a, b, wordArray[i + 15], 16, 0x1FA27CF8);
    b = md5HH(b, c, d, a, wordArray[i + 2], 23, 0xC4AC5665);

    a = md5II(a, b, c, d, wordArray[i + 0], 6, 0xF4292244);
    d = md5II(d, a, b, c, wordArray[i + 7], 10, 0x432AFF97);
    c = md5II(c, d, a, b, wordArray[i + 14], 15, 0xAB9423A7);
    b = md5II(b, c, d, a, wordArray[i + 5], 21, 0xFC93A039);
    a = md5II(a, b, c, d, wordArray[i + 12], 6, 0x655B59C3);
    d = md5II(d, a, b, c, wordArray[i + 3], 10, 0x8F0CCC92);
    c = md5II(c, d, a, b, wordArray[i + 10], 15, 0xFFEFF47D);
    b = md5II(b, c, d, a, wordArray[i + 1], 21, 0x85845DD1);
    a = md5II(a, b, c, d, wordArray[i + 8], 6, 0x6FA87E4F);
    d = md5II(d, a, b, c, wordArray[i + 15], 10, 0xFE2CE6E0);
    c = md5II(c, d, a, b, wordArray[i + 6], 15, 0xA3014314);
    b = md5II(b, c, d, a, wordArray[i + 13], 21, 0x4E0811A1);
    a = md5II(a, b, c, d, wordArray[i + 4], 6, 0xF7537E82);
    d = md5II(d, a, b, c, wordArray[i + 11], 10, 0xBD3AF235);
    c = md5II(c, d, a, b, wordArray[i + 2], 15, 0x2AD7D2BB);
    b = md5II(b, c, d, a, wordArray[i + 9], 21, 0xEB86D391);

    a = addUnsigned(a, olda);
    b = addUnsigned(b, oldb);
    c = addUnsigned(c, oldc);
    d = addUnsigned(d, oldd);
  }

  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
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
