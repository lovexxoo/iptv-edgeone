import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

// 频道映射（50个频道）
const CHANNELS: Record<string, string> = {
	jsws: 'jsws_live',   // 江苏卫视
	jscs: 'jscs_live',   // 江苏城市
	jszy: 'jszy_live',   // 江苏综艺
	jsys: 'jsys_live',   // 江苏影视
	jsxw: 'jsxw_live',   // 江苏新闻
	jsjy: 'jsjy_live',   // 江苏教育
	jsty: 'jsxx_live',   // 江苏体育休闲
	jsgj: 'jsgj_live',   // 江苏国际
	ymkt: 'ymkt_live',   // 优漫卡通
	nj1: 'nanjing',      // 南京新闻综合
	njlh: 'luhe',        // 六合新闻综合
	wx1: 'wuxi',         // 无锡新闻综合
	wxjy: 'jiangyin',    // 江阴新闻综合
	xz1: 'xuzhou',       // 徐州新闻综合
	xzpz: 'pizhou',      // 邳州综合
	xzxy: 'xinyi',       // 新沂新闻综合
	xzjw: 'jiawang',     // 贾汪新闻综合
	xzts: 'tongshan',    // 铜山新闻综合
	cz1: 'changzhou',    // 常州新闻
	czwj: 'wujin',       // 武进综合
	sz1: 'suzhou',       // 苏州新闻综合
	szcs: 'changshu',    // 常熟综合
	szwj: 'wujiang',     // 吴江新闻综合
	szzjg: 'zhangjiagang', // 张家港新闻综合
	nt1: 'nantong',      // 南通新闻综合
	lyg1: 'lianyungang', // 连云港新闻综合
	lygdh: 'donghai',    // 东海新闻综合
	ha1: 'huaian',       // 淮安综合
	haxy: 'xuyi',        // 盱眙综合
	hahz: 'hongze',      // 洪泽综合
	yc1: 'yancheng',     // 盐城1套
	ycxs: 'xiangshui',   // 响水综合
	yz1: 'yangzhou',     // 扬州新闻
	yzhj: 'hanjiang',    // 邗江综合
	zj1: 'zhenjiang',    // 镇江新闻综合
	zjjr: 'jurong',      // 句容新闻综合
	tz1: 'taizhou',      // 泰州新闻
	tzjj: 'jingjiang',   // 靖江新闻
	tztx: 'taixing',     // 泰兴新闻综合
	tzxh: 'xinghua',     // 兴化新闻综合
	sq1: 'suqian',       // 宿迁综合
	sqsy: 'siyang',      // 泗阳综合
};

const BASE_URL = 'https://zjcn-live-play.jstv.com/live.m3u8/';

export async function GET(request: NextRequest) {
	const urlObj = new URL(request.url);
	const searchParams = urlObj.searchParams;
	const id = searchParams.get('id') || 'sq1';

	// list 模式，输出所有频道 m3u8 代理列表
		// 频道中文名映射
		const CHANNEL_NAMES: Record<string, string> = {
			jsws: '江苏卫视',
			jscs: '江苏城市',
			jszy: '江苏综艺',
			jsys: '江苏影视',
			jsxw: '江苏新闻',
			jsjy: '江苏教育',
			jsty: '江苏体育休闲',
			jsgj: '江苏国际',
			ymkt: '优漫卡通',
			nj1: '南京新闻综合',
			njlh: '六合新闻综合',
			wx1: '无锡新闻综合',
			wxjy: '江阴新闻综合',
			xz1: '徐州新闻综合',
			xzpz: '邳州综合',
			xzxy: '新沂新闻综合',
			xzjw: '贾汪新闻综合',
			xzts: '铜山新闻综合',
			cz1: '常州新闻',
			czwj: '武进综合',
			sz1: '苏州新闻综合',
			szcs: '常熟综合',
			szwj: '吴江新闻综合',
			szzjg: '张家港新闻综合',
			nt1: '南通新闻综合',
			lyg1: '连云港新闻综合',
			lygdh: '东海新闻综合',
			ha1: '淮安综合',
			haxy: '盱眙综合',
			hahz: '洪泽综合',
			yc1: '盐城1套',
			ycxs: '响水综合',
			yz1: '扬州新闻',
			yzhj: '邗江综合',
			zj1: '镇江新闻综合',
			zjjr: '句容新闻综合',
			tz1: '泰州新闻',
			tzjj: '靖江新闻',
			tztx: '泰兴新闻综合',
			tzxh: '兴化新闻综合',
			sq1: '宿迁综合',
			sqsy: '泗阳综合',
		};

		if (id === 'list') {
			let m3u = '#EXTM3U\n';
			const host = getRealHost(request);
			const protocol = urlObj.protocol.replace(':', '');
			const baseUrl = `${protocol}://${host}/api/jiangsu`;
			for (const [cid, cname] of Object.entries(CHANNELS)) {
				const zhName = CHANNEL_NAMES[cid] || cid;
				m3u += `#EXTINF:-1,${zhName}\n`;
				m3u += `${baseUrl}?id=${cid}\n`;
			}
			return new NextResponse(m3u, {
				status: 200,
				headers: {
					'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
					'Cache-Control': 'public, max-age=3600',
				},
			});
		}

	if (!CHANNELS[id]) {
		return new NextResponse('Channel not found', {
			status: 404,
			headers: { 'Content-Type': 'text/plain' },
		});
	}
	const channelName = CHANNELS[id];
	const m3u8Url = `${BASE_URL}${channelName}.m3u8`;

	// 拉取 m3u8 内容
	let m3u8Content = '';
	try {
		const resp = await fetch(m3u8Url, {
			headers: {
				'Referer': 'https://api.chinaaudiovisual.cn/',
			},
			cache: 'no-store',
		});
		if (!resp.ok) {
			return new NextResponse('M3U8 not found', {
				status: 404,
				headers: { 'Content-Type': 'text/plain' },
			});
		}
		m3u8Content = await resp.text();
	} catch (e) {
		return new NextResponse('M3U8 fetch error', {
			status: 502,
			headers: { 'Content-Type': 'text/plain' },
		});
	}

	// 替换 ts 路径为完整 URL
	m3u8Content = m3u8Content.replace(/(.*?\.ts)/gi, `${BASE_URL}$1`);

	return new NextResponse(m3u8Content, {
		status: 200,
		headers: {
			'Content-Type': 'application/vnd.apple.mpegurl',
			'Cache-Control': 'no-cache',
		},
	});
}
