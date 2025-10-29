import { NextRequest, NextResponse } from 'next/server';
import { md5 } from '../utils/crypto';
import { buildApiUrl } from '../utils/url';
export const runtime = 'edge';

// 对应 mytest/zhejiang.cgi
const CHANNELS: Record<string, string> = {
  'hzxs1': '1678438003663132', 'xsxwzh': '1702360350551252', 'wzcn1': '1726543353849105',
  'wzyj1': '1683366786327093', 'wzdt1': '1735612228127376', 'raxwzh': '1681269183807252',
  'kqxwzh': '1640945211435051', 'jhdy2': '1681113292195007', 'jhpa1': '1722331404917192',
  'jhpa2': '1722333472632211', 'jhyk1': '1625061424267104', 'jhyk2': '1625062755227231',
  'szxwzh': '1626935015913208', 'tztt1': '1617072208961931', 'tzyh1': '1728627049847070',
  'jxxwzh': '1675942165226154', 'jxwhly': '1675149625220101', 'jxgg': '1675149601192103',
  'lslq1': '1721354859785237', 'lssy1': '1718675414025228', 'lsyh1': '1686705257187275',
  'lsqy1': '1733812606413392', 'phzh': '1690167908295069', 'qzcs1': '1621306190044902',
  'qzkh1': '1721295786810240', 'dyxwzh': '1681113308206040', 'dyyssh': '1681113292195007',
  'wyxwzh': '1707437639053211', 'jndst': '1644806967279134', 'qtdst': '1692755062081192',
  'zspt1': '1679466742638079', 'scdst': '1708426592499070', 'zsxwzh': '1699001836208185',
  'zsgg': '1699002430299200', 'nbyy2': '1728440422705076', 'jsdst': '1623117710666335',
  'lyxwzh': '1703570877483349', 'xwzh5': '1700720505174325'
};

// 显示名称映射（用于 ?id=list 输出）
const NAMES: Record<string, string> = {
  'hzxs1': '杭州萧山综合',
  'xsxwzh': '象山新闻综合',
  'wzcn1': '温州苍南新闻综合',
  'wzyj1': '温州永嘉新闻综合',
  'wzdt1': '温州电视台',
  'raxwzh': '瑞安新闻综合',
  'kqxwzh': '柯桥新闻综合',
  'jhdy2': '金华东阳影视生活',
  'jhpa1': '金华磐安新闻综合',
  'jhpa2': '金华磐安文化旅游',
  'jhyk1': '金华永康新闻综合',
  'jhyk2': '金华永康华溪频道',
  'szxwzh': '嵊州新闻综合',
  'tztt1': '台州天台和合频道',
  'tzyh1': '台州玉环新闻综合',
  'jxxwzh': '嘉兴新闻综合',
  'jxwhly': '嘉兴文化旅游',
  'jxgg': '嘉兴公共',
  'lslq1': '丽水龙泉新闻综合',
  'lssy1': '丽水松阳新闻综合',
  'lsyh1': '丽水云和新闻综合',
  'lsqy1': '丽水庆元电视台',
  'phzh': '平湖综合',
  'qzcs1': '衢州常山新闻综合',
  'qzkh1': '衢州开化综合',
  'dyxwzh': '东阳新闻综合',
  'dyyssh': '东阳影视生活',
  'wyxwzh': '武义新闻综合',
  'jndst': '景宁电视台',
  'qtdst': '青田电视台',
  'zspt1': '舟山普陀新闻综合',
  'scdst': '遂昌电视台',
  'zsxwzh': '舟山新闻综合',
  'zsgg': '舟山公共',
  'nbyy2': '宁波余姚姚江文化',
  'jsdst': '江山电视台',
  'lyxwzh': '龙游新闻综合',
  'xwzh5': '衢江新闻综合'
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'xsxwzh';

  if (id === 'list') {
    let m3u = '#EXTM3U\n';
    for (const key of Object.keys(CHANNELS)) {
      const name = NAMES[key] || key;
      m3u += `#EXTINF:-1,${name}\n`;
      m3u += `${buildApiUrl(request as unknown as Request, '/api/zhejiang', key)}\n`;
    }
    return new NextResponse(m3u, { status: 200, headers: { 'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8' } });
  }

  const liveId = CHANNELS[id];
  if (!liveId) return new NextResponse('Channel not found', { status: 404 });

  // 生成签名 md5(liveId + "NoFeelings")
  const sign = md5(liveId + 'NoFeelings');

  const apiUrl = 'http://www.qukanvideo.com/h5/channel/view/item/AntiTheft/playUrl';
  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': `http://www.qukanvideo.com/cloud/h5/${liveId}` },
      body: `source=web&liveId=${encodeURIComponent(liveId)}&sign=${encodeURIComponent(sign)}`
    });

    if (!resp.ok) return new NextResponse('Stream not found', { status: 404 });
    const text = await resp.text();

    // 提取 "url":"..."
    const m = /"url"\s*:\s*"([^"]+)"/.exec(text);
    if (m) {
      const streamUrl = m[1].replace(/\\\//g, '/');
      return NextResponse.redirect(streamUrl, 302);
    }

    return new NextResponse('Stream not found', { status: 404 });
  } catch (e) {
    console.error(e);
    return new NextResponse('Stream not found', { status: 404 });
  }
}
