/**
 * 江苏TV API路由
 * 支持10个江苏广播电视台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { md5 } from '../utils/crypto';

export const runtime = 'edge';

// 频道映射表（extraId）
const CHANNEL_MAP: { [key: string]: number } = {
  'jsws': 670,    // 江苏卫视
  'jsws4k': 676,  // 江苏卫视4K超高清
  'jscs': 669,    // 江苏城市
  'jszy': 663,    // 江苏综艺
  'jsys': 664,    // 江苏影视
  'jsxw': 668,    // 江苏新闻
  'jsjy': 666,    // 江苏教育
  'jsxx': 665,    // 体育休闲
  'ymkt': 667,    // 优漫卡通
  'jsgj': 671,    // 江苏国际
};

// 频道名称映射
const CHANNEL_NAMES: { [key: string]: string } = {
  'jsws': '江苏卫视',
  'jsws4k': '江苏卫视4K',
  'jscs': '江苏城市',
  'jszy': '江苏综艺',
  'jsys': '江苏影视',
  'jsxw': '江苏新闻',
  'jsjy': '江苏教育',
  'jsxx': '体育休闲',
  'ymkt': '优漫卡通',
  'jsgj': '江苏国际',
};

const APP_ID = '3b93c452b851431c8b3a076789ab1e14';
const SECRET = '9dd4b0400f6e4d558f2b3497d734c2b4';
const UUID = 'D5COmve6IQgwXvsJ4E3uxBstqxtDSCYW';

/**
 * 转换时间戳
 */

/**
 * 转换时间戳
 */
function transformTimestamp(timestamp: number): number {
  const parts = [
    255 & timestamp,
    (timestamp & 65280) >> 8,
    (timestamp & 16711680) >> 16,
    (timestamp & 4278190080) >> 24,
  ];

  for (let i = 0; i < parts.length; i++) {
    parts[i] = ((240 & parts[i]) ^ 240) | ((1 + (parts[i] & 15)) & 15);
  }

  return (
    parts[3] |
    (((parts[2] << 8) << 32) >> 32) |
    (((parts[1] << 16) << 32) >> 32) |
    (((parts[0] << 24) << 32) >> 32)
  );
}

/**
 * 获取访问Token
 */
async function getAccessToken(): Promise<string | null> {
  const tm = Math.floor(Date.now() / 1000);
  const signStr = `${SECRET}/JwtAuth/GetWebToken?AppID=${APP_ID}appId${APP_ID}platform41uuid${UUID}${tm}`;
  const sign = md5(signStr);
  const tt = transformTimestamp(tm);

  const apiAuthUrl = `https://api-auth-lizhi.jstv.com/JwtAuth/GetWebToken?AppID=${APP_ID}&TT=${tt}&Sign=${sign}`;

  const postData = {
    platform: 41,
    uuid: UUID,
    appId: APP_ID,
  };

  try {
    const response = await fetch(apiAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://live.jstv.com/',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.data?.accessToken || null;
  } catch (error) {
    console.error('Get access token error:', error);
    return null;
  }
}

/**
 * 获取播放地址
 */
async function getStreamUrl(extraId: number, authorization: string): Promise<string | null> {
  const playDataUrl = 'https://publish-lizhi.jstv.com/nav/7510';

  try {
    const response = await fetch(playDataUrl, {
      headers: {
        'Authorization': `Bearer ${authorization}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    // 查找对应频道
    if (data?.data?.childList?.[0]?.articles) {
      for (const article of data.data.childList[0].articles) {
        if (article.extraId === extraId) {
          return article.extraJson?.url || null;
        }
      }
    }

    return null;
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
  const id = searchParams.get('id') || 'jsws';

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
    
    const baseUrl = `${url.protocol}//${baseHost}/api/jiangsu`;

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
  if (!CHANNEL_MAP[id]) {
    return new NextResponse(
      `Channel not found: ${id}\nAvailable channels: ${Object.keys(CHANNEL_MAP).join(', ')}`,
      {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }

  const extraId = CHANNEL_MAP[id];

  // 获取访问Token
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return new NextResponse('Failed to get access token', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 获取播放地址
  const streamUrl = await getStreamUrl(extraId, accessToken);

  if (!streamUrl) {
    return new NextResponse('Stream not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
