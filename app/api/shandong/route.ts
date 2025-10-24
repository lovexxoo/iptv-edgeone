/**
 * 山东TV API路由
 * 支持26个山东广播电视台及地市台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 频道映射表
const CHANNEL_MAP: { [key: string]: [number, string] } = {
  'sdws': [1, ''],           // 山东卫视
  'xwpd': [3, ''],           // 新闻频道
  'qlpd': [5, ''],           // 齐鲁频道
  'txyx': [7, ''],           // 体育休闲频道
  'shpd': [9, ''],           // 生活频道
  'zypd': [11, ''],          // 综艺频道
  'wlpd': [13, ''],          // 文旅频道
  'nkpd': [15, ''],          // 农科频道
  'sepd': [17, ''],          // 少儿频道
  'jndst': [29883, '/region'],   // 济南电视台
  'zbdst': [100010, '/region'],  // 淄博电视台
  'zzdst': [100023, '/region'],  // 枣庄电视台
  'dydst': [100011, '/region'],  // 东营电视台
  'ytdst': [100012, '/region'],  // 烟台电视台
  'wfdst': [100013, '/region'],  // 潍坊电视台
  'tadst': [100015, '/region'],  // 泰安电视台
  'whdst': [100016, '/region'],  // 威海电视台
  'rzdst': [100017, '/region'],  // 日照电视台
  'lydst': [100019, '/region'],  // 临沂电视台
  'dzdst': [100020, '/region'],  // 德州电视台
  'lcdst': [100021, '/region'],  // 聊城电视台
  'bzdst': [100022, '/region'],  // 滨州电视台
  'hzdst': [100024, '/region'],  // 菏泽电视台
  'jxdst': [100014, '/region'],  // 济宁电视台
  'lzdst': [100018, '/region'],  // 莱芜电视台
  'zcdst': [100026, '/region'],  // 枣庄电视台
};

// 频道名称
const CHANNEL_NAMES: { [key: string]: string } = {
  'sdws': '山东卫视', 'xwpd': '新闻频道', 'qlpd': '齐鲁频道',
  'txyx': '体育休闲', 'shpd': '生活频道', 'zypd': '综艺频道',
  'wlpd': '文旅频道', 'nkpd': '农科频道', 'sepd': '少儿频道',
  'jndst': '济南台', 'zbdst': '淄博台', 'zzdst': '枣庄台',
  'dydst': '东营台', 'ytdst': '烟台台', 'wfdst': '潍坊台',
  'tadst': '泰安台', 'whdst': '威海台', 'rzdst': '日照台',
  'lydst': '临沂台', 'dzdst': '德州台', 'lcdst': '聊城台',
  'bzdst': '滨州台', 'hzdst': '菏泽台', 'jxdst': '济宁台',
  'lzdst': '莱芜台', 'zcdst': '枣庄台',
};

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
 * 获取播放地址
 */
async function getStreamUrl(channelId: number, path: string): Promise<string | null> {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = md5(`huangye${timestamp}211f68ea4aeb687a6561707b6e3523c84e`);

  const url = `https://sdxw.iqilu.com/v1/app/play/tv${path}/live?e=1&e=1`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'version': '10.1.1',
        'orgid': '21',
        'platform': `android${timestamp}`,
        'sign': sign,
        'appVersion': '10.1.1',
        'sysVersion': '12',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelId: channelId,
        platType: 1,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.data?.liveUrl || null;
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
  const id = searchParams.get('id') || 'sdws';

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
    
    const baseUrl = `${url.protocol}//${baseHost}/api/shandong`;

    for (const [cid, _] of Object.entries(CHANNEL_MAP)) {
      const channelName = CHANNEL_NAMES[cid] || cid;
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

  const [channelId, path] = CHANNEL_MAP[id];

  // 获取播放地址
  const streamUrl = await getStreamUrl(channelId, path);

  if (!streamUrl) {
    return new NextResponse('Stream not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
