/**
 * 江苏TV API路由 - DEBUG版本
 * 包含详细日志输出
 */

import { NextRequest, NextResponse } from 'next/server';
import { md5 } from '../utils/crypto';

export const runtime = 'edge';

// 频道映射表
const CHANNEL_MAP: { [key: string]: number } = {
  'jsws': 670, 'jsws4k': 676, 'jsysjy': 654, 'jsgj': 652,
  'jsgg': 645, 'jsty': 646, 'jsys': 647, 'xwzh': 648,
  'jsyy': 650, 'jsjj': 657, 'jsxx': 651,
};

const CHANNEL_NAMES: { [key: string]: string } = {
  'jsws': '江苏卫视', 'jsws4k': '江苏卫视4K', 'jsysjy': '优漫卡通',
  'jsgj': '国际频道', 'jsgg': '公共·新闻', 'jsty': '体育休闲',
  'jsys': '城市', 'xwzh': '综艺', 'jsyy': '影视', 'jsjj': '教育',
  'jsxx': '学习',
};

// API配置
const APP_ID = '3b93c452b851431c8b3a076789ab1e14';
const SECRET = '9dd4b0400f6e4d558f2b3497d734c2b4';
const UUID = 'D5COmve6IQgwXvsJ4E3uxBstqxtDSCYW';

/**
 * 转换时间戳 - 原始正确算法
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
async function getAccessToken(): Promise<{token: string | null, debug: any}> {
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

  const debugInfo = {
    tm,
    signStr,
    sign,
    tt,
    apiAuthUrl,
    postData,
    response: null as any,
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

    debugInfo.response = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    };

    if (!response.ok) {
      debugInfo.response.body = await response.text();
      return { token: null, debug: debugInfo };
    }

    const data = await response.json();
    debugInfo.response.body = data;
    
    return { 
      token: data?.data?.accessToken || null, 
      debug: debugInfo 
    };
  } catch (error) {
    debugInfo.response = { error: String(error) };
    return { token: null, debug: debugInfo };
  }
}

/**
 * 获取播放地址
 */
async function getStreamUrl(extraId: number, authorization: string): Promise<{ url: string | null; debug?: any }> {
  const playDataUrl = 'https://publish-lizhi.jstv.com/nav/7510';
  const debugInfo: any = {
    extraId,
    apiUrl: playDataUrl,
  };

  try {
    const response = await fetch(playDataUrl, {
      headers: {
        'Authorization': `Bearer ${authorization}`,
      },
    });

    debugInfo.status = response.status;
    debugInfo.statusText = response.statusText;

    if (!response.ok) {
      debugInfo.error = 'Response not OK';
      return { url: null, debug: debugInfo };
    }

    const data = await response.json();
    debugInfo.dataStructure = {
      hasData: !!data?.data,
      hasChildList: !!data?.data?.childList,
      childListLength: data?.data?.childList?.length || 0,
      hasArticles: !!data?.data?.childList?.[0]?.articles,
      articlesCount: data?.data?.childList?.[0]?.articles?.length || 0,
    };

    // 查找对应频道
    if (data?.data?.childList?.[0]?.articles) {
      const articles = data.data.childList[0].articles;
      debugInfo.availableExtraIds = articles.map((a: any) => a.extraId);
      
      for (const article of articles) {
        // 注意: API返回的extraId是字符串,需要转换后比较
        if (String(article.extraId) === String(extraId)) {
          const url = article.extraJson?.url || null;
          debugInfo.found = true;
          debugInfo.url = url;
          return { url, debug: debugInfo };
        }
      }
      debugInfo.found = false;
      debugInfo.error = `extraId ${extraId} not found in articles`;
    } else {
      debugInfo.error = 'Invalid data structure';
    }

    return { url: null, debug: debugInfo };
  } catch (error) {
    debugInfo.error = String(error);
    return { url: null, debug: debugInfo };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('channel');
  const debug = searchParams.get('debug') === '1';

  if (!id) {
    return new NextResponse('Missing channel parameter', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
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
  const { token: accessToken, debug: tokenDebug } = await getAccessToken();
  
  if (!accessToken) {
    return new NextResponse(JSON.stringify({
      error: 'Failed to get access token',
      tokenDebug,
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 获取流URL
  const streamResult = await getStreamUrl(extraId, accessToken);

  if (debug) {
    return new NextResponse(JSON.stringify({
      channel: id,
      channelName: CHANNEL_NAMES[id],
      extraId,
      tokenDebug,
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
      streamDebug: streamResult.debug,
      streamUrl: streamResult.url || 'Failed to get stream URL',
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!streamResult.url) {
    return new NextResponse('Failed to get stream URL', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new NextResponse(null, {
    status: 302,
    headers: { Location: streamResult.url },
  });
}
