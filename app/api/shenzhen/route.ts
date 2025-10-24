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

function md5(string: string): string {
  function md5cycle(x, k) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    
    a += (b & c | ~b & d) + k[0] - 680876936 | 0;
    a = (a << 7 | a >>> 25) + b | 0;
    d += (a & b | ~a & c) + k[1] - 389564586 | 0;
    d = (d << 12 | d >>> 20) + a | 0;
    c += (d & a | ~d & b) + k[2] + 606105819 | 0;
    c = (c << 17 | c >>> 15) + d | 0;
    b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
    b = (b << 22 | b >>> 10) + c | 0;
    
    a += (b & c | ~b & d) + k[4] - 176418897 | 0;
    a = (a << 7 | a >>> 25) + b | 0;
    d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
    d = (d << 12 | d >>> 20) + a | 0;
    c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
    c = (c << 17 | c >>> 15) + d | 0;
    b += (c & d | ~c & a) + k[7] - 45705983 | 0;
    b = (b << 22 | b >>> 10) + c | 0;
    
    a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
    a = (a << 7 | a >>> 25) + b | 0;
    d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
    d = (d << 12 | d >>> 20) + a | 0;
    c += (d & a | ~d & b) + k[10] - 42063 | 0;
    c = (c << 17 | c >>> 15) + d | 0;
    b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
    b = (b << 22 | b >>> 10) + c | 0;
    
    a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
    a = (a << 7 | a >>> 25) + b | 0;
    d += (a & b | ~a & c) + k[13] - 40341101 | 0;
    d = (d << 12 | d >>> 20) + a | 0;
    c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
    c = (c << 17 | c >>> 15) + d | 0;
    b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
    b = (b << 22 | b >>> 10) + c | 0;
    
    a += (b & d | c & ~d) + k[1] - 165796510 | 0;
    a = (a << 5 | a >>> 27) + b | 0;
    d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
    d = (d << 9 | d >>> 23) + a | 0;
    c += (d & b | a & ~b) + k[11] + 643717713 | 0;
    c = (c << 14 | c >>> 18) + d | 0;
    b += (c & a | d & ~a) + k[0] - 373897302 | 0;
    b = (b << 20 | b >>> 12) + c | 0;
    
    a += (b & d | c & ~d) + k[5] - 701558691 | 0;
    a = (a << 5 | a >>> 27) + b | 0;
    d += (a & c | b & ~c) + k[10] + 38016083 | 0;
    d = (d << 9 | d >>> 23) + a | 0;
    c += (d & b | a & ~b) + k[15] - 660478335 | 0;
    c = (c << 14 | c >>> 18) + d | 0;
    b += (c & a | d & ~a) + k[4] - 405537848 | 0;
    b = (b << 20 | b >>> 12) + c | 0;
    
    a += (b & d | c & ~d) + k[9] + 568446438 | 0;
    a = (a << 5 | a >>> 27) + b | 0;
    d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
    d = (d << 9 | d >>> 23) + a | 0;
    c += (d & b | a & ~b) + k[3] - 187363961 | 0;
    c = (c << 14 | c >>> 18) + d | 0;
    b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
    b = (b << 20 | b >>> 12) + c | 0;
    
    a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
    a = (a << 5 | a >>> 27) + b | 0;
    d += (a & c | b & ~c) + k[2] - 51403784 | 0;
    d = (d << 9 | d >>> 23) + a | 0;
    c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
    c = (c << 14 | c >>> 18) + d | 0;
    b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
    b = (b << 20 | b >>> 12) + c | 0;
    
    a += (b ^ c ^ d) + k[5] - 378558 | 0;
    a = (a << 4 | a >>> 28) + b | 0;
    d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
    d = (d << 11 | d >>> 21) + a | 0;
    c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
    c = (c << 16 | c >>> 16) + d | 0;
    b += (c ^ d ^ a) + k[14] - 35309556 | 0;
    b = (b << 23 | b >>> 9) + c | 0;
    
    a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
    a = (a << 4 | a >>> 28) + b | 0;
    d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
    d = (d << 11 | d >>> 21) + a | 0;
    c += (d ^ a ^ b) + k[7] - 155497632 | 0;
    c = (c << 16 | c >>> 16) + d | 0;
    b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
    b = (b << 23 | b >>> 9) + c | 0;
    
    a += (b ^ c ^ d) + k[13] + 681279174 | 0;
    a = (a << 4 | a >>> 28) + b | 0;
    d += (a ^ b ^ c) + k[0] - 358537222 | 0;
    d = (d << 11 | d >>> 21) + a | 0;
    c += (d ^ a ^ b) + k[3] - 722521979 | 0;
    c = (c << 16 | c >>> 16) + d | 0;
    b += (c ^ d ^ a) + k[6] + 76029189 | 0;
    b = (b << 23 | b >>> 9) + c | 0;
    
    a += (b ^ c ^ d) + k[9] - 640364487 | 0;
    a = (a << 4 | a >>> 28) + b | 0;
    d += (a ^ b ^ c) + k[12] - 421815835 | 0;
    d = (d << 11 | d >>> 21) + a | 0;
    c += (d ^ a ^ b) + k[15] + 530742520 | 0;
    c = (c << 16 | c >>> 16) + d | 0;
    b += (c ^ d ^ a) + k[2] - 995338651 | 0;
    b = (b << 23 | b >>> 9) + c | 0;
    
    a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
    a = (a << 6 | a >>> 26) + b | 0;
    d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
    d = (d << 10 | d >>> 22) + a | 0;
    c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
    c = (c << 15 | c >>> 17) + d | 0;
    b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
    b = (b << 21 | b >>> 11) + c | 0;
    
    a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
    a = (a << 6 | a >>> 26) + b | 0;
    d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
    d = (d << 10 | d >>> 22) + a | 0;
    c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
    c = (c << 15 | c >>> 17) + d | 0;
    b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
    b = (b << 21 | b >>> 11) + c | 0;
    
    a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
    a = (a << 6 | a >>> 26) + b | 0;
    d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
    d = (d << 10 | d >>> 22) + a | 0;
    c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
    c = (c << 15 | c >>> 17) + d | 0;
    b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
    b = (b << 21 | b >>> 11) + c | 0;
    
    a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
    a = (a << 6 | a >>> 26) + b | 0;
    d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
    d = (d << 10 | d >>> 22) + a | 0;
    c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
    c = (c << 15 | c >>> 17) + d | 0;
    b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
    b = (b << 21 | b >>> 11) + c | 0;
    
    x[0] = a + x[0] | 0;
    x[1] = b + x[1] | 0;
    x[2] = c + x[2] | 0;
    x[3] = d + x[3] | 0;
  }
  
  function md51(s) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) {
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
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }
  
  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  
    const hex_chr = '0123456789abcdef'.split('');
  
  function rhex(n) {
    let s = '';
    for (let j = 0; j < 4; j++) {
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
    }
    return s;
  }
  
  function hex(x) {
    for (let i = 0; i < x.length; i++) {
      x[i] = rhex(x[i]);
    }
    return x.join('');
  }
  
  return hex(md51(string));
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
