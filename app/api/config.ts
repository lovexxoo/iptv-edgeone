// 云南TV频道映射
export const CHANNEL_MAP: Record<string, string> = {
  ynws: 'yunnanweishi',     // 云南卫视
  ynds: 'yunnandushi',      // 云南都市
  ynyl: 'yunnanyule',       // 云南娱乐
  yngg: 'yunnangonggong',   // 云南公共
  yngj: 'yunnanguoji',      // 云南国际
  ynse: 'yunnanshaoer',     // 云南少儿
};

// API配置
export const API_BASE = 'https://yntv-api.yntv.cn';
export const STREAM_BASE = 'https://tvlive.yntv.cn';

// 请求头配置
export const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Origin': 'https://www.yntv.cn',
  'Referer': 'https://www.yntv.cn/',
};
