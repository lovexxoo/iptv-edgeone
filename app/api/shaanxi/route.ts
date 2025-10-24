/**
 * 陕西TV API路由
 * 支持9个电视频道和8个广播频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const TV_URL = 'http://qidian.sxtvs.com/sxtoutiao/getLiveTvV11?cnwestAppId=3&cnwestLbs=%E5%8D%81%E5%A0%B0%E5%B8%82&deviceId=43b2bfb9-dffa-4c46-a75f-c754a057aba5&deviceInfo=samsung-SM-G9750-12&version=5.2.2&imeiId=f591ccd35e75394c292ea2fcf2b22af814508d0752b0f97d6fa77d1a7ec57b32&typeid=17';
const RADIO_URL = 'http://qidian.sxtvs.com/sxtoutiao/getLiveRadioV11?cnwestLbs=%E5%8D%81%E5%A0%B0%E5%B8%82&typeid=18&deviceId=43b2bfb9-dffa-4c46-a75f-c754a057aba5&version=5.2.2&deviceInfo=samsung-SM-G9750-12&cnwestAppId=3&imeiId=%E6%9C%AA%E5%88%9D%E5%A7%8B%E5%8C%96';

const TV_CHANNELS = {
  '1126': '农林卫视', '1127': '新闻资讯', '1128': '都市青春',
  '1129': '银龄频道', '1130': '秦腔频道', '1131': '陕西卫视',
  '1179': '体育休闲', '1241': '乐家购物', '1242': '移动电视',
};

const RADIO_CHANNELS = {
  '2134': '新闻广播', '2135': '汽车调频', '2136': '交通广播',
  '2137': '音乐广播', '2139': '都市广播', '2140': '青少广播',
  '2142': '戏曲广播', '2143': '农村广播',
};

async function getStreamUrl(id: string, isRadio: boolean): Promise<string | null> {
  const url = isRadio ? RADIO_URL : TV_URL;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.result?.list) return null;

    for (const item of data.result.list) {
      if (item.id?.toString() === id) {
        return item.livestreamurl || null;
      }
    }

    return null;
  } catch (error) {
    console.error('Get stream URL error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '1131';
  const type = searchParams.get('type');
  const isRadio = type === 'radio';

  if (id === 'list') {
    let m3u8Content = '#EXTM3U\n# 陕西广播电视台\n\n# 电视频道\n';
    
    // 构建正确的baseUrl
    // 从request.url中解析出完整的baseUrl
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}/api/shaanxi`;

    for (const [cid, name] of Object.entries(TV_CHANNELS)) {
      m3u8Content += `#EXTINF:-1,${name}\n${baseUrl}?id=${cid}\n`;
    }

    m3u8Content += '\n# 广播频道\n';
    for (const [cid, name] of Object.entries(RADIO_CHANNELS)) {
      m3u8Content += `#EXTINF:-1,${name}\n${baseUrl}?id=${cid}&type=radio\n`;
    }

    return new NextResponse(m3u8Content, {
      headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
    });
  }

  const streamUrl = await getStreamUrl(id, isRadio);
  if (!streamUrl) {
    return new NextResponse('Channel not found', { status: 404 });
  }

  return NextResponse.redirect(streamUrl, 302);
}
