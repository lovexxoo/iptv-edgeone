import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';
import { md5 } from '../utils/crypto';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fetch from 'node-fetch';

export const runtime = 'nodejs';

// 新疆TV频道映射表
const CHANNEL_MAP: Record<string, { id: number; code: string }> = {
  'xjws': { id: 1, code: 'xjtv1' },    // 新疆卫视
  'wyzh': { id: 3, code: 'xjtv2' },    // 维吾尔语新闻综合
  'hazh': { id: 4, code: 'xjtv3' },    // 哈萨克语新闻综合
  'hyzy': { id: 16, code: 'xjtv4' },   // 汉语综艺
  'wyys': { id: 17, code: 'xjtv5' },   // 维吾尔语影视
  'hyty': { id: 21, code: 'xjtv10' },  // 汉语体育健康
  'xjse': { id: 23, code: 'xjtv12' },  // 少儿频道
};

// 频道名称映射
const CHANNEL_NAMES: Record<string, string> = {
  'xjws': '新疆卫视',
  'wyzh': '维吾尔语新闻综合',
  'hazh': '哈萨克语新闻综合',
  'hyzy': '汉语综艺',
  'wyys': '维吾尔语影视',
  'hyty': '汉语体育健康',
  'xjse': '少儿频道',
};

// 新疆TV API配置
const API_URL = 'https://slstapi.xjtvs.com.cn/api/TVLiveV100/TVChannelList';
const SIGN_SECRET = '@#@$AXdm123%)(ds';
const STREAM_BASE = 'https://slstplay.xjtvs.com.cn';

// SOCKS5代理配置
const PROXY_HOST = '211.149.141.71';
const PROXY_PORT = 27574;
const PROXY_URL = `socks5://${PROXY_HOST}:${PROXY_PORT}`;

// 请求头配置
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://www.xjtvs.com.cn/',
};

// 生成API签名
function generateSign(timestamp: string): string {
  const signStr = `${SIGN_SECRET}${timestamp}api/TVLiveV100/TVChannelList`;
  return md5(signStr);
}

// 获取M3U8播放列表（全链路代理）
async function getM3U8Playlist(channelId: string, host: string, pathname: string): Promise<Response> {
  const channelInfo = CHANNEL_MAP[channelId];
  if (!channelInfo) {
    return new NextResponse('Invalid channel ID', { status: 400 });
  }

  const timestamp = String(Date.now());
  const sign = generateSign(timestamp);
  const apiUrl = `${API_URL}?type=1&stamp=${timestamp}&sign=${sign}&json=true`;

  try {
    // 创建SOCKS5代理agent
    const agent = new SocksProxyAgent(PROXY_URL);

    // 1. 获取流地址(通过代理)
    const response = await fetch(apiUrl, {
      headers: DEFAULT_HEADERS,
      agent,
    });

    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      return new NextResponse(`Failed to fetch stream info: ${response.status}`, { status: 502 });
    }

    const json: any = await response.json();
    console.log('API response:', json.success ? 'success' : json.message);

    // 查找对应频道的流地址
    let streamUrl: string | null = null;
    if (json?.success && json?.data) {
      for (const channel of json.data) {
        if (channel.Id === channelInfo.id) {
          streamUrl = channel.PlayStreamUrl;
          break;
        }
      }
    }

    if (!streamUrl) {
      return new NextResponse('Stream URL not found', { status: 404 });
    }

    // 2. 获取M3U8内容(通过代理)
    console.log('Fetching M3U8 from:', streamUrl);
    const m3u8Response = await fetch(streamUrl, {
      headers: DEFAULT_HEADERS,
      agent,
    });

    if (!m3u8Response.ok) {
      console.error(`M3U8 fetch failed: ${m3u8Response.status}`);
      return new NextResponse(`Failed to fetch M3U8: ${m3u8Response.status}`, { status: 502 });
    }

    let m3u8Content = await m3u8Response.text();

    // 3. 替换TS文件路径为代理路径
    const tsBaseUrl = `${STREAM_BASE}/${channelInfo.code}/`;
    const proxyBaseUrl = `http://${host}${pathname}?ts=`;
    
    m3u8Content = m3u8Content.replace(
      /([^\s]+\.ts[^\s]*)/gi,
      (match: string) => `${proxyBaseUrl}${tsBaseUrl}${match}`
    );

    return new NextResponse(m3u8Content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in getM3U8Playlist:', error);
    return new NextResponse(`Internal server error: ${error}`, { status: 500 });
  }
}

