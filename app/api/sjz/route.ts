/**
 * 石家庄TV API路由
 * 支持石家庄电视台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const API_URL = 'http://mapi.sjzntv.cn/api/v1/channel.php';

/**
 * 获取播放地址
 */
async function getStreamUrl(id: string): Promise<string | null> {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) return null;

    // 直接解析JSON
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return null;
    }

    // 查找匹配的频道
    for (const item of data) {
      if (item.id && String(item.id) === String(id)) {
        if (item.m3u8) {
          // JSON反转义
          return item.m3u8.replace(/\\\//g, '/');
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
  const id = searchParams.get('id') || '4';

  if (id === 'list') {
    return new NextResponse(
      'Please check the API for available channel IDs\nAPI: http://mapi.sjzntv.cn/api/v1/channel.php',
      {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }

  // 获取播放地址
  const streamUrl = await getStreamUrl(id);

  if (!streamUrl) {
    return new NextResponse(`Channel not found: ${id}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
