/**
 * 河北TV API路由
 * 支持8个河北广播电视台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 频道映射表（数组索引）
const CHANNEL_MAP: { [key: string]: number } = {
  'hbws': 0,  // 河北卫视
  'hbjj': 1,  // 经济生活
  'nmpd': 2,  // 三农频道
  'hbds': 3,  // 河北都市
  'hbys': 4,  // 河北影视剧
  'hbse': 5,  // 少儿科教
  'hbgg': 6,  // 文旅·公共
  'hbsj': 7,  // 三佳购物
};

// 频道名称映射
const CHANNEL_NAMES: { [key: string]: string } = {
  'hbws': '河北卫视',
  'hbjj': '经济生活',
  'nmpd': '三农频道',
  'hbds': '河北都市',
  'hbys': '河北影视剧',
  'hbse': '少儿科教',
  'hbgg': '文旅·公共',
  'hbsj': '三佳购物',
};

const API_URL = 'http://console.cmc.hebtv.com/scms/api/com/article/getArticleList?catalogId=32557&siteId=1';

/**
 * 获取播放地址
 */
async function getStreamUrl(index: number): Promise<string | null> {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) return null;

    const text = await response.text();

    // 使用正则提取liveStream（每个频道有3个，取第一个）
    const liveStreamMatches = text.match(/"liveStream"\s*:\s*"([^"]+)"/g);
    const liveUriMatches = text.match(/"liveUri"\s*:\s*"([^"]+)"/g);
    const liveKeyMatches = text.match(/"liveKey"\s*:\s*"([^"]+)"/g);

    if (!liveStreamMatches || !liveUriMatches || !liveKeyMatches) {
      return null;
    }

    // 提取所有值
    const liveStreams = liveStreamMatches.map(m => m.match(/"([^"]+)"/)?.[1] || '');
    const liveUris = liveUriMatches.map(m => m.match(/"([^"]+)"/)?.[1] || '');
    const liveKeys = liveKeyMatches.map(m => m.match(/"([^"]+)"/)?.[1] || '');

    // 每个频道有3个liveStream，取第一个（index * 3）
    const streamIndex = index * 3;
    if (streamIndex >= liveStreams.length) return null;

    const liveStream = liveStreams[streamIndex];
    // 每个频道有2个liveUri/liveKey，取第一个（index * 2）
    const uriIndex = index * 2;
    const liveUri = liveUris[uriIndex] || '';
    const liveKey = liveKeys[uriIndex] || '';

    // 构建最终URL
    let finalUrl = liveStream;
    if (liveUri && liveKey) {
      const separator = liveStream.includes('?') ? '&' : '?';
      finalUrl = `${liveStream}${separator}${liveUri}=${liveKey}`;
    }

    return finalUrl;
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
  const id = searchParams.get('id') || 'hbws';

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
    
    const baseUrl = `${url.protocol}//${baseHost}/api/hebei`;

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
  const index = CHANNEL_MAP[id];
  if (index === undefined) {
    // 尝试数字ID
    const numericIndex = parseInt(id) - 1;
    if (numericIndex >= 0 && numericIndex < 8) {
      const streamUrl = await getStreamUrl(numericIndex);
      if (streamUrl) {
        return NextResponse.redirect(streamUrl, 302);
      }
    }

    return new NextResponse(
      `Channel not found: ${id}\nAvailable channels: ${Object.keys(CHANNEL_MAP).join(', ')}`,
      {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }

  // 获取播放地址
  const streamUrl = await getStreamUrl(index);

  if (!streamUrl) {
    return new NextResponse('Stream not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
