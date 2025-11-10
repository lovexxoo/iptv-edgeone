import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';
import { xxteaDecrypt } from '../utils/crypto';

export const runtime = 'edge';

// 频道ID映射表
const CHANNEL_MAP: Record<string, number> = {
  // 内蒙古省级频道
  'nmws': 254,      // 内蒙古卫视
  'nmmyws': 126,    // 内蒙古蒙古语卫视
  'nmxwzh': 127,    // 内蒙古新闻综合
  'nmjjsh': 128,    // 内蒙古经济生活
  'nmse': 129,      // 内蒙古少儿频道
  'nmwtyl': 130,    // 内蒙古文体娱乐
  'nmnm': 131,      // 内蒙古农牧频道
  'nmwh': 132,      // 内蒙古蒙古语文化
  
  // 地市级频道
  'hhht1': 141,     // 呼和浩特新闻综合
  'xlgl1': 156,     // 锡林郭勒
  'als1': 157,      // 阿拉善新闻综合
  'byle1': 158,     // 巴彦淖尔
  'erds1': 159,     // 鄂尔多斯
  'cf1': 161,       // 赤峰新闻综合
  'tl1': 163,       // 通辽新闻综合
  'wlcb1': 164,     // 乌兰察布
  'wh1': 165,       // 乌海新闻综合
  'hlbe1': 166,     // 呼伦贝尔新闻综合
  'xa1': 167,       // 兴安新闻综合
  'bt1': 168,       // 包头新闻综合
};

// 频道名称映射表（用于生成播放列表）
const CHANNEL_NAMES: Record<string, string> = {
  // 内蒙古省级频道
  'nmws': '内蒙古卫视',
  'nmmyws': '内蒙古蒙古语卫视',
  'nmxwzh': '内蒙古新闻综合',
  'nmjjsh': '内蒙古经济生活',
  'nmse': '内蒙古少儿',
  'nmwtyl': '内蒙古文体娱乐',
  'nmnm': '内蒙古农牧',
  'nmwh': '内蒙古蒙古语文化',
  
  // 地市级频道
  'hhht1': '呼和浩特新闻综合',
  'xlgl1': '锡林郭勒',
  'als1': '阿拉善新闻综合',
  'byle1': '巴彦淖尔',
  'erds1': '鄂尔多斯',
  'cf1': '赤峰新闻综合',
  'tl1': '通辽新闻综合',
  'wlcb1': '乌兰察布',
  'wh1': '乌海新闻综合',
  'hlbe1': '呼伦贝尔新闻综合',
  'xa1': '兴安新闻综合',
  'bt1': '包头新闻综合',
};

// 分组信息
const CHANNEL_GROUPS: Record<string, string> = {
  'nmws': '内蒙古省级',
  'nmmyws': '内蒙古省级',
  'nmxwzh': '内蒙古省级',
  'nmjjsh': '内蒙古省级',
  'nmse': '内蒙古省级',
  'nmwtyl': '内蒙古省级',
  'nmnm': '内蒙古省级',
  'nmwh': '内蒙古省级',
  
  'hhht1': '内蒙古地市',
  'xlgl1': '内蒙古地市',
  'als1': '内蒙古地市',
  'byle1': '内蒙古地市',
  'erds1': '内蒙古地市',
  'cf1': '内蒙古地市',
  'tl1': '内蒙古地市',
  'wlcb1': '内蒙古地市',
  'wh1': '内蒙古地市',
  'hlbe1': '内蒙古地市',
  'xa1': '内蒙古地市',
  'bt1': '内蒙古地市',
};

// 播放列表缓存
const PLAYLIST_CACHE_TTL = 3600; // 缓存1小时（秒）
let playlistCache: {
  data: string;
  timestamp: number;
} | null = null;

// API密钥
const XXTEA_KEY = '5b28bae827e651b3';
const API_URL = 'https://api-bt.nmtv.cn/broadcast/list?size=100&type=1';

