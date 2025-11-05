import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

// 注释掉Edge Runtime以使用Node.js Runtime，避免chunked传输
// export const runtime = 'edge';

// 频道配置
const CHANNELS: Record<string, string> = {
  gsws: '甘肃卫视',
  whys: '文化影视',
  ggyj: '公共应急',
  sepd: '少儿频道',
  dspd: '科教频道',
  ydds: '移动电视',
};

const SOURCE_URL = 'https://www.gstv.com.cn/zxc.jhtml';

function getProtocol(req: NextRequest) {
  return req.headers.get('x-forwarded-proto') || 'https';
}

function buildSelfUrl(req: NextRequest, path: string) {
  return `${getProtocol(req)}://${getRealHost(req)}${path}`;
}

async function fetchWithHeaders(url: string, headers: Record<string, string>) {
  return fetch(url, {
    headers,
    redirect: 'follow',
    cache: 'no-store',
  });
}

// 获取频道的m3u8地址
async function getChannelUrl(channelName: string): Promise<string | null> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
  
  const resp = await fetchWithHeaders(SOURCE_URL, headers);
  if (!resp.ok) return null;
  
  let html = await resp.text();
  // 移除所有换行符和多余空格
  html = html.replace(/\s+/g, ' ');
  
  // 匹配 data-url='...'> 频道名 </a>
  const pattern = new RegExp(`data-url='([^']+)'[^>]*>\\s*${channelName}\\s*</a>`, 'i');
  const match = html.match(pattern);
  
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  const urlObj = new URL(request.url);
  const searchParams = urlObj.searchParams;
  const pathname = urlObj.pathname;
  const id = searchParams.get('id') || 'gsws';
  const ts = searchParams.get('ts');

  // ===== ts 切片代理 =====
  if (ts) {
    try {
      const tsUrl = decodeURIComponent(ts);
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.gstv.com.cn/',
        'Origin': 'https://www.gstv.com.cn',
      };
      
      const resp = await fetchWithHeaders(tsUrl, headers);
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'video/mp2t',
            'Cache-Control': 'public, max-age=300',
          },
        });
      }
      return new NextResponse(`ts代理失败 (HTTP ${resp.status})`, { status: 502 });
    } catch (err) {
      return new NextResponse(`ts代理错误: ${err}`, { status: 500 });
    }
  }

  // ===== ?id=list 返回频道列表 =====
  if (id === 'list') {
    let m3u = '#EXTM3U\n';
    const selfUrl = buildSelfUrl(request, pathname);
    for (const [cid, cname] of Object.entries(CHANNELS)) {
      m3u += `#EXTINF:-1,${cname}\n`;
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
  const channelName = CHANNELS[id];
  if (!channelName) {
    return new NextResponse(`错误: 未知频道ID "${id}"`, { status: 400 });
  }

  // 获取原始m3u8地址
  const m3u8Url = await getChannelUrl(channelName);
  if (!m3u8Url) {
    return new NextResponse(`错误: 未找到频道 "${channelName}" 的播放地址`, { status: 404 });
  }

  // 获取m3u8内容
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.gstv.com.cn/',
    'Origin': 'https://www.gstv.com.cn',
  };
  
  const resp = await fetchWithHeaders(m3u8Url, headers);
  if (!resp.ok) {
    return new NextResponse(`错误: 无法获取 m3u8 内容 (HTTP ${resp.status})`, { status: 502 });
  }
  
  let m3u8Content = await resp.text();
  
  // 获取基础路径
  const baseUrl = m3u8Url.replace(/\/[^\/]+$/, '/');
  
  // 获取当前脚本URL（用于构造代理URL）
  const selfUrl = buildSelfUrl(request, pathname);
  
  // 替换ts切片为代理URL（不编码URL以提高播放器兼容性，如兰州PHP版本）
  m3u8Content = m3u8Content.replace(/^([^#\s].+\.ts.*)$/gm, (match, tsPath) => {
    const trimmedPath = tsPath.trim();
    // 构造完整的ts URL
    const fullTsUrl = /^https?:\/\//.test(trimmedPath) ? trimmedPath : baseUrl + trimmedPath;
    // 返回代理URL（不编码）
    return `${selfUrl}?ts=${fullTsUrl}`;
  });
  
  // 直接返回字符串内容，Node.js Runtime会自动设置Content-Length
  return new NextResponse(m3u8Content, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
    },
  });
}
