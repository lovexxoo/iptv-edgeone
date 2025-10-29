import { NextRequest, NextResponse } from 'next/server';
import { md5 } from '../utils/crypto';
import { buildApiUrl } from '../utils/url';
import http from 'http';
import https from 'https';
import stream from 'stream';

// 频道映射
const CHANNELS: Record<string, number> = {
  dfws: 1, // 东方卫视4k
  shxwzh: 2, // 上海新闻综合
  shds: 4, // 上海都市
  dycj: 5, // 第一财经
  hhxd: 9, // 哈哈炫动
  wxty: 10, // 五星体育
  mdy: 11, // 上海魔都眼
  jsrw: 12, // 上海新纪实
};
const NAMES: Record<string, string> = {
  dfws: '东方卫视4k',
  shxwzh: '上海新闻综合',
  shds: '上海都市',
  dycj: '第一财经',
  hhxd: '哈哈炫动',
  wxty: '五星体育',
  mdy: '上海魔都眼',
  jsrw: '上海新纪实',
};

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDP5hzPUW5RFeE2xBT1ERB3hHZI\nVotn/qatWhgc1eZof09qKjElFN6Nma461ZAwGpX4aezKP8Adh4WJj4u2O54xCXDt\nwzKRqZO2oNZkuNmF2Va8kLgiEQAAcxYc8JgTN+uQQNpsep4n/o1sArTJooZIF17E\ntSqSgXDcJ7yDj5rc7wIDAQAB\n-----END PUBLIC KEY-----`;

function getNonce(len = 8) {
  return Math.random().toString(36).slice(-len);
}

function dirnameUrl(u: string) {
  try {
    const url = new URL(u);
    url.pathname = url.pathname.replace(/\/[^/]*$/, '') + '/';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch (e) {
    return u.replace(/\/[^/]*$/, '/');
  }
}

// RSA 公钥解密，兼容 Node/Edge
function rsaPublicDecryptAll(encryptedBase64: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    const encBuf = Buffer.from(encryptedBase64, 'base64');
    const candidates = [256, 128, 64];
    for (const partLen of candidates) {
      if (encBuf.length % partLen !== 0) continue;
      const parts: Buffer[] = [];
      for (let i = 0; i < encBuf.length; i += partLen) parts.push(encBuf.slice(i, i + partLen));
      try {
        const chunks = parts.map(p => crypto.publicDecrypt({ key: PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING }, p));
        return Buffer.concat(chunks).toString('utf8');
      } catch (e) { continue; }
    }
    const single = crypto.publicDecrypt({ key: PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING }, encBuf);
    return single.toString('utf8');
  } catch (e) {
    throw new Error('RSA public decrypt not available in this runtime');
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const urlObj = new URL(request.url);
  const params = urlObj.searchParams;
  // 1. 代理模式：?url=xxx
  const proxyUrl = params.get('url');
  if (proxyUrl) {
    const resp = await fetch(proxyUrl, {
      headers: { 'Referer': 'https://live.kankanews.com/' }
    });
    let m3u8_content = await resp.text();
    if (!/^https?:\/\//m.test(m3u8_content)) {
      const burl = dirnameUrl(proxyUrl);
      m3u8_content = m3u8_content.replace(/(.*?\.ts)/ig, `${burl}$1`);
    }
    return new NextResponse(m3u8_content, { status: 200, headers: { 'Content-Type': 'application/vnd.apple.mpegurl' } });
  }
  // 2. list 模式
  const id = params.get('id') || 'dfws';
  if (id === 'list') {
    let m3u = '#EXTM3U\n';
    for (const key of Object.keys(CHANNELS)) {
      const name = NAMES[key] || key;
      m3u += `#EXTINF:-1,${name}\n`;
      m3u += `${buildApiUrl(request as unknown as Request, '/api/shanghai', key)}\n`;
    }
    return new NextResponse(m3u, { status: 200, headers: { 'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8' } });
  }
  // 3. 正常频道代理
  const channelId = CHANNELS[id] ?? CHANNELS['dfws'];
  const t = Math.floor(Date.now() / 1000).toString();
  const nonce = getNonce(8);
  const signStr = `Api-Version=v1&channel_id=${channelId}&nonce=${nonce}&platform=pc&timestamp=${t}&version=7.1.14&28c8edde3d61a0411511d3b1866f0636`;
  const sign = md5(md5(signStr));
  const headers: Record<string, string> = {
    'api-version': 'v1',
    'nonce': nonce,
    'm-uuid': 'D-8XPI8xaE6RMX4NZsu3e',
    'platform': 'pc',
    'version': '7.1.14',
    'timestamp': t,
    'sign': sign,
    'Referer': 'https://live.kankanews.com/'
  };
  const apiUrl = `https://kapi.kankanews.com/content/pc/tv/channel/detail?channel_id=${channelId}`;
  const resp1 = await fetch(apiUrl, { headers });
  if (!resp1.ok) return new NextResponse('upstream error', { status: 502 });
  const json = await resp1.json();
  const encrypted = json?.result?.live_address;
  console.log('[sh] encrypted live_address:', encrypted);
  if (!encrypted) return new NextResponse('no live address', { status: 404 });
  let live: string;
  try {
    live = rsaPublicDecryptAll(encrypted);
    console.log('[sh] live url:', live);
  } catch (e) {
    console.error('[sh] decrypt error', e);
    return new NextResponse('decrypt error', { status: 500 });
  }
  // 拉取 m3u8 内容，使用 Node 原生 http/https 代理
  let m3u8_content = '';
  try {
    const { content, status, headers: respHeaders } = await proxyM3u8(live);
    console.log('[sh] m3u8 proxy status:', status);
    console.log('[sh] m3u8 proxy headers:', JSON.stringify(respHeaders));
    m3u8_content = content;
    console.log('[sh] m3u8 head:', m3u8_content.slice(0, 256));
    if (status !== 200) return new NextResponse('proxy fetch failed', { status });
  } catch (e) {
    console.error('[sh] proxy fetch failed', e);
    return new NextResponse('proxy fetch failed', { status: 502 });
  }

