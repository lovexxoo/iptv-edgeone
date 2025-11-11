/**
 * 湖北TV直播代理
 * 特点：需要 WebSocket 心跳维持在线状态 + 全链路代理
 * 
 * 运行环境：Node.js Runtime（支持 WebSocket 客户端）
 * 
 * 工作原理：
 * 1. 访问官方页面获取 client-id 和频道列表（带真实 auth_key）
 * 2. 调用 get_cdn_leech API 获取带 extrakey 和 aalook 的播放地址
 * 3. 建立 WebSocket 连接到 wss://remote-wa.cjyun.org.cn/liveweb
 * 4. 发送心跳消息（client_id + aa_look）
 * 5. 代理 M3U8 和 TS 文件
 * 
 * 当前状态：
 * - ✅ 频道列表获取正常
 * - ✅ 播放地址生成正常（含 auth_key + extrakey + aalook）
 * - ✅ WebSocket 心跳支持（Node.js Runtime）
 */

import { NextRequest, NextResponse } from 'next/server';
import tls from 'tls';
import crypto from 'crypto';
import { getRealHost } from '../utils/url';

export const runtime = 'nodejs';

// 频道映射表
const CHANNEL_NAME_MAP: Record<string, number> = {
  'hbws': 431,    // 湖北卫视
  'hbjs': 432,    // 湖北经视
  'hbzh': 433,    // 湖北综合
  'hbys': 435,    // 湖北影视
  'hbsh': 436,    // 湖北生活
  'hbjy': 437,    // 湖北教育
  'lspd': 438,    // 垄上频道
  'hbzs': 187,    // 湖北之声（广播）
  'jdyy': 417,    // 经典音乐
  'cszs': 419,    // 城市之声
  'ctjt': 193,    // 楚天交通
  'ctyy': 196,    // 楚天音乐
  'ncgb': 229,    // 农村广播
};

const ID_MAP: Record<string, string> = {
  '431': 'hbws', '432': 'hbjs', '433': 'hbzh', '435': 'hbys',
  '436': 'hbsh', '437': 'hbjy', '438': 'lspd',
  '187': 'hbzs', '417': 'jdyy', '419': 'cszs', '193': 'ctjt',
  '196': 'ctyy', '229': 'ncgb',
};

interface ChannelData {
  id: string;
  name: string;
  stream: string;
  type: 'tv' | 'radio';
}

interface PageData {
  clientId: string;
  clientToken: string;
  aalook: string;
  fullCookies: string; // 保存完整的Cookie字符串
  channels: Record<string, ChannelData>;
  timestamp: number;
}

interface PlayUrlData {
  url: string;
  timestamp: number;
}

// 使用 Map 作为缓存（Edge Runtime 支持）
const pageDataCache = new Map<string, PageData>();
const playUrlCache = new Map<string, PlayUrlData>();
const wsConnectionCache = new Map<string, { connected: boolean; lastHeartbeat: number }>();

const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 全局 WebSocket 连接（持久连接，模拟原网站行为）
let globalWebSocket: any = null;
let globalSocketReady = false;
let heartbeatInterval: NodeJS.Timeout | null = null;
let currentClientId = '';
let currentClientToken = '';
let currentAalook = '';

// WebSocket 帧编码/解码函数（参考广东实现）
function encodeWebsocketPayload(data: string): Buffer {
  const payload = Buffer.from(data, 'utf8');
  const len = payload.length;
  const head = Buffer.alloc(4);
  head[0] = 0x81; // FIN + text frame
  head[1] = 0xFE; // Masked + 2-byte extended length
  head[2] = (len >> 8) & 0xff;
  head[3] = len & 0xff;
  const mask = crypto.randomBytes(4);
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) {
    masked[i] = payload[i] ^ mask[i % 4];
  }
  return Buffer.concat([head, mask, masked]);
}

function parseWebsocketFrame(buf: Buffer): Buffer | null {
  if (!buf || buf.length < 2) return null;
  const b2 = buf[1];
  let offset = 2;
  let payloadLen = b2 & 0x7f;
  
  if (payloadLen === 126) {
    if (buf.length < 4) return null;
    payloadLen = buf.readUInt16BE(2);
    offset = 4;
  } else if (payloadLen === 127) {
    if (buf.length < 10) return null;
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
    for (let i = 0; i < payload.length; i++) {
      out[i] = payload[i] ^ mask[i % 4];
    }
    payload = out;
  }
  
  return payload;
}

