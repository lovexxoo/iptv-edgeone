/**
 * 北京TV API路由
 * 支持10个北京广播电视台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 频道映射表
const CHANNEL_MAP: { [key: string]: string } = {
  'bjws': '573ib1kp5nk92irinpumbo9krlb',    // 北京卫视
  'bjwy': '54db6gi5vfj8r8q1e6r89imd64s',    // BRTV文艺
  'bjjskj': '53bn9rlalq08lmb8nf8iadoph0b',  // BRTV纪实科教
  'bjys': '50mqo8t4n4e8gtarqr3orj9l93v',    // BRTV影视
  'bjcj': '50e335k9dq488lb7jo44olp71f5',    // BRTV财经
  'bjsh': '50j015rjrei9vmp3h8upblr41jf',    // BRTV生活
  'bjxw': '53gpt1ephlp86eor6ahtkg5b2hf',    // BRTV新闻
  'bjkk': '55skfjq618b9kcq9tfjr5qllb7r',    // 卡酷少儿
  'bjws4k': '5755n511tbk8flo40l4c71l0sdf',  // 北京卫视4K
  'bjty': '54hv0f3pq079d4oiil2k12dkvsc',    // BRTV体育休闲
};

// 频道名称映射
const CHANNEL_NAMES: { [key: string]: string } = {
  'bjws': '北京卫视',
  'bjwy': 'BRTV文艺',
  'bjjskj': 'BRTV纪实科教',
  'bjys': 'BRTV影视',
  'bjcj': 'BRTV财经',
  'bjsh': 'BRTV生活',
  'bjxw': 'BRTV新闻',
  'bjkk': '卡酷少儿',
  'bjws4k': '北京卫视4K',
  'bjty': 'BRTV体育休闲',
};

const SIGN_SECRET = 'TtJSg@2g*$K4PjUH';

/**
 * MD5哈希（纯JavaScript实现，兼容Edge Runtime）
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
 * Base64解码
 */
function base64Decode(str: string): string {
  try {
    return atob(str);
  } catch {
    return '';
  }
}

/**
 * 反转字符串
 */
function reverseString(str: string): string {
  return str.split('').reverse().join('');
}

/**
 * 获取播放地址
 */
async function getStreamUrl(channelId: string): Promise<string | null> {
  // 生成签名
  const timestamp = Math.floor(Date.now() / 1000);
  const signStr = `${channelId}151${timestamp}${SIGN_SECRET}`;
  const signFull = md5(signStr);
  const sign = signFull.substring(0, 8);

  // 构建API URL
  const apiUrl = `https://pc.api.btime.com/video/play?from=pc&callback=&id=${channelId}&type_id=151&timestamp=${timestamp}&sign=${sign}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Referer': 'https://www.brtn.cn/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const text = await response.text();

    // 提取stream_url
    const match = text.match(/"stream_url"\s*:\s*"([^"]+)"/);
    if (!match) return null;

    const encryptedUrl = match[1];

    // 解密URL: 反转字符串 -> base64解码 -> 再次base64解码
    const reversed = reverseString(encryptedUrl);
    const decoded1 = base64Decode(reversed);
    const decoded2 = base64Decode(decoded1);

    return decoded2 || null;
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
  const id = searchParams.get('id') || 'bjws';

  // 如果是list请求，返回频道列表
  if (id === 'list') {
    let m3u8Content = '#EXTM3U\n';
    
    // 构建正确的baseUrl
    // 优先使用x-forwarded-host(EdgeOne会设置为用户访问的域名)
    // 从request.url中解析出完整的baseUrl
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}/api/beijing`;

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
    return new NextResponse(`Channel not found: ${id}\nAvailable channels: ${Object.keys(CHANNEL_MAP).join(', ')}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const channelId = CHANNEL_MAP[id];

  // 获取播放地址
  const streamUrl = await getStreamUrl(channelId);

  if (!streamUrl) {
    return new NextResponse('Stream not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
