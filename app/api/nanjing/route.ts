import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '../utils/url';

export const runtime = 'edge';

const CHANNELS: Record<string, string> = {
  '109152': '新闻综合频道',
  '109153': '教育科技频道',
  '110094': '十八·生活频道',
  '110093': '文旅纪录频道',
  '110095': '少儿频道',
};

async function fetchText(url: string) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resp.ok) throw new Error(`upstream ${resp.status}`);
  return await resp.text();
}

export async function GET(request: NextRequest) {
  const u = new URL(request.url);
  const id = u.searchParams.get('id') || '109152';

  if (id === 'list') {
    let body = '#EXTM3U\n';
    for (const [cid, name] of Object.entries(CHANNELS)) {
      body += `#EXTINF:-1,${name}\n`;
      body += `${buildApiUrl(request as unknown as Request, '/api/nanjing', cid)}\n`;
    }
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8' } });
  }

  if (!CHANNELS[id]) {
    return new NextResponse(`Invalid channel id: ${id}`, { status: 400 });
  }

  // fetch channel.js
  const jsUrl = 'http://www.nbs.cn/js/channel.js';
  try {
    const code = await fetchText(jsUrl);
    // build regex similar to PHP: /case\s+'ID'\s*:\s*(?:\/\/[^\n]*)?\s*videosrc\s*=\s*'([^']+)'/
    const escId = id.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const re = new RegExp(`case\\s+['\"]${escId}['\"]\\s*:\\s*(?:\\/\\/[^\\n]*)?\\s*videosrc\\s*=\\s*['\"]([^'\"]+)['\"]`, 'i');
    const m = re.exec(code);
    if (!m) {
      return new NextResponse(`频道 ${CHANNELS[id]} 暂时无法播放`, { status: 404 });
    }
    let href = m[1];
    if (href.startsWith('//')) href = 'http:' + href;
    if (!/^https?:\/\//i.test(href)) {
      return new NextResponse('获取到无效的播放地址', { status: 500 });
    }
    return NextResponse.redirect(href, 302);
  } catch (e) {
    console.error(e);
    return new NextResponse('无法获取频道信息，请稍后重试', { status: 503 });
  }
}
