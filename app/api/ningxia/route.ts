/**
 * 宁夏TV API - Next.js Edge Runtime
 * 
 * 支持频道:
 * - 56: 宁夏卫视
 * - 111: 宁夏公共
 * - 61: 宁夏经济
 * - 71: 宁夏文旅
 * - 67: 宁夏少儿(暂不可用)
 * 
 * 特性:
 * - 全链路代理 (m3u8 + ts 切片)
 * - 自定义 User-Agent 和 Referer
 * - WAF 防护绕过
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

// 频道配置类型
interface ChannelInfo {
  name: string;
  code: string;
  url?: string; // 固定的播放地址(用于网页地址错误的频道)
  disabled?: boolean;
}

// 频道配置
const CHANNELS: Record<string, ChannelInfo> = {
  '56': { name: '宁夏卫视', code: 'nxws' },
  '111': { name: '宁夏公共', code: 'nxgg' },
  '61': { name: '宁夏经济', code: 'nxjj' },
  '71': { name: '宁夏文旅', code: 'nxwl' },
  '67': { name: '宁夏少儿', code: 'nxse', url: 'https://hls.ningxiahuangheyun.com/live/nxse1M.m3u8' },
};

// 自定义请求头
const CUSTOM_HEADERS = {
  'User-Agent': 'aliplayer(appv=1.1.4&av=7.2.0&av2=7.2.0_44961357&os=android&ov=12&dm=SM-A5560)',
  'Referer': 'https://api.chinaaudiovisual.cn/',
};

/**
 * 获取频道播放地址
 */
async function getChannelUrl(channelId: string): Promise<string> {
  // 检查是否有固定的播放地址
  const channel = CHANNELS[channelId];
  if (channel?.url) {
    return channel.url;
  }

  const response = await fetch('https://www.nxtv.com.cn/19/19kds/dsp/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch channel list: ${response.status}`);
  }

  const html = await response.text();
  
  // 提取播放地址
  const pattern = new RegExp(`id="${channelId}"[^}]*"liveUrl":"([^"]+)"`);
  const match = html.match(pattern);
  
  if (!match) {
    throw new Error(`Channel ${channelId} not found`);
  }

  // 解码 JSON 转义字符
  return match[1].replace(/\\\/\//g, '://').replace(/\\\//g, '/');
}

/**
 * 获取并处理 m3u8 内容
 */
async function getM3u8Content(url: string, baseUrl: string, channelId: string): Promise<string> {
  const response = await fetch(url, {
    headers: CUSTOM_HEADERS,
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch m3u8: ${response.status}`);
  }

  const content = await response.text();
  const finalUrl = response.url; // 重定向后的最终 URL
  
  // 获取 m3u8 的基础路径(使用重定向后的 URL)
  const m3u8BaseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
  
  // 替换 ts 切片为代理 URL
  const lines = content.split('\n');
  const processedLines = lines.map(line => {
    const trimmedLine = line.trim();
    
    // 跳过注释行和空行
    if (trimmedLine.startsWith('#') || trimmedLine === '') {
      return line;
    }
    
    // 处理 ts 文件
    if (trimmedLine.endsWith('.ts')) {
      // 构造完整的 ts URL
      const tsUrl = trimmedLine.startsWith('http') 
        ? trimmedLine 
        : m3u8BaseUrl + trimmedLine;
      
      // 返回代理 URL
      return `${baseUrl}/api/ningxia?id=${channelId}&ts=${encodeURIComponent(tsUrl)}`;
    }
    
    return line;
  });
  
  return processedLines.join('\n');
}

/**
 * 代理 ts 切片
 */
async function proxyTsSegment(tsUrl: string): Promise<Response> {
  const response = await fetch(tsUrl, {
    headers: CUSTOM_HEADERS,
  });

  if (!response.ok) {
    return new NextResponse(`ts代理失败 (HTTP ${response.status})`, {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp2t',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

/**
 * 生成 M3U 播放列表
 */
function generatePlaylist(baseUrl: string): string {
  const lines = ['#EXTM3U'];
  
  for (const [id, info] of Object.entries(CHANNELS)) {
    if (info.disabled) continue;
    lines.push(`#EXTINF:-1,${info.name}`);
    lines.push(`${baseUrl}/api/ningxia?id=${id}`);
  }
  
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('id');
    const tsUrl = searchParams.get('ts');

    // 获取基础 URL (使用 getRealHost 确保正确)
    const realHost = getRealHost(request);
    const baseUrl = `${request.nextUrl.protocol}//${realHost}`;

    // 生成播放列表
    if (channelId === 'list') {
      const playlist = generatePlaylist(baseUrl);
      return new NextResponse(playlist, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 代理 ts 切片
    if (tsUrl) {
      return await proxyTsSegment(tsUrl);
    }

    // 检查频道 ID
    if (!channelId) {
      const channelList = Object.entries(CHANNELS)
        .filter(([_, info]) => !info.disabled)
        .map(([id, info]) => `${id} - ${info.name}`)
        .join('\n');
      
      return new NextResponse(
        `错误: 缺少频道ID参数\n\n支持的频道:\n${channelList}\n\n使用方法:\n/api/ningxia?id=56\n/api/ningxia?id=list (M3U播放列表)`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }
      );
    }

    // 验证频道 ID
    if (!(channelId in CHANNELS)) {
      const channelList = Object.entries(CHANNELS)
        .filter(([_, info]) => !info.disabled)
        .map(([id, info]) => `${id} - ${info.name}`)
        .join('\n');
      
      return new NextResponse(
        `错误: 频道ID '${channelId}' 不存在\n\n支持的频道:\n${channelList}`,
        {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }
      );
    }

    // 获取频道播放地址
    const channelUrl = await getChannelUrl(channelId);
    
    // 获取并处理 m3u8 内容
    const m3u8Content = await getM3u8Content(channelUrl, baseUrl, channelId);
    
    return new NextResponse(m3u8Content, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('宁夏TV API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new NextResponse(`错误: ${errorMessage}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

export const runtime = 'edge';
