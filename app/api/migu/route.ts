
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { getRealHost } from '../utils/url';

// 频道列表和播放url缓存
const channelListCache: { value: any, expire: number } = { value: null, expire: 0 };
const playUrlCache: Map<string, { url: string, expire: number }> = new Map();

const CATE_URL = "https://program-sc.miguvideo.com/live/v2/tv-data/1ff892f2b5ab4a79be6e25b69d2f5d05";
async function fetchCateList() {
	const resp = await fetch(CATE_URL);
	if (!resp.ok) throw new Error('频道分类获取失败');
	let data = await resp.json();
	let liveList = data.body?.liveList || [];
	// 去除热门
	liveList = liveList.filter((item: any) => item.name !== "热门");
	// 央视优先
	liveList.sort((a: any, b: any) => {
		if (a.name === "央视") return -1;
		if (b.name === "央视") return 1;
		return 0;
	});
	return liveList;
}

async function fetchChannelListWithCache() {
	const now = Date.now();
	if (channelListCache.value && channelListCache.expire > now) {
		return channelListCache.value;
	}
	let cates = await fetchCateList();
	for (let cate of cates) {
		try {
			const resp = await fetch(`https://program-sc.miguvideo.com/live/v2/tv-data/${cate.vomsID}`);
			if (!resp.ok) { cate.dataList = []; continue; }
			const data = await resp.json();
			cate.dataList = data.body?.dataList || [];
		} catch {
			cate.dataList = [];
		}
	}
	// 去重
	const seen = new Set();
	for (const cate of cates) {
		cate.dataList = cate.dataList.filter((item: any) => {
			if (seen.has(item.name)) return false;
			seen.add(item.name); return true;
		});
	}
	channelListCache.value = cates;
	channelListCache.expire = now + 4 * 60 * 60 * 1000; // 4小时
	return cates;
}

// 计算MD5
function getStringMD5(str: string): string {
	return createHash('md5').update(str).digest('hex').toLowerCase();
}

// 旧版720p ddCalcu算法
function getddCalcu720p(puData: string, programId: string): string {
	if (!puData || !programId) return "";
	const keys = "0123456789";
	let ddCalcu: string[] = [];
	for (let i = 0; i < puData.length / 2; i++) {
		ddCalcu.push(puData[puData.length - i - 1]);
		ddCalcu.push(puData[i]);
		switch (i) {
			case 1:
				ddCalcu.push("e");
				break;
			case 2:
				const now = new Date();
				const ymdhms = now.getFullYear().toString().padStart(4, '0')
					+ (now.getMonth() + 1).toString().padStart(2, '0')
					+ now.getDate().toString().padStart(2, '0')
					+ now.getHours().toString().padStart(2, '0')
					+ now.getMinutes().toString().padStart(2, '0')
					+ now.getSeconds().toString().padStart(2, '0');
				ddCalcu.push(keys[parseInt(ymdhms[6])] || '0');
				break;
			case 3:
				ddCalcu.push(keys[parseInt(programId[2])] || '0');
				break;
			case 4:
				ddCalcu.push("0");
				break;
		}
	}
	return ddCalcu.join("");
}

// 拼接ddCalcu参数
function getddCalcuURL720p(puDataURL: string, programId: string): string {
	if (!puDataURL || !programId) return "";
	const puData = puDataURL.split("&puData=")[1];
	const ddCalcu = getddCalcu720p(puData, programId);
	return `${puDataURL}&ddCalcu=${ddCalcu}`;
}

// 游客方式获取302跳转m3u8，带缓存
async function getMigu302UrlWithCache(pid: string): Promise<string | null> {
	const now = Date.now();
	const cache = playUrlCache.get(pid);
	if (cache && cache.expire > now) {
		return cache.url;
	}
	const timestramp = now.toString();
	const appVersion = "26000009";
	const md5 = getStringMD5(timestramp + pid + appVersion);
	const salt = "66666601";
	const suffix = "770fafdf5ba04d279a59ef1600baae98migu6666";
	const sign = getStringMD5(md5 + suffix);
	let rateType = "3";
	if (pid === "608831231") rateType = "2"; // 广东卫视特殊
	const url = `https://play.miguvideo.com/playurl/v1/play/playurl?sign=${sign}&rateType=${rateType}&contId=${pid}&timestamp=${timestramp}&salt=${salt}`;
	const resp = await fetch(url, { headers: { "AppVersion": "2600000900", "TerminalId": "android", "X-UP-CLIENT-CHANNEL-ID": "2600000900-99000-201600010010027" } });
	if (!resp.ok) return null;
	const json = await resp.json();
	const rawUrl = json?.body?.urlInfo?.url;
	if (!rawUrl) {
		playUrlCache.set(pid, { url: '', expire: now + 2 * 60 * 1000 }); // 无效2分钟
		return null;
	}
	// 拼接ddCalcu
	const resUrl = getddCalcuURL720p(rawUrl, pid);
	playUrlCache.set(pid, { url: resUrl, expire: now + 2 * 60 * 60 * 1000 }); // 有效2小时
	return resUrl;
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const id = searchParams.get('id');
	// 频道列表API: /api/migu?id=list
	if (searchParams.get('id') === 'list') {
		try {
			const cates = await fetchChannelListWithCache();
			const host = getRealHost(req);
			const protocol = req.url.startsWith('https') ? 'https' : 'http';
			let m3u8 = '#EXTM3U\n';
			for (const cate of cates) {
				for (const p of (cate.dataList || [])) {
					m3u8 += `#EXTINF:-1,${p.name}\n${protocol}://${host}/api/migu?id=${p.pID}\n`;
				}
			}
			return new Response(m3u8, { status: 200, headers: { 'content-type': 'application/vnd.apple.mpegurl; charset=utf-8' } });
		} catch (e: any) {
			return new Response('频道列表获取失败: ' + e.message, { status: 502 });
		}
	}
	// 单频道302跳转
	if (!id) {
		return new Response('缺少频道id', { status: 400 });
	}
	const m3u8url = await getMigu302UrlWithCache(id);
	if (!m3u8url) {
		return new Response('获取播放地址失败', { status: 502 });
	}
	return Response.redirect(m3u8url, 302);
}
