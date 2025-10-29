import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl, getRealHost } from '../utils/url';
// import fs from 'fs';
// import path from 'path';
import crypto from 'crypto';
import tls from 'tls';
import http from 'http';
import https from 'https';

export const runtime = 'nodejs';

// const CACHE_DIR = path.resolve(process.cwd(), 'gdtv_cache');
const CA_KEY = '89541943007407288657755311868534';
const SIGN_KEY = 'dfkcY1c3sfuw1Cii9DWj8UO3iQy2hqlDxyvDXd1oVMxwYVDSgeB6phO9eW1dfuwX';

// channel id -> display name mapping (provided list)
const CHANNEL_MAP: Record<number, string> = {
  43: '广东卫视',
  44: '广东珠江',
  45: '广东新闻',
  46: '大湾区卫视',
  47: '广东体育',
  48: '广东民生',
  51: '大湾区卫视',
  53: '广东影视',
  16: '广东4K',
  54: '广东少儿',
  66: '嘉佳卡通',
  42: '南方购物',
  15: '岭南戏曲',
  74: '广东移动',
 111: '现代教育',
 100: '广东台经典剧',
 94: '广东纪录片',
 99: 'GRTN健康频道',
 75: 'GRTN文化频道',
 102: 'GRTN生活频道',
};

// 内存缓存（Map），适合 Edge/Serverless
const cache = new Map<string, { value: any; expires: number }>();

function loadFromCache(id: string) {
  const expireSeconds = 60 * 30; // 30分钟缓存
  const cached = cache.get(id);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }
  return null;
}

function saveToCache(id: string, obj: any) {
  const expireSeconds = 60 * 30;
  cache.set(id, { value: obj, expires: Date.now() + expireSeconds * 1000 });
  return true;
}

async function requestUrl(url: string, signInHeader = true, method: string | null = null) {
  const headers: Record<string,string> = { 'Referer': 'https://www.gdtv.cn/' };
  if (signInHeader) {
    const t = String(Math.round(Date.now())); // ms
    const payload = `GET\n${url}\n${t}\n`;
    const hmac = crypto.createHmac('sha256', SIGN_KEY).update(payload).digest();
    const sign = Buffer.from(hmac).toString('base64');
    headers['Origin'] = 'https://www.gdtv.cn/';
    headers['User-Agent'] = 'Mozilla/5.0 (Linux; U; Android 9)';
    headers['X-Itouchtv-Ca-Key'] = CA_KEY;
    headers['X-Itouchtv-Ca-Signature'] = sign;
    headers['X-Itouchtv-Ca-Timestamp'] = t;
    headers['X-Itouchtv-Client'] = 'WEB_M';
    headers['X-Itouchtv-Device-Id'] = 'WEBM_0';
  }
  const opts: any = { headers };
  if (method) opts.method = method;
  const resp = await fetch(url, opts as any);
  const text = await resp.text();
  // ...
  if (!resp.ok) throw new Error(`upstream ${resp.status}`);
  return text;
}

// 彻底移除 canLocate，所有 m3u8 都用 Node fetch 代理

function redirectResponse(url: string) {
  // allow CORS and redirect
  return new NextResponse(null, { status: 302, headers: { 'Location': url, 'Access-Control-Allow-Origin': '*' } });
}

