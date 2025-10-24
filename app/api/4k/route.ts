/**
 * 4K频道API路由
 * 支持9个4K超高清频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// AES-256-ECB加密key
const AES_KEY = '01234567890123450123456789012345';
const API_URL1 = 'https://api.chinaaudiovisual.cn/web/user/getVisitor';
const API_URL2 = 'https://api.chinaaudiovisual.cn/column/getColumnList';

// 频道映射表
const CHANNEL_MAP: { [key: string]: number } = {
  'btv4k': 91417,  // 北京卫视4K
  'sh4k': 96050,   // 上海卫视4K
  'js4k': 95925,   // 江苏卫视4K
  'zj4k': 96039,   // 浙江卫视4K
  'sd4k': 95975,   // 山东卫视4K
  'hn4k': 96038,   // 湖南卫视4K
  'gd4k': 93733,   // 广东卫视4K
  'sc4k': 95965,   // 四川卫视4K
  'sz4k': 93735,   // 深圳卫视4K
};

// 频道名称映射
const CHANNEL_NAMES: { [key: string]: string } = {
  'btv4k': '北京卫视4K',
  'sh4k': '上海卫视4K',
  'js4k': '江苏卫视4K',
  'zj4k': '浙江卫视4K',
  'sd4k': '山东卫视4K',
  'hn4k': '湖南卫视4K',
  'gd4k': '广东卫视4K',
  'sc4k': '四川卫视4K',
  'sz4k': '深圳卫视4K',
};

// 简单的内存缓存（Edge Runtime中有效期为请求周期）
const cache = new Map<string, { value: string; expires: number }>();

/**
 * 获取访问token
 */
async function getToken(): Promise<string | null> {
  // 检查缓存
  const cached = cache.get('visitor_token');
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  const timeMillis = Date.now();
  const sign = await makeSign(API_URL1, '', timeMillis, AES_KEY);

  try {
    const response = await fetch(API_URL1, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'headers': '1.1.3',
        'sign': sign,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.success || !data?.data?.token) return null;

    const token = data.data.token;
    // 缓存24小时
    cache.set('visitor_token', { value: token, expires: Date.now() + 86400000 });

    return token;
  } catch (error) {
    console.error('Get token error:', error);
    return null;
  }
}

/**
 * 获取频道数据
 */
async function getColumnData(token: string): Promise<any> {
  // 检查缓存
  const cached = cache.get('column_all_list_33');
  if (cached && cached.expires > Date.now()) {
    return JSON.parse(cached.value);
  }

  const columnId = 350;
  const params = new URLSearchParams({
    columnId: columnId.toString(),
    token: token,
  });

  const timeMillis = Date.now();
  const sign = await makeSign(API_URL2, params.toString(), timeMillis, AES_KEY);

  try {
    const response = await fetch(API_URL2, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'okhttp/3.11.0',
        'sign': sign,
      },
      body: params.toString(),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.success) return null;

    // 缓存10分钟
    cache.set('column_all_list_33', {
      value: JSON.stringify(data),
      expires: Date.now() + 600000,
    });

    return data;
  } catch (error) {
    console.error('Get column data error:', error);
    return null;
  }
}

/**
 * 在数据中查找播放地址
 */
function findPlayUrl(dataArr: any, targetId: number): string | null {
  if (!dataArr?.data || !Array.isArray(dataArr.data)) {
    return null;
  }

  for (const itemData of dataArr.data) {
    if (itemData?.mediaAsset?.id === targetId) {
      return itemData.mediaAsset.url || null;
    }
  }

  return null;
}

/**
 * 生成签名（AES-256-ECB加密）
 * Edge Runtime中使用Web Crypto API
 */
async function makeSign(url: string, params: string, timeMillis: number, key: string): Promise<string> {
  const payload = {
    url: url,
    params: params,
    time: timeMillis,
  };

  const json = JSON.stringify(payload);

  // Convert key to CryptoKey
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-CBC', length: 256 },
    false,
    ['encrypt']
  );

  // AES-256-ECB加密 (使用CBC模式模拟ECB)
  const iv = new Uint8Array(16); // ECB不需要IV，用全0的IV
  const data = encoder.encode(json);

  // Padding to 16 bytes boundary (PKCS7)
  const blockSize = 16;
  const paddingLength = blockSize - (data.length % blockSize);
  const paddedData = new Uint8Array(data.length + paddingLength);
  paddedData.set(data);
  for (let i = data.length; i < paddedData.length; i++) {
    paddedData[i] = paddingLength;
  }

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: iv },
    cryptoKey,
    paddedData
  );

  // Base64 encode
  const bytes = new Uint8Array(encrypted);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/[\r\n]/g, '');
}

/**
 * 获取播放地址
 */
async function getPlayUrl(id: string): Promise<string | null> {
  if (!CHANNEL_MAP[id]) {
    return null;
  }

  // 获取token
  const token = await getToken();
  if (!token) return null;

  // 获取频道列表数据
  const dataArr = await getColumnData(token);
  if (!dataArr) return null;

  // 查找播放地址
  const targetId = CHANNEL_MAP[id];
  const playUrl = findPlayUrl(dataArr, targetId);

  return playUrl;
}

/**
 * GET请求处理
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'btv4k';

    // 如果是list请求，返回频道列表
  if (id === 'list') {
    let m3u8Content = '#EXTM3U\n';
    
    // 从request.url中解析出完整的baseUrl
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}/api/4k`;

    for (const [cid, _] of Object.entries(CHANNEL_MAP)) {
      const channelName = CHANNEL_NAMES[cid];
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

  // 获取播放地址
  const playUrl = await getPlayUrl(id);

  if (!playUrl) {
    return new NextResponse(`Channel not found: ${id}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到播放地址
  return NextResponse.redirect(playUrl, 302);
}
