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

    const text = await response.text();

    // 简单JSON解析（避免完整JSON.parse）
    const idPattern = new RegExp(`"id"\\s*:\\s*${id}[,\\s]`, 'i');
    if (!idPattern.test(text)) return null;

    // 提取该ID对应的m3u8 URL
    const segments = text.split('"id"');
    for (const segment of segments) {
      if (segment.includes(`:${id},`) || segment.includes(`:${id}`)) {
        const m3u8Match = segment.match(/"m3u8"\s*:\s*"([^"]+)"/);
        if (m3u8Match) {
          return m3u8Match[1].replace(/\\\//g, '/');
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