function echoContentResponse(content: string) {
  return new NextResponse(content, { status: 200, headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Access-Control-Allow-Origin': '*' } });
}

function encodeWebsocketPayload(data: string) {
  const payload = Buffer.from(data, 'utf8');
  const len = payload.length;
  // frame: 0x81, 0xFE, len_hi, len_lo, mask[4], masked_payload
  const head = Buffer.alloc(4);
  head[0] = 0x81;
  head[1] = 0xFE; // use 2-byte extended length
  head[2] = (len >> 8) & 0xff;
  head[3] = len & 0xff;
  const mask = crypto.randomBytes(4);
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([head, mask, masked]);
}

function parseWebsocketFrame(buf: Buffer): Buffer | null {
  if (!buf || buf.length < 2) return null;
  const b1 = buf[0];
  const b2 = buf[1];
  let offset = 2;
  let payloadLen = b2 & 0x7f;
  if (payloadLen === 126) {
    if (buf.length < 4) return null;
    payloadLen = buf.readUInt16BE(2);
    offset = 4;
  } else if (payloadLen === 127) {
    if (buf.length < 10) return null;
    // read 64-bit length (safe assumption: length fits Number)
    payloadLen = Number(buf.readBigUInt64BE(2));
    offset = 10;
  }
  const masked = (b2 & 0x80) !== 0;
  let mask: Buffer | null = null;
  if (masked) {
    if (buf.length < offset + 4) return null;
    mask = buf.slice(offset, offset + 4);
    offset += 4;
  }
  if (buf.length < offset + payloadLen) return null;
  let payload = buf.slice(offset, offset + payloadLen);
  if (masked && mask) {
    const out = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) out[i] = payload[i] ^ mask[i % 4];
    payload = out;
  }
  return payload;
}

// Node-only WebSocket handshake，最大兼容性实现
async function doHeartbeat(node: string, timeoutMs = 5000): Promise<string | null> {
  // 尝试两种 Host 头（含端口/不含端口），每种最多2次
  const host = 'tcdn-ws.itouchtv.cn';
  const port = 3800;
  const hostVariants = [`${host}`, `${host}:${port}`];
  for (const hostHeader of hostVariants) {
    for (let attempt = 0; attempt < 2; ++attempt) {
      let result: string | null = null;
      await new Promise<void>((resolveTry) => {
        let finished = false;
        const socket = tls.connect({
          port,
          host,
          servername: host, // 显式 SNI，兼容 openssl
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          maxVersion: 'TLSv1.2',
          ALPNProtocols: []
        }, () => {
          const key = crypto.randomBytes(16).toString('base64');
          const reqLines = [
            `GET /connect HTTP/1.1`,
            `Host: ${hostHeader}`,
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Key: ${key}`,
            'Sec-WebSocket-Version: 13',
            'Origin: https://www.gdtv.cn/',
            'User-Agent: curl/7.68.0',
            '',
            '' // 多加一空行，确保结尾严格 CRLF
          ];
          const reqStr = reqLines.join('\r\n');
          // write 握手后延迟 120ms 再 end，模拟 openssl 行为
          socket.write(reqStr, () => {
            setTimeout(() => { try { socket.end(); } catch (e) {} }, 120);
          });
        });
        let handshakeDone = false;
        let acc = Buffer.alloc(0);
        const cleanup = () => { try { socket.end(); socket.destroy(); } catch (e) {} };
        const finish = (val: string | null) => {
          if (!finished) {
            finished = true;
            result = val;
            cleanup();
            resolveTry();
          }
        };
        const onSocketData = (chunk: Buffer) => {
          acc = Buffer.concat([acc, chunk]);
          if (!handshakeDone) {
            const s = acc.toString('utf8');
            if (s.indexOf('Sec-Websocket-Accept') !== -1 || s.indexOf('101') !== -1) {
              handshakeDone = true;
              // send getwsparam frame
              const msg = JSON.stringify({ route: 'getwsparam', message: node });
              const frame = encodeWebsocketPayload(msg);
              socket.write(frame);
              // reset accumulator to capture next binary frame
              acc = Buffer.alloc(0);
            }
          } else {
            // server-to-client frame expected (binary/utf8) -> try parse
            const payload = parseWebsocketFrame(acc);
            if (payload) {
              try {
                const text = payload.toString('utf8');
                const j = JSON.parse(text);
                if (j && j.wsnode) {
                  finish(j.wsnode);
                }
              } catch (e) {
                // if parse fails, keep waiting for more data
              }
            }
          }
        };
        socket.on('data', onSocketData);
        socket.on('error', () => { finish(null); });
        socket.on('timeout', () => { finish(null); });
        socket.on('close', () => { finish(null); });
        socket.setTimeout(timeoutMs, () => { finish(null); });
        // 短 sleep，避免写入过快
        setTimeout(() => { if (!finished) resolveTry(); }, timeoutMs + 500);
      });
      if (result) return result;
      // 每次失败后短暂 sleep，避免被限流
      await new Promise(r => setTimeout(r, 80));
    }
  }
  return null;
}

async function getM3u8UrlFromWeb(id: string) {
  // get node param
  const url = 'https://tcdn-api.itouchtv.cn/getParam';
  const data = await requestUrl(url, true);
  let j: any = null;
  try { j = JSON.parse(data); } catch (e) {}
  const node = j?.node;

  // send heartbeat to get wsnode
  let wsnode: string | null = null;
  try {
    wsnode = await doHeartbeat(node);
  } catch (e) { wsnode = null; }

  const nodeParam = wsnode ? Buffer.from(wsnode, 'utf8').toString('base64') : '';
  const apiUrl = `https://gdtv-api.gdtv.cn/api/tv/v2/tvChannel/${id}?node=${encodeURIComponent(nodeParam)}`;
  // ...

  // call OPTIONS first like legacy
  try { await requestUrl(apiUrl, false, 'OPTIONS'); } catch (_) {}
  const data2 = await requestUrl(apiUrl, true);
  let j2: any = null;
  try { j2 = JSON.parse(data2); } catch (e) {}
  let playURL: string | undefined = undefined;
  try {
    const playJSON = JSON.parse(j2?.playUrl || '{}');
    playURL = playJSON.hd;
  } catch (e) {}
  return { url: playURL, node };
}

export async function GET(request: NextRequest) {
  const urlObj = new URL(request.url);
  const id = urlObj.searchParams.get('id') || '';
  // ...
  if (!id) return new NextResponse('missing id', { status: 400 });

  // support list parameter to return an M3U of available channels
  if (id === 'list') {
    // Build M3U where each item points to our local API route using the helper
    let m3u = '#EXTM3U\n';
    for (const k of Object.keys(CHANNEL_MAP)) {
      const nid = Number(k);
      const name = CHANNEL_MAP[nid] || `channel-${nid}`;
      m3u += `#EXTINF:-1,${name}\n`;
      // use buildApiUrl to honor EdgeOne host headers and protocol
      m3u += `${buildApiUrl(request as unknown as Request, '/api/guangdong', String(nid))}\n`;
    }
    return new NextResponse(m3u, { status: 200, headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Access-Control-Allow-Origin': '*' } });
  }

  // try cache
  let res: any = loadFromCache(id);
  // ...
  if (!res) {
    try {
      res = await getM3u8UrlFromWeb(id);
      saveToCache(id, res);
    } catch (e) {
      return new NextResponse('upstream error', { status: 502 });
    }
  }

  const u = res?.url;
  if (!u) return new NextResponse('no url', { status: 404 });

  // 只要 host 不包含 .itouchtv.cn 就 302 跳转，否则必须代理
  try {
    const urlHost = (() => {
      try {
        return new URL(u).host;
      } catch {
        return '';
      }
    })();
    if (!urlHost.includes('.itouchtv.cn')) {
      // 直接 302 跳转
      return new NextResponse(null, { status: 302, headers: { 'Location': u, 'Access-Control-Allow-Origin': '*' } });
    }
    // host 包含 .itouchtv.cn，必须代理
    const content = await requestUrl(u, false);
    if (content && content.length > 0) return echoContentResponse(content);
    return new NextResponse('empty content', { status: 502 });
  } catch (e) {
    return new NextResponse('fetch failed', { status: 502 });
  }
}

// 用 Node 原生 http/https 代理 m3u8 内容，最大兼容 PHP 行为
function proxyM3u8(url: string): Promise<{stream: any, status: number, headers: Record<string, string>}> {
  return new Promise((resolve) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, {
      headers: {
        'Referer': 'https://www.gdtv.cn/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Origin': 'https://www.gdtv.cn/',
        'Accept': 'application/vnd.apple.mpegurl,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'identity',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Connection': 'keep-alive',
      }
    }, (resp) => {
      const headers: Record<string, string> = {
        'Content-Type': resp.headers['content-type'] || 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
      };
      // 透传 content-length/encoding 等
      if (resp.headers['content-length']) headers['Content-Length'] = resp.headers['content-length'];
      if (resp.headers['content-encoding']) headers['Content-Encoding'] = resp.headers['content-encoding'];
      if (resp.headers['cache-control']) headers['Cache-Control'] = resp.headers['cache-control'];
      if (resp.headers['expires']) headers['Expires'] = resp.headers['expires'];
      if (resp.headers['last-modified']) headers['Last-Modified'] = resp.headers['last-modified'];
      const stream = resp.pipe(new (require('stream').PassThrough)());
      resolve({ stream, status: resp.statusCode || 200, headers });
    });
    req.on('error', () => {
      resolve({ stream: undefined, status: 502, headers: { 'Content-Type': 'text/plain' } });
    });
  });
}