// 代理TS文件
async function proxyTSFile(tsUrl: string): Promise<Response> {
  try {
    // 创建SOCKS5代理agent
    const agent = new SocksProxyAgent(PROXY_URL);

    const response = await fetch(tsUrl, {
      headers: DEFAULT_HEADERS,
      agent,
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch TS file', { status: 502 });
    }

    // 读取完整的响应体
    const arrayBuffer = await response.arrayBuffer();
    
    // 返回TS文件
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'video/MP2T',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error proxying TS:', error);
    return new NextResponse('Failed to proxy TS file', { status: 500 });
  }
}

// 动态获取API中的所有可用频道
async function getAvailableChannels(): Promise<Array<{ id: number; code: string; name: string }>> {
  const timestamp = String(Date.now());
  const sign = generateSign(timestamp);
  const apiUrl = `${API_URL}?type=1&stamp=${timestamp}&sign=${sign}&json=true`;
  
  const agent = new SocksProxyAgent(PROXY_URL);
  
  try {
    const response = await fetch(apiUrl, {
      headers: DEFAULT_HEADERS,
      agent,
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch channel list: ${response.status}`);
      return [];
    }
    
    const json: any = await response.json();
    
    if (json?.success && json?.data) {
      // 从API返回的数据中提取频道信息
      const channels = json.data.map((ch: any) => {
        const codeMatch = ch.PlayStreamUrl.match(/xjtv\d+/);
        return {
          id: ch.Id,
          code: codeMatch ? codeMatch[0] : `xjtv${ch.Id}`,
          name: ch.Name || `频道${ch.Id}`,
        };
      });
      return channels;
    }
  } catch (error) {
    console.error('Error fetching available channels:', error);
  }
  
  return [];
}

// 生成播放列表
async function generatePlaylist(req: NextRequest, dynamic: boolean = false): Promise<string> {
  const host = getRealHost(req);
  const pathname = new URL(req.url).pathname;

  let m3u = '#EXTM3U\n';

  if (dynamic) {
    // 动态模式: 从API获取最新的可用频道
    const apiChannels = await getAvailableChannels();
    
    if (apiChannels.length > 0) {
      for (const channel of apiChannels) {
        // 从CHANNEL_MAP中查找对应的channelId
        const channelId = Object.keys(CHANNEL_MAP).find(
          key => CHANNEL_MAP[key].id === channel.id
        );
        
        if (channelId) {
          const name = CHANNEL_NAMES[channelId] || channel.name;
          m3u += `#EXTINF:-1 group-title="新疆",${name}\n`;
          m3u += `http://${host}${pathname}?id=${channelId}\n`;
        } else {
          // API中有但CHANNEL_MAP中没有的频道，使用ID直接访问
          m3u += `#EXTINF:-1 group-title="新疆",${channel.name}\n`;
          m3u += `http://${host}${pathname}?id=${channel.id}\n`;
        }
      }
      return m3u;
    }
  }
  
  // 静态模式或动态模式失败时: 使用本地配置
  for (const [channelId, channelInfo] of Object.entries(CHANNEL_MAP)) {
    const name = CHANNEL_NAMES[channelId] || channelId;
    m3u += `#EXTINF:-1 group-title="新疆",${name}\n`;
    m3u += `http://${host}${pathname}?id=${channelId}\n`;
  }

  return m3u;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || 'xjws';
  const tsUrl = searchParams.get('ts');

  // 如果有ts参数，代理TS文件
  if (tsUrl) {
    return proxyTSFile(tsUrl);
  }

  // 生成播放列表
  if (id === 'list') {
    // 检查是否使用动态模式 (?id=list&all=1)
    const dynamic = searchParams.get('all') === '1';
    const playlist = await generatePlaylist(req, dynamic);
    return new NextResponse(playlist, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=UTF-8',
        'Cache-Control': dynamic ? 'no-cache' : 'public, max-age=3600',
      },
    });
  }

  const host = req.headers.get('host') || '';
  const pathname = new URL(req.url).pathname;

  // 返回M3U8播放列表（全链路代理）
  return getM3U8Playlist(id, host, pathname);
}