// 获取并解密频道数据
async function fetchChannelData(): Promise<any> {
  try {
    const response = await fetch(API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      return null;
    }
    
    const encryptedData = await response.text();
    
    // 移除引号
    const cleanData = encryptedData.replace(/"/g, '');
    
    // XXTEA解密（xxteaDecrypt内部会处理base64解码）
    const decrypted = xxteaDecrypt(cleanData, XXTEA_KEY);
    
    // 解析JSON
    const json = JSON.parse(decrypted);
    
    return json;
  } catch (error) {
    console.error('Error fetching channel data:', error);
    return null;
  }
}

// 根据频道ID查找流地址
async function getStreamUrl(channelId: string, format: string = 'm3u8'): Promise<string | null> {
  const targetId = CHANNEL_MAP[channelId];
  
  if (!targetId) {
    console.error(`Unknown channel ID: ${channelId}`);
    return null;
  }
  
  const data = await fetchChannelData();
  
  if (!data || !data.data) {
    return null;
  }
  
  for (const item of data.data) {
    if (item.data && item.data.id === targetId) {
      const streamUrls = item.data.streamUrls;
      
      if (!streamUrls || streamUrls.length === 0) {
        return null;
      }
      
      // streamUrls[0] = m3u8
      // streamUrls[2] = flv (如果存在)
      if (format === 'flv' && streamUrls[2]) {
        return streamUrls[2];
      }
      
      return streamUrls[0]; // 默认返回m3u8
    }
  }
  
  return null;
}

// 生成播放列表（精选频道）
async function generatePlaylist(req: NextRequest): Promise<string> {
  const host = getRealHost(req);
  const pathname = new URL(req.url).pathname;
  
  let m3u = '#EXTM3U\n';
  
  const data = await fetchChannelData();
  
  if (!data || !data.data) {
    return m3u;
  }
  
  // 创建ID到频道信息的映射
  const channelDataMap = new Map<number, any>();
  for (const item of data.data) {
    if (item.data && item.data.id) {
      channelDataMap.set(item.data.id, item.data);
    }
  }
  
  // 按照我们定义的顺序生成列表
  for (const [channelId, apiId] of Object.entries(CHANNEL_MAP)) {
    const channelData = channelDataMap.get(apiId);
    
    if (channelData && channelData.streamUrls && channelData.streamUrls.length > 0) {
      const name = CHANNEL_NAMES[channelId] || channelData.name || channelId;
      const group = CHANNEL_GROUPS[channelId] || '内蒙古';
      
      m3u += `#EXTINF:-1 group-title="${group}",${name}\n`;
      m3u += `http://${host}${pathname}?id=${channelId}\n`;
    }
  }
  
  return m3u;
}

// 生成完整播放列表（所有频道，动态）
async function generateFullPlaylist(req: NextRequest): Promise<string> {
  const host = getRealHost(req);
  const pathname = new URL(req.url).pathname;
  
  let m3u = '#EXTM3U\n';
  
  const data = await fetchChannelData();
  
  if (!data || !data.data) {
    return m3u;
  }
  
  // 创建反向映射：API ID -> 自定义ID
  const apiIdToChannelId = new Map<number, string>();
  for (const [channelId, apiId] of Object.entries(CHANNEL_MAP)) {
    apiIdToChannelId.set(apiId, channelId);
  }
  
  // 遍历所有API返回的频道
  for (const item of data.data) {
    if (item.data && item.data.id && item.data.streamUrls && item.data.streamUrls.length > 0) {
      const apiId = item.data.id;
      const channelData = item.data;
      
      // 如果是已知频道，使用自定义ID和名称
      if (apiIdToChannelId.has(apiId)) {
        const channelId = apiIdToChannelId.get(apiId)!;
        const name = CHANNEL_NAMES[channelId] || channelData.name || channelId;
        const group = CHANNEL_GROUPS[channelId] || '内蒙古';
        
        m3u += `#EXTINF:-1 group-title="${group}",${name}\n`;
        m3u += `http://${host}${pathname}?id=${channelId}\n`;
      } else {
        // 未知频道，使用API返回的原始数据
        const name = channelData.name || `频道${apiId}`;
        const group = '内蒙古其他';
        
        m3u += `#EXTINF:-1 group-title="${group}",${name}\n`;
        m3u += `http://${host}${pathname}?id=raw_${apiId}\n`;
      }
    }
  }
  
  return m3u;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || 'nmse';
  const r = searchParams.get('r') || 'm3u8';
  const showAll = searchParams.get('all') === '1';
  
  // 生成播放列表
  if (id === 'list') {
    const now = Date.now();
    const forceRefresh = searchParams.get('refresh') === '1';
    
    // 检查缓存
    if (!forceRefresh && playlistCache && (now - playlistCache.timestamp < PLAYLIST_CACHE_TTL * 1000)) {
      console.log('Returning cached playlist');
      return new NextResponse(playlistCache.data, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl; charset=UTF-8',
          'Cache-Control': `public, max-age=${PLAYLIST_CACHE_TTL}`,
          'X-Cache': 'HIT',
          'X-Cache-Time': new Date(playlistCache.timestamp).toISOString(),
        },
      });
    }
    
    // 生成新列表
    console.log(forceRefresh ? 'Force refresh playlist' : 'Generating new playlist');
    const playlist = showAll 
      ? await generateFullPlaylist(req)
      : await generatePlaylist(req);
    
    // 更新缓存
    playlistCache = {
      data: playlist,
      timestamp: now,
    };
    
    return new NextResponse(playlist, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=UTF-8',
        'Cache-Control': `public, max-age=${PLAYLIST_CACHE_TTL}`,
        'X-Cache': 'MISS',
        'X-Cache-Time': new Date(now).toISOString(),
      },
    });
  }
  
  // 处理raw_id格式（动态频道）
  if (id.startsWith('raw_')) {
    const apiId = parseInt(id.substring(4));
    if (!isNaN(apiId)) {
      const data = await fetchChannelData();
      if (data && data.data) {
        for (const item of data.data) {
          if (item.data && item.data.id === apiId) {
            const streamUrls = item.data.streamUrls;
            if (streamUrls && streamUrls.length > 0) {
              const format = r || 'm3u8';
              const streamUrl = (format === 'flv' && streamUrls[2]) ? streamUrls[2] : streamUrls[0];
              return NextResponse.redirect(streamUrl);
            }
          }
        }
      }
    }
    return new NextResponse('Channel not found', { status: 404 });
  }
  
  // 获取单个频道流地址
  const streamUrl = await getStreamUrl(id, r);
  
  if (!streamUrl) {
    return new NextResponse('Channel not found', { status: 404 });
  }
  
  // 302重定向到流地址
  return NextResponse.redirect(streamUrl);
}