// 获取页面数据（client-id 和频道列表）
async function getPageData(): Promise<PageData | null> {
  const cacheKey = 'page_data';
  const cached = pageDataCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached;
  }
  
  try {
    const response = await fetch('https://news.hbtv.com.cn/app/tv/431', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // 获取所有 Set-Cookie headers（Node.js fetch 需要特殊处理多个 Set-Cookie）
    const allSetCookies = response.headers.getSetCookie?.() || 
                         [response.headers.get('set-cookie') || ''];
    
    // 合并所有 Set-Cookie
    const setCookieStr = allSetCookies.join('; ');
    
    const clientIdMatch = setCookieStr.match(/client-id=([a-f0-9\-]+)/i);
    const clientTokenMatch = setCookieStr.match(/client-token=([^;]+)/i);
    const aalookMatch = setCookieStr.match(/aa-look=([0-9]+)/i);
    
    if (!clientIdMatch || !clientTokenMatch || !aalookMatch) {
      console.log('未找到 client-id、client-token 或 aa-look');
      console.log('Set-Cookie headers:', allSetCookies);
      return null;
    }
    
    const clientId = clientIdMatch[1];
    const clientToken = clientTokenMatch[1];
    const aalook = aalookMatch[1];
    
    // 构建完整的Cookie字符串（提取所有 Cookie 的name=value部分）
    const cookies: Record<string, string> = {};
    
    for (const cookieHeader of allSetCookies) {
      // 每个 Set-Cookie header 可能包含多个 cookie（用逗号分隔）
      const parts = cookieHeader.split(/,\s*(?=[a-zA-Z0-9_-]+=)/);
      for (const part of parts) {
        const match = part.match(/^([^=]+)=([^;]*)/);
        if (match) {
          cookies[match[1].trim()] = match[2].trim();
        }
      }
    }
    
    const fullCookies = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    
    console.log('获取到 client-id:', clientId);
    console.log('获取到 client-token:', clientToken.substring(0, 50) + '...');
    console.log('获取到 aa-look:', aalook);
    console.log('所有 Cookies:', Object.keys(cookies).join(', '));
    console.log('完整 Cookies:', fullCookies.substring(0, 200) + '...');
    const html = await response.text();
    
    // 提取频道列表
    const channels: Record<string, ChannelData> = {};
    
    // 提取 liveList（电视频道）
    const liveListMatch = html.match(/liveList:\s*\[(.*?)\]/s);
    if (liveListMatch) {
      const liveListStr = liveListMatch[1];
      const channelRegex = /\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",\s*stream:\s*"([^"]+)"/gs;
      let match;
      
      while ((match = channelRegex.exec(liveListStr)) !== null) {
        channels[match[1]] = {
          id: match[1],
          name: match[2],
          stream: match[3],
          type: 'tv'
        };
      }
    }
    
    // 提取 audioList（广播频道）
    const audioListMatch = html.match(/audioList:\s*\[(.*?)\]/s);
    if (audioListMatch) {
      const audioListStr = audioListMatch[1];
      const channelRegex = /\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)".*?stream:\s*"([^"]+)"/gs;
      let match;
      
      while ((match = channelRegex.exec(audioListStr)) !== null) {
        channels[match[1]] = {
          id: match[1],
          name: match[2],
          stream: match[3],
          type: 'radio'
        };
      }
    }
    
    const pageData: PageData = {
      clientId,
      clientToken,
      aalook,
      fullCookies,
      channels,
      timestamp: Date.now()
    };
    
    pageDataCache.set(cacheKey, pageData);
    return pageData;
    
  } catch (error) {
    console.error('获取页面数据失败:', error);
    return null;
  }
}

// 建立持久 WebSocket 连接并维持心跳（模拟原网站行为）
async function ensureWebSocketConnection(
  clientId: string,
  clientToken: string,
  aalook: string
): Promise<boolean> {
  // 如果连接已存在且参数相同，直接返回
  if (globalWebSocket && globalSocketReady && 
      currentClientId === clientId && 
      currentAalook === aalook) {
    console.log('使用现有的 WebSocket 连接');
    return true;
  }
  
  // 关闭旧连接
  if (globalWebSocket) {
    console.log('关闭旧的 WebSocket 连接');
    try {
      globalWebSocket.end();
      globalWebSocket.destroy();
    } catch (e) {}
    globalWebSocket = null;
    globalSocketReady = false;
  }
  
  // 清除旧的心跳定时器
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  return new Promise((resolve) => {
    const host = 'remote-wa.cjyun.org.cn';
    const port = 443;
    
    console.log('建立新的 WebSocket 连接到:', `${host}:${port}`);
    
    const socket = tls.connect({
      port,
      host,
      servername: host,
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
      ALPNProtocols: []
    }, () => {
      console.log('TLS 连接已建立');
      
      // 构造 WebSocket 握手请求
      const key = crypto.randomBytes(16).toString('base64');
      const reqLines = [
        `GET /liveweb HTTP/1.1`,
        `Host: ${host}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        'Origin: https://news.hbtv.com.cn',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        `Cookie: client-id=${clientId}; client-token=${clientToken}; aa-look=${aalook}`,
        '',
        ''
      ];
      const reqStr = reqLines.join('\r\n');
      
      socket.write(reqStr, () => {
        console.log('WebSocket 握手请求已发送');
      });
    });
    
    let handshakeDone = false;
    let acc = Buffer.alloc(0);
    let resolved = false;
    
    socket.on('data', (chunk: Buffer) => {
      acc = Buffer.concat([acc, chunk]);
      
      if (!handshakeDone) {
        const s = acc.toString('utf8');
        if (s.indexOf('Sec-Websocket-Accept') !== -1 || s.indexOf('101') !== -1) {
          console.log('WebSocket 握手成功');
          handshakeDone = true;
          
          // 保存全局连接
          globalWebSocket = socket;
          globalSocketReady = true;
          currentClientId = clientId;
          currentClientToken = clientToken;
          currentAalook = aalook;
          
          // 立即发送第一次心跳（与原网站一致）
          const heartbeat = JSON.stringify({
            client_id: clientId,
            aa_look: aalook,
            client_token: clientToken
          });
          
          const frame = encodeWebsocketPayload(heartbeat);
          socket.write(frame, () => {
            console.log('WebSocket 首次心跳已发送');
          });
          
          // 设置定时心跳（每10秒发送一次，与原网站一致）
          heartbeatInterval = setInterval(() => {
            if (globalWebSocket && globalSocketReady) {
              const heartbeat = JSON.stringify({
                client_id: clientId,
                aa_look: aalook,
                client_token: clientToken
              });
              
              const frame = encodeWebsocketPayload(heartbeat);
              try {
                globalWebSocket.write(frame, () => {
                  console.log('WebSocket 定时心跳:', new Date().toISOString());
                });
              } catch (e) {
                console.error('心跳发送失败:', e);
                globalSocketReady = false;
              }
            }
          }, 10 * 1000); // 10秒间隔
          
          acc = Buffer.alloc(0);
          
          // 返回成功
          if (!resolved) {
            resolved = true;
            resolve(true);
          }
        }
      } else {
        // 收到服务器响应
        const payload = parseWebsocketFrame(acc);
        if (payload) {
          console.log('收到服务器心跳响应:', payload.toString('utf8').substring(0, 100));
          acc = Buffer.alloc(0);
        }
      }
    });
    
    socket.on('error', (error) => {
      console.error('Socket 错误:', error.message);
      globalSocketReady = false;
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });
    
    socket.on('close', () => {
      console.log('Socket 已关闭，准备重连');
      globalSocketReady = false;
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      // 5秒后尝试重连（模拟原网站行为）
      setTimeout(() => {
        if (!globalSocketReady) {
          console.log('尝试重新建立 WebSocket 连接...');
          ensureWebSocketConnection(currentClientId, currentClientToken, currentAalook).catch(console.error);
        }
      }, 5000);
    });
    
    // 超时保护
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        // 即使握手未完成，也返回成功，让后续请求继续
        console.log('WebSocket 初始化超时（但可能仍在进行中）');
        resolve(true);
      }
    }, 5000);
  });
}

// 获取真实播放地址（调用 get_cdn_leech API）
async function getRealPlayUrl(streamUrl: string, clientId: string, fullCookies: string): Promise<string | null> {
  const cacheKey = `play_url_${streamUrl}`;
  const cached = playUrlCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.url;
  }
  
  try {
    const apiUrl = `https://news.hbtv.com.cn/ajax/get_cdn_leech?url=${encodeURIComponent(streamUrl)}&client-id=${clientId}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://news.hbtv.com.cn/',
        'Origin': 'https://news.hbtv.com.cn',
        'Cookie': fullCookies  // 🔥 关键：传递完整的 cookies
      }
    });
    
    const result = await response.json() as { state: boolean; data: string };
    
    if (result.state && result.data) {
      playUrlCache.set(cacheKey, {
        url: result.data,
        timestamp: Date.now()
      });
      return result.data;
    }
    
    return null;
    
  } catch (error) {
    console.error('获取播放地址失败:', error);
    return null;
  }
}

// 代理 M3U8 内容
async function proxyM3U8(m3u8Url: string, channelId: string, baseUrl: string, fullCookies: string, aalook: string): Promise<Response> {
  try {
    console.log('代理 M3U8 URL:', m3u8Url);
    
    // 更新 Cookie 中的 aa-look 值（使用 URL 中的 aalook）
    let cookieStr = fullCookies;
    if (aalook) {
      // 替换或添加 aa-look
      if (cookieStr.includes('aa-look=')) {
        cookieStr = cookieStr.replace(/aa-look=[^;]+/, `aa-look=${aalook}`);
      } else {
        cookieStr += `; aa-look=${aalook}`;
      }
    }
    console.log('使用 Cookie:', cookieStr.substring(0, 100) + '...');
    console.log('请求 Headers:', {
      'Accept': '*/*',
      'Cookie': cookieStr.substring(0, 50) + '...',
      'Origin': 'https://news.hbtv.com.cn',
      'Referer': 'https://news.hbtv.com.cn/'
    });
    
    const response = await fetch(m3u8Url, {
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Cookie': cookieStr,
        'Origin': 'https://news.hbtv.com.cn',
        'Referer': 'https://news.hbtv.com.cn/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
      }
    });
    
    console.log('M3U8 响应状态:', response.status);
    console.log('M3U8 响应 Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      // 获取详细错误信息
      const errorHeaders = Array.from(response.headers.entries());
      console.log('M3U8 错误 Headers:', errorHeaders);
      const errorText = await response.text();
      console.log('M3U8 错误响应:', errorText.substring(0, 200));
      return new Response(`M3U8 获取失败: ${response.status}`, { status: 502 });
    }
    
    let content = await response.text();
    
    // 重写 TS 文件链接
    const lines = content.split('\n');
    const output: string[] = [];
    
    // 从 M3U8 URL 中提取 CDN base URL（用于相对路径的 TS 文件）
    const cdnBaseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/'));
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 如果是 TS 文件行
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        // TS URL 可能是相对路径或完整URL
        let tsUrl: string;
        if (trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://')) {
          // 完整 URL
          tsUrl = trimmedLine;
        } else {
          // 相对路径，需要拼接 CDN base URL
          tsUrl = `${cdnBaseUrl}/${trimmedLine}`;
        }
        
        // 重写为代理URL（baseUrl 是代理服务器的地址，包含协议）
        const proxyUrl = `${baseUrl}/api/hubei1?id=${channelId}&ts=${encodeURIComponent(tsUrl)}`;
        output.push(proxyUrl);
      } else {
        output.push(line);
      }
    }
    
    return new Response(output.join('\n'), {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'max-age=10'
      }
    });
    
  } catch (error) {
    console.error('M3U8 代理失败:', error);
    return new Response('M3U8 代理失败', { status: 502 });
  }
}

