import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

export const runtime = 'edge';

// 频道配置
const CHANNELS: Record<string, string> = {
	sxws: '山西卫视',
	sxjj: '山西经济',
	sxys: '山西影视',
	sxshyfz: '山西社会与法治',
	sxwtsh: '山西文体生活',
	sxhh: '山西黄河',
	tyxwzh: '太原新闻综合',
	dtxwzh: '大同新闻综合',
	yqxwzh: '阳泉新闻综合',
	czxwzh: '长治新闻综合',
	jcxwzh: '晋城新闻综合',
	szxwzh: '朔州新闻综合',
	jzzh: '晋中综合',
	ycxwzh: '运城新闻综合',
	xzzh: '忻州综合',
	lfxwzh: '临汾新闻综合',
	llxwzh: '吕梁新闻综合',
};

// 频道 ID 映射（API 使用的 channelid）
const CHANNEL_IDS: Record<string, string> = {
	sxws: 'q8RVWgs',
	sxjj: '4j01KWX',
	sxys: 'Md571Kv',
	sxshyfz: 'p4y5do9',
	sxwtsh: 'Y00Xezi',
	sxhh: 'lce1mC4',
	tyxwzh: 'customa',
	dtxwzh: 'customb',
	yqxwzh: 'customc',
	czxwzh: 'customd',
	jcxwzh: 'custome',
	szxwzh: 'customf',
	jzzh: 'customg',
	ycxwzh: 'customh',
	xzzh: 'customi',
	lfxwzh: 'customj',
	llxwzh: 'customk',
};

async function fetchWithHeaders(url: string, headers: Record<string, string>) {
	return fetch(url, {
		headers,
		redirect: 'follow',
		cache: 'no-store',
	});
}

export async function GET(request: NextRequest) {
	const urlObj = new URL(request.url);
	const searchParams = urlObj.searchParams;
	const pathname = urlObj.pathname;
	const id = searchParams.get('id') || 'sxws';

	// ?id=list 返回所有频道列表
	if (id === 'list') {
		let m3u = '#EXTM3U\n';
		const protocol = request.headers.get('x-forwarded-proto') || urlObj.protocol.replace(':', '');
		const host = getRealHost(request);
		const selfUrl = `${protocol}://${host}${pathname}`;

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

	// 检查频道 ID 是否存在
	if (!CHANNEL_IDS[id]) {
		return new NextResponse(`频道 id 不存在: ${id}`, {
			status: 404,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' },
		});
	}

	const channelId = CHANNEL_IDS[id];
	const apiUrl = `https://dyhhplus.sxrtv.com/apiv4.5/api/m3u8_notoken?channelid=${channelId}`;

	try {
		// 使用必要的 HTTP headers 请求 API
		const headers = {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Referer: 'https://www.sxrtv.com/',
			Origin: 'https://www.sxrtv.com',
			Accept: 'application/json, text/plain, */*',
			'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
		};

		const resp = await fetchWithHeaders(apiUrl, headers);

		if (!resp.ok) {
			return new NextResponse(`API 请求失败: HTTP ${resp.status}`, {
				status: 502,
				headers: { 'Content-Type': 'text/plain; charset=utf-8' },
			});
		}

		const data = await resp.json();
		const address = data?.data?.address;

		if (!address) {
			return new NextResponse('未找到播放地址', {
				status: 404,
				headers: { 'Content-Type': 'text/plain; charset=utf-8' },
			});
		}

		// 302 重定向到 m3u8 地址
		return NextResponse.redirect(address, 302);
	} catch (error) {
		return new NextResponse(`错误: ${error instanceof Error ? error.message : 'Unknown error'}`, {
			status: 500,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' },
		});
	}
}
