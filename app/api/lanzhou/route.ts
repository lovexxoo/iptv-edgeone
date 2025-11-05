import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

// 注释掉Edge Runtime以使用Node.js Runtime，避免chunked传输
// export const runtime = 'edge';

// 频道配置
const CHANNELS: Record<string, { path: string; type: 'tv' | 'gb'; name: string }> = {
  lzxwzh: { path: 'xwzh', type: 'tv', name: '兰州新闻综合' },
  lzwl: { path: 'wlpd', type: 'tv', name: '兰州文旅' },
  lzzhgb: { path: 'aac_zhgb', type: 'gb', name: '兰州新闻综合广播' },
  lzyygb: { path: 'aac_jtyy', type: 'gb', name: '兰州音乐广播' },
  lzwygb: { path: 'aac_shwy', type: 'gb', name: '兰州文艺广播' },
};

const BASE_URL = 'http://liveplus.lzr.com.cn/';

function getProtocol(req: NextRequest) {
  return req.headers.get('x-forwarded-proto') || 'https';
}

function buildSelfUrl(req: NextRequest, path: string) {
  return `${getProtocol(req)}://${getRealHost(req)}${path}`;
}

async function fetchWithHeaders(url: string) {
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1)',
      'Referer': 'http://lanzhoubcnew.zainanjing365.com/',
    },
    redirect: 'follow',
    cache: 'no-store',
  });
}

export async function GET(request: NextRequest) {
  const urlObj = new URL(request.url);
  const searchParams = urlObj.searchParams;
  const pathname = urlObj.pathname;
  const id = searchParams.get('id') || 'lzxwzh';
  const ts = searchParams.get('ts');

  // ===== ts/aac 切片代理 =====
  if (ts) {
    try {
      const tsUrl = decodeURIComponent(ts);
      const resp = await fetchWithHeaders(tsUrl);
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'video/MP2T',
            'Cache-Control': 'public, max-age=300',
          },
        });
      }
      return new NextResponse(`切片代理失败 (HTTP ${resp.status})`, { status: 502 });
    } catch (err) {
      return new NextResponse(`切片代理错误: ${err}`, { status: 500 });
    }
  }

  // ===== ?id=list 返回频道列表 =====
  if (id === 'list') {
    let m3u = '#EXTM3U\n';
    const selfUrl = buildSelfUrl(request, pathname);
    for (const [cid, cfg] of Object.entries(CHANNELS)) {
      m3u += `#EXTINF:-1,${cfg.name}\n`;
      m3u += `${selfUrl}?id=${cid}\n`;
    }
    return new NextResponse(m3u, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // ===== m3u8 代理 =====
  const channel = CHANNELS[id];
  if (!channel) {
    return new NextResponse(`错误: 未知频道ID "${id}"`, { status: 400 });
  }

  const m3u8Url = `${BASE_URL}${channel.path}/HD/live.m3u8`;
  const resp = await fetchWithHeaders(m3u8Url);
  
  if (!resp.ok) {
    return new NextResponse(`错误: 无法获取 m3u8 内容 (HTTP ${resp.status})`, { status: 502 });
  }
  
  let m3u8Content = await resp.text();
  const selfUrl = buildSelfUrl(request, pathname);
  
  if (channel.type === 'tv') {
    // 电视频道：代理 .ts 文件（模仿PHP版本，不编码URL以提高播放器兼容性）
    m3u8Content = m3u8Content.replace(/^([^#\s].+\.ts.*)$/gm, (match, tsPath) => {
      const trimmedPath = tsPath.trim();
      const fullTsUrl = /^https?:\/\//.test(trimmedPath) ? trimmedPath : BASE_URL + trimmedPath;
      return `${selfUrl}?ts=${fullTsUrl}`;
    });
  } else if (channel.type === 'gb') {
    // 广播频道：代理 .aac 文件（模仿PHP版本，不编码URL以提高播放器兼容性）
    // PHP原代码有个技巧：先替换aac_为aab_，正则替换后再换回来，避免误匹配文件名里的aac
    m3u8Content = m3u8Content.replace(/aac_/g, 'aab_');
    m3u8Content = m3u8Content.replace(/^([^#\s].+\.aac.*)$/gm, (match, aacPath) => {
      const trimmedPath = aacPath.trim();
      const fullAacUrl = /^https?:\/\//.test(trimmedPath) ? trimmedPath : BASE_URL + trimmedPath;
      return `${selfUrl}?ts=${fullAacUrl}`;
    });
    m3u8Content = m3u8Content.replace(/aab_/g, 'aac_');
  }
  
  // 直接返回字符串内容，Node.js Runtime会自动设置Content-Length
  return new NextResponse(m3u8Content, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
    },
  });
}
