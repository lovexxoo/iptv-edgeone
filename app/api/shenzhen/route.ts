/**
 * 深圳TV API路由
 * 支持11个深圳广播电视台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const CHANNEL_MAP: { [key: string]: string } = {
  'szws4k': 'R77mK1v',  // 深圳卫视4k
  'szws': 'AxeFRth',    // 深圳卫视
  'szds': 'ZwxzUXr',    // 都市频道
  'szdsj': '4azbkoY',   // 电视剧频道
  'szgg': '2q76Sw2',    // 公共频道
  'szcj': '3vlcoxP',    // 财经频道
  'szyl': '1q4iPng',    // 娱乐生活频道
  'szse': '1SIQj6s',    // 少儿频道
  'szyd': 'wDF6KJ3',    // 移动电视
  'szyh': 'BJ5u5k2',    // 宜和购物频道
  'szgj': 'sztvgjpd',   // 国际频道
};

const CHANNEL_NAMES: { [key: string]: string } = {
  'szws4k': '深圳卫视4K', 'szws': '深圳卫视', 'szds': '都市频道',
  'szdsj': '电视剧频道', 'szgg': '公共频道', 'szcj': '财经频道',
  'szyl': '娱乐生活', 'szse': '少儿频道', 'szyd': '移动电视',
  'szyh': '宜和购物', 'szgj': '国际频道',
};

const KEY = 'bf9b2cab35a9c38857b82aabf99874aa96b9ffbb';
const HOSTS = 'https://sztv-hls.sztv.com.cn';

async function md5(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('MD-5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getPathname(code: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const timestampStr = today.getTime().toString() + '000';
  
  const bigIntValue = BigInt(timestampStr);
  const divisor = BigInt(86400000);
  const modulo = BigInt(10000);
  const result = (bigIntValue / divisor) % modulo;
  
  return `${code}_${result}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'szdsj';

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
    
    const baseUrl = `${url.protocol}//${baseHost}/api/shenzhen`;
    
    for (const [cid, _] of Object.entries(CHANNEL_MAP)) {
      m3u8Content += `#EXTINF:-1,${CHANNEL_NAMES[cid]}\n${baseUrl}?id=${cid}\n`;
    }
    return new NextResponse(m3u8Content, {
      headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
    });
  }

  const code = CHANNEL_MAP[id];
  if (!code) {
    return new NextResponse('Channel not found', { status: 404 });
  }

  const dectime = (Math.floor(Date.now() / 1000) + 7200).toString(16);
  const rate = '500';
  const pathname = getPathname(code);
  const path = `/${code}/${rate}/${pathname}.m3u8`;
  const sign = await md5(KEY + path + dectime);
  const liveURL = `${HOSTS}${path}?sign=${sign}&t=${dectime}`;

  return NextResponse.redirect(liveURL, 302);
}
