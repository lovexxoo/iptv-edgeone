import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '../utils/url';

export const runtime = 'edge';

const CHANNELS: Record<string, string> = {
  gzzh: '31',
  gzxw: '32',
  ngds: '33',
  gzzf: '34',
};

// 显示名称映射
const NAMES: Record<string, string> = {
  gzzh: '广州综合',
  gzxw: '广州新闻',
  ngds: '南国都市（4K）',
  gzzf: '广州法治',
};

async function fetchText(url: string) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'curl/7.68.0' } });
  if (!resp.ok) throw new Error('upstream error');
  return await resp.text();
}

export async function GET(request: NextRequest) {
  const urlObj = new URL(request.url);
  const id = urlObj.searchParams.get('id') || 'gzzh';
  if (id === 'list') {
    let m3u = '#EXTM3U\n';
    for (const key of Object.keys(CHANNELS)) {
      const name = NAMES[key] || key;
      m3u += `#EXTINF:-1,${name}\n`;
      m3u += `${buildApiUrl(request as unknown as Request, '/api/guangzhou', key)}\n`;
    }
    return new NextResponse(m3u, { status: 200, headers: { 'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8' } });
  }
  const station = CHANNELS[id];
  if (!station) return new NextResponse('Channel not found', { status: 404 });

  const api = 'https://gzbn.gztv.com:7443/plus-cloud-manage-app/liveChannel/queryLiveChannelList?type=1';
  try {
    const text = await fetchText(api);
    const m = new RegExp(`"stationNumber"\s*:\s*\"?${station}\"?[^}]*\"httpUrl\"\s*:\s*\"([^\"]+)\"`).exec(text);
    if (m) {
      const url = m[1].replace(/\\\//g, '/');
      return NextResponse.redirect(url, 302);
    }
    return new NextResponse('Stream not found', { status: 404 });
  } catch (e) {
    console.error(e);
    return new NextResponse('upstream error', { status: 502 });
  }
}
