/**
 * 山东TV API路由
 * 支持26个山东广播电视台及地市台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 频道映射表
const CHANNEL_MAP: { [key: string]: [number, string] } = {
  'sdws': [1, ''],           // 山东卫视
  'xwpd': [3, ''],           // 新闻频道
  'qlpd': [5, ''],           // 齐鲁频道
  'txyx': [7, ''],           // 体育休闲频道
  'shpd': [9, ''],           // 生活频道
  'zypd': [11, ''],          // 综艺频道
  'wlpd': [13, ''],          // 文旅频道
  'nkpd': [15, ''],          // 农科频道
  'sepd': [17, ''],          // 少儿频道
  'jndst': [29883, '/region'],   // 济南电视台
  'zbdst': [100010, '/region'],  // 淄博电视台
  'zzdst': [100023, '/region'],  // 枣庄电视台
  'dydst': [100011, '/region'],  // 东营电视台
  'ytdst': [100012, '/region'],  // 烟台电视台
  'wfdst': [100013, '/region'],  // 潍坊电视台
  'tadst': [100015, '/region'],  // 泰安电视台
  'whdst': [100016, '/region'],  // 威海电视台
  'rzdst': [100017, '/region'],  // 日照电视台
  'lydst': [100019, '/region'],  // 临沂电视台
  'dzdst': [100020, '/region'],  // 德州电视台
  'lcdst': [100021, '/region'],  // 聊城电视台
  'bzdst': [100022, '/region'],  // 滨州电视台
  'hzdst': [100024, '/region'],  // 菏泽电视台
  'jxdst': [100014, '/region'],  // 济宁电视台
  'lzdst': [100018, '/region'],  // 莱芜电视台
  'zcdst': [100026, '/region'],  // 枣庄电视台
};

// 频道名称
const CHANNEL_NAMES: { [key: string]: string } = {
  'sdws': '山东卫视', 'xwpd': '新闻频道', 'qlpd': '齐鲁频道',
  'txyx': '体育休闲', 'shpd': '生活频道', 'zypd': '综艺频道',
  'wlpd': '文旅频道', 'nkpd': '农科频道', 'sepd': '少儿频道',
  'jndst': '济南台', 'zbdst': '淄博台', 'zzdst': '枣庄台',
  'dydst': '东营台', 'ytdst': '烟台台', 'wfdst': '潍坊台',
  'tadst': '泰安台', 'whdst': '威海台', 'rzdst': '日照台',
  'lydst': '临沂台', 'dzdst': '德州台', 'lcdst': '聊城台',
  'bzdst': '滨州台', 'hzdst': '菏泽台', 'jxdst': '济宁台',
  'lzdst': '莱芜台', 'zcdst': '枣庄台',
};

/**
 * MD5哈希
 */
async function md5(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('MD-5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 获取播放地址
 */
async function getStreamUrl(channelId: number, path: string): Promise<string | null> {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await md5(`huangye${timestamp}211f68ea4aeb687a6561707b6e3523c84e`);

  const url = `https://sdxw.iqilu.com/v1/app/play/tv${path}/live?e=1&e=1`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'version': '10.1.1',
        'orgid': '21',
        'platform': `android${timestamp}`,
        'sign': sign,
        'appVersion': '10.1.1',
        'sysVersion': '12',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelId: channelId,
        platType: 1,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.data?.liveUrl || null;
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
  const id = searchParams.get('id') || 'sdws';

  // 如果是list请求，返回频道列表
  if (id === 'list') {
    let m3u8Content = '#EXTM3U\n';
    const baseUrl = request.url.split('?')[0];

    for (const [cid, _] of Object.entries(CHANNEL_MAP)) {
      const channelName = CHANNEL_NAMES[cid] || cid;
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

  const [channelId, path] = CHANNEL_MAP[id];

  // 获取播放地址
  const streamUrl = await getStreamUrl(channelId, path);

  if (!streamUrl) {
    return new NextResponse('Stream not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