// 代理 TS 文件
async function proxyTS(tsUrl: string, fullCookies: string, aalook: string): Promise<Response> {
  try {
    console.log('代理 TS URL:', tsUrl);
    
    // 更新 Cookie 中的 aa-look 值
    let cookieStr = fullCookies;
    if (aalook) {
      if (cookieStr.includes('aa-look=')) {
        cookieStr = cookieStr.replace(/aa-look=[^;]+/, `aa-look=${aalook}`);
      } else {
        cookieStr += `; aa-look=${aalook}`;
      }
    }
    
    const response = await fetch(tsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://news.hbtv.com.cn/',
        // 使用完整的 Cookie
        'Cookie': cookieStr
      }
    });
    
    if (!response.ok) {
      return new Response('TS 文件获取失败', { status: 502 });
    }
    
    return new Response(response.body, {
      headers: {
        'Content-Type': 'video/MP2T',
        'Cache-Control': 'max-age=60'
      }
    });
    
  } catch (error) {
    console.error('TS 代理失败:', error);
    return new Response('TS 代理失败', { status: 502 });
  }
}

// 查找频道
function findChannel(id: string, channels: Record<string, ChannelData>): ChannelData | null {
  // 1. 尝试友好ID
  if (CHANNEL_NAME_MAP[id]) {
    const numId = CHANNEL_NAME_MAP[id].toString();
    return channels[numId] || null;
  }
  
  // 2. 尝试数字ID
  if (ID_MAP[id]) {
    const friendlyId = ID_MAP[id];
    const numId = CHANNEL_NAME_MAP[friendlyId].toString();
    return channels[numId] || null;
  }
  
  // 3. 直接使用数字ID
  return channels[id] || null;
}

