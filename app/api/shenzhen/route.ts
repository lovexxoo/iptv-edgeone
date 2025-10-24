/**
 * 深圳TV API路由
 * 支持11个深圳广播电视台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const CHANNEL_MAP: { [key: string]: string } = {
  'szws4k': 'R77mK1v',  // 深圳卫视4k
  'szws': 'AxeFRth',    // 深圳卫视
  'szds': 'ZwxzUXr',    // 都市频道
  'szdsj': '4azbkoY',   // 电视剧频道
  'szgg': '2q76Sw2',    // 公共频道
  'szcj': '3vlcoxP',    // 财经频道
  'szyl': '1q4iPng',    // 娱乐生活频道
  'szse': '1SIQj6s',    // 少儿频道
  'szyd': 'wDF6KJ3',    // 移动电视
  'szyh': 'BJ5u5k2',    // 宜和购物频道
  'szgj': 'sztvgjpd',   // 国际频道
};

const CHANNEL_NAMES: { [key: string]: string } = {
  'szws4k': '深圳卫视4K', 'szws': '深圳卫视', 'szds': '都市频道',
  'szdsj': '电视剧频道', 'szgg': '公共频道', 'szcj': '财经频道',
  'szyl': '娱乐生活', 'szse': '少儿频道', 'szyd': '移动电视',
  'szyh': '宜和购物', 'szgj': '国际频道',
};

const KEY = 'bf9b2cab35a9c38857b82aabf99874aa96b9ffbb';
const HOSTS = 'https://sztv-hls.sztv.com.cn';

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


function getPathname(code: string): string {
  // 深圳台pathname生成算法 - 从Perl CGI移植
  
  // 获取今天0点的时间戳(毫秒)
  // 获取CST时区(UTC+8)今天0点的时间戳(毫秒)
  const now = new Date();
  const cstOffset = 8 * 60 * 60 * 1000;
  const cstNow = new Date(now.getTime() + cstOffset);
  cstNow.setUTCHours(0, 0, 0, 0);
  const timestampStr = (cstNow.getTime() - cstOffset).toString();
  
  // 计算r和l
  let r = 0;
  let l = 0;
  let d = -1;
  
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    r += charCode;
    if (d !== -1) {
      l += (d - charCode);
    }
    d = charCode;
  }
  r += l;
  
  // 转换为36进制
  const toBase36 = (num: number): string => {
    if (num === 0) return '0';
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    while (num > 0) {
      result = chars[num % 36] + result;
      num = Math.floor(num / 36);
    }
    return result;
  };
  
  // 大整数转36进制（使用字符串处理）
  const bigIntToBase36 = (numStr: string): string => {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    
    const bigIntMod = (str: string, divisor: number): number => {
      let remainder = 0;
      for (const digit of str) {
        remainder = (remainder * 10 + parseInt(digit)) % divisor;
      }
      return remainder;
    };
    
    const bigIntDiv = (str: string, divisor: number): string => {
      let result = '';
      let remainder = 0;
      for (const digit of str) {
        remainder = remainder * 10 + parseInt(digit);
        const quotient = Math.floor(remainder / divisor);
        result += quotient;
        remainder = remainder % divisor;
      }
      return result.replace(/^0+/, '') || '0';
    };
    
    let num = numStr;
    while (num !== '0' && num !== '') {
      const remainder = bigIntMod(num, 36);
      result = chars[remainder] + result;
      num = bigIntDiv(num, 36);
    }
    
    return result || '0';
  };
  
  const s = toBase36(r);
  let c = bigIntToBase36(timestampStr);
  
  // 计算u (c字符串的ASCII码之和)
  let u = 0;
  for (const char of c) {
    u += char.charCodeAt(0);
  }
  
  // 旋转c字符串
  c = c.substring(5) + c.substring(0, 5);
  
  const f = Math.abs(u - r);
  c = s.split('').reverse().join('') + c;
  
  const g = c.substring(0, 4);
  const w = c.substring(4);
  const wday = now.getDay();
  const b = wday % 2;
  
  // 构建m数组
  const m: string[] = [];
  for (let a = 0; a < code.length; a++) {
    if (a % 2 === b) {
      m.push(c[a % c.length]);
    } else {
      const hIndex = a - 1;
      if (hIndex >= 0) {
        const h = code[hIndex];
        const v = g.indexOf(h);
        if (v === -1) {
          m.push(h);
        } else {
          m.push(w[v]);
        }
      } else {
        m.push(g[a % g.length]);
      }
    }
  }
  
  const mStr = m.join('');
  const f36 = toBase36(f);
  const result = (f36.split('').reverse().join('') + mStr).substring(0, code.length);
  
  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'szdsj';

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
    
    const baseUrl = `${url.protocol}//${baseHost}/api/shenzhen`;
    
    for (const [cid, _] of Object.entries(CHANNEL_MAP)) {
      m3u8Content += `#EXTINF:-1,${CHANNEL_NAMES[cid]}\n${baseUrl}?id=${cid}\n`;
    }
    return new NextResponse(m3u8Content, {
      headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
    });
  }

  const code = CHANNEL_MAP[id];
  if (!code) {
    return new NextResponse('Channel not found', { status: 404 });
  }

  const dectime = (Math.floor(Date.now() / 1000) + 7200).toString(16);
  const rate = '500';
  const pathname = getPathname(code);
  const path = `/${code}/${rate}/${pathname}.m3u8`;
  const sign = md5(KEY + path + dectime);
  const liveURL = `${HOSTS}${path}?sign=${sign}&t=${dectime}`;

  return NextResponse.redirect(liveURL, 302);
}
