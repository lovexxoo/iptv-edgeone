import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

export const runtime = 'edge';

// 海南TV频道映射表
const CHANNEL_MAP: Record<string, string> = {
  'hnws': 'STHaiNan_channel_lywsgq',   // 海南卫视
  'ssws': 'STHaiNan_channel_ssws',     // 三沙卫视
  'xwpd': 'STHaiNan_channel_xwpd',     // 海南新闻频道
  'wlpd': 'wlpd',                       // 海南文旅频道
  'jjpd': 'jjpd',                       // 海南自贸频道
  'ggpd': 'ggpd',                       // 海南公共频道
  'sepd': 'sepd',                       // 海南少儿频道
};

// 频道名称映射
const CHANNEL_NAMES: Record<string, string> = {
  'hnws': '海南卫视',
  'ssws': '三沙卫视',
  'xwpd': '海南新闻',
  'wlpd': '海南文旅',
  'jjpd': '海南自贸',
  'ggpd': '海南公共',
  'sepd': '海南少儿',
};

// 频道分组
const CHANNEL_GROUPS: Record<string, string> = {
  'hnws': '海南卫视',
  'ssws': '海南卫视',
  'xwpd': '海南地面',
  'wlpd': '海南地面',
  'jjpd': '海南地面',
  'ggpd': '海南地面',
  'sepd': '海南地面',
};

// 海南TV API基础URL
const API_BASE = 'http://ps.hnntv.cn/ps/livePlayUrl';

// 缓存配置
const STREAM_CACHE_TTL = 300; // 5分钟
let streamCache: Map<string, { url: string; timestamp: number }> = new Map();

// 获取频道流地址
async function getStreamUrl(channelId: string): Promise<string | null> {
  // 检查缓存
  const now = Date.now();
  const cached = streamCache.get(channelId);
  if (cached && (now - cached.timestamp < STREAM_CACHE_TTL * 1000)) {
    return cached.url;
  }

  const channelCode = CHANNEL_MAP[channelId];
  if (!channelCode) {
    console.error(`Unknown channel ID: ${channelId}`);
    return null;
  }

  const apiUrl = `${API_BASE}?appCode=&token=&channelCode=${channelCode}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      return null;
    }

    const text = await response.text();
    
    // 提取JSON中的url字段：使用正则匹配 "url":"..."
    const match = text.match(/"url":"([^"]+)"/);
    
    if (match && match[1]) {
      const streamUrl = match[1];
      
      // 更新缓存
      streamCache.set(channelId, {
        url: streamUrl,
        timestamp: now,
      });

      return streamUrl;
    }

    console.error('No valid URL found in response:', text.substring(0, 200));
    return null;
  } catch (error) {
    console.error('Error fetching stream URL:', error);
    return null;
  }
}

// 生成播放列表
async function generatePlaylist(req: NextRequest): Promise<string> {
  const host = getRealHost(req);
  const pathname = new URL(req.url).pathname;

  let m3u = '#EXTM3U\n';

  for (const [channelId, channelCode] of Object.entries(CHANNEL_MAP)) {
    const name = CHANNEL_NAMES[channelId] || channelId;
    const group = CHANNEL_GROUPS[channelId] || '海南';
    m3u += `#EXTINF:-1 group-title="${group}",${name}\n`;
    m3u += `http://${host}${pathname}?id=${channelId}\n`;
  }

  return m3u;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || 'hnws';

  // 生成播放列表
  if (id === 'list') {
    const playlist = await generatePlaylist(req);
    return new NextResponse(playlist, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // 获取单个频道流地址
  const streamUrl = await getStreamUrl(id);

  if (!streamUrl) {
    return new NextResponse('Channel not found or stream unavailable', { status: 404 });
  }

  // 302重定向到流地址
  return NextResponse.redirect(streamUrl);
}