function getBaseUrl(request: NextRequest): string {
  const host = getRealHost(request);
  // 检查协议：优先使用 x-forwarded-proto，否则根据 host 判断
  const proto = request.headers.get('x-forwarded-proto') || 
                (host.includes('localhost') || process.env.NODE_ENV === 'development' ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const tsFile = searchParams.get('ts');
  const host = getRealHost(request);
  const baseUrl = getBaseUrl(request);
  
  // 获取页面数据
  const pageData = await getPageData();
  
  if (!pageData) {
    return new Response('无法获取页面数据', { status: 502 });
  }
  
  // 返回频道列表
  if (id === 'list') {
    const lines = ['#EXTM3U', '#PLAYLIST:湖北TV频道列表', ''];
    
    for (const [numId, channel] of Object.entries(pageData.channels)) {
      const friendlyId = ID_MAP[numId] || numId;
      const icon = channel.type === 'tv' ? '📺' : '📻';
      lines.push(`#EXTINF:-1 tvg-id="${numId}" tvg-name="${channel.name}" group-title="湖北${channel.type}",${icon} ${channel.name}`);
      lines.push(`${baseUrl}/api/hubei1?id=${friendlyId}`);
    }
    
    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Cache-Control': 'max-age=300'
      }
    });
  }
  
  if (!id) {
    return new Response('缺少频道ID', { status: 400 });
  }
  
  // 如果是 TS 文件请求
  if (tsFile) {
    // tsFile 参数已经是完整的 TS URL（经过 URL encoded）
    // 从 TS URL 中提取 aalook 参数
    const aalookMatch = tsFile.match(/[&?]aalook=([a-f0-9]+)/i);
    const urlAalook = aalookMatch ? aalookMatch[1] : pageData.aalook;
    
    return proxyTS(tsFile, pageData.fullCookies, urlAalook);
  }
  
  // 查找频道
  const channel = findChannel(id, pageData.channels);
  
  if (!channel) {
    return new Response('频道不存在', { status: 404 });
  }
  
  // 确保 WebSocket 心跳连接已建立（使用 Cookie 中的 aa-look，与原网站一致）
  // ⚠️ 必须保持心跳！没有心跳会导致 M3U8 返回 403 Forbidden
  console.log('确保 WebSocket 心跳连接已建立...');
  await ensureWebSocketConnection(pageData.clientId, pageData.clientToken, pageData.aalook);
  
  // 再获取真实播放地址（带 extrakey 和 aalook）
  const realPlayUrl = await getRealPlayUrl(channel.stream, pageData.clientId, pageData.fullCookies);
  
  if (!realPlayUrl) {
    return new Response('无法获取播放地址', { status: 502 });
  }
  
  // 从 URL 中提取 aalook 参数（这是 get_cdn_leech 返回的新的 aalook）
  const aalookMatch = realPlayUrl.match(/[&?]aalook=([a-f0-9]+)/i);
  const urlAalook = aalookMatch ? aalookMatch[1] : pageData.aalook;
  console.log('URL中的 aalook:', urlAalook);
  
  // 代理 M3U8 内容并重写 TS URLs
  console.log('代理 M3U8 并重写 TS URLs');
  return proxyM3U8(realPlayUrl, id, baseUrl, pageData.fullCookies, urlAalook);
}