// Node 原生 http/https 代理 m3u8 内容，最大兼容 PHP/curl 行为
async function proxyM3u8(url: string): Promise<{ content: string, status: number, headers: Record<string, string> }> {
  return new Promise((resolve) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, {
      headers: {
        'Referer': 'https://live.kankanews.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.apple.mpegurl,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
      }
    }, (resp) => {
      const headers: Record<string, string> = {
        'Content-Type': resp.headers['content-type'] || 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
      };
      let data = '';
      resp.setEncoding('utf8');
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        resolve({ content: data, status: resp.statusCode || 200, headers });
      });
    });
    req.on('error', () => {
      resolve({ content: '', status: 502, headers: { 'Content-Type': 'text/plain' } });
    });
  });
}
  // 嵌套m3u8特殊处理（如shds）
  if (id === 'shds') {
    const m = m3u8_content.match(/(https:\/\/[^\s]+\.m3u8[^\s]*)/i);
    if (m) {
      const nested_url = m[1];
      const proxy_url = buildApiUrl(request as unknown as Request, '/api/shanghai', undefined) + `?url=${encodeURIComponent(nested_url)}`;
      m3u8_content = m3u8_content.replace(nested_url, proxy_url);
    }
  }
  // TS 路径绝对化
  if (!/^https?:\/\//m.test(m3u8_content)) {
    const burl = dirnameUrl(live);
    m3u8_content = m3u8_content.replace(/(.*?\.ts)/ig, `${burl}$1`);
  }
  return new NextResponse(m3u8_content, { status: 200, headers: { 'Content-Type': 'application/vnd.apple.mpegurl' } });
}
