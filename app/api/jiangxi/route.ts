import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';
import crypto from 'crypto';

/**
 * 江西广播电视台直播源代理
 * 支持江西卫视、都市、经济生活等频道
 * Runtime: nodejs (需要 crypto 加密)
 */

export const runtime = 'nodejs';

// 频道ID映射
const CHANNEL_MAP: Record<string, { id: number; name: string }> = {
  jxws: { id: 87, name: '江西卫视' },
  jxds: { id: 86, name: '江西都市' },
  jxjs: { id: 153, name: '江西经济生活' },
  jxys: { id: 84, name: '江西影视旅游' },
  jxgg: { id: 83, name: '江西公共农业' },
  jxse: { id: 82, name: '江西少儿' },
  jxxw: { id: 81, name: '江西新闻' },
  jxtc: { id: 78, name: '江西陶瓷' },
  fsgq: { id: 79, name: '风尚购物' },
  fz1: { id: 171, name: '抚州综合' },
  gz1: { id: 172, name: '赣州新闻综合' },
  ja1: { id: 168, name: '吉安综合' },
  jdz1: { id: 166, name: '景德镇新闻综合' },
  jj1: { id: 174, name: '九江新闻综合' },
  nc1: { id: 173, name: '南昌新闻综合' },
  px1: { id: 165, name: '萍乡新闻综合' },
  sr1: { id: 169, name: '上饶新闻综合' },
  xy1: { id: 170, name: '新余新闻综合' },
  yc1: { id: 175, name: '宜春综合' },
  yt1: { id: 167, name: '鹰潭综合' },
};

// 固定设备ID
const DEVICE_ID = '4C29FB75-CE95-4B59-ADA5-589A1611CF1C';

// API配置
const APP_VERSION = '5.09.18';
const CHANNEL_API_BASE = 'https://app.jxgdw.com/api/tv/channel/';
const AUTH_INFO_API = 'https://app.jxgdw.com/api/media/report?device=';
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Linux; Android 12; SM-A5560 Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Mobile Safari/537.36';

interface ChannelInfo {
  authType: number;
  authUrl: string;
  playUrl: string;
}

/**
 * XOR 加密/解密
 */
function xorUtils(data: string | Buffer, key: number): string {
  const keyByte = key & 0xFF;
  const input = typeof data === 'string' ? Buffer.from(data, 'binary') : data;
  const result = Buffer.alloc(input.length);
  
  for (let i = 0; i < input.length; i++) {
    result[i] = input[i] ^ keyByte;
  }
  
  return result.toString('binary');
}

/**
 * AES-128-CBC 解密
 */
function aesDecrypt(encryptedData: string, key: string, iv: string): string {
  const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'));
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 获取频道信息
 */
async function getChannelInfo(channelId: number): Promise<ChannelInfo | null> {
  try {
    const url = `${CHANNEL_API_BASE}${channelId}`;
    const response = await fetch(url, {
      headers: {
        'appVersion': APP_VERSION,
        'channelType': 'jinshipin',
        'os': 'Android',
        'device': DEVICE_ID,
        'User-Agent': 'okhttp/4.9.2',
      },
    });

    if (!response.ok) {
      console.error('Failed to get channel info:', response.status);
      return null;
    }

    const data = await response.json();
    
    // 检查API响应是否包含result
    if (!data.result) {
      console.error('Invalid channel ID or API response:', channelId);
      return null;
    }
    
    return {
      authType: data.result.authType,
      authUrl: data.result.authUrl,
      playUrl: data.result.playUrl,
    };
  } catch (error) {
    console.error('Get channel info error:', error);
    return null;
  }
}

/**
 * 获取认证信息
 */
async function getAuthInfo(): Promise<string | null> {
  try {
    const url = `${AUTH_INFO_API}${DEVICE_ID}`;
    const response = await fetch(url, {
      headers: {
        'appVersion': APP_VERSION,
        'channelType': 'jinshipin',
        'os': 'Android',
        'device': DEVICE_ID,
        'User-Agent': 'okhttp/4.9.2',
      },
    });

    if (!response.ok) {
      console.error('Failed to get auth info:', response.status);
      return null;
    }

    const data = await response.json();
    const encoded = data.result;
    
    // Base64 解码后 XOR 解密
    const decoded = Buffer.from(encoded, 'base64');
    const authInfo = xorUtils(decoded, 110);
    
    return authInfo;
  } catch (error) {
    console.error('Get auth info error:', error);
    return null;
  }
}

/**
 * 获取观看认证
 */
async function getWatchTvAuthentication(
  authUrl: string,
  timestamp: number,
  authInfo: string
): Promise<string | null> {
  try {
    const t = Math.floor(timestamp / 1000);
    const token = crypto.createHash('md5')
      .update(`com.sobey.cloud.view.jiangxiandroidjxntv${timestamp}`)
      .digest('hex');

    // 构建基础参数
    let params = `app_version=${APP_VERSION}&device_id=${DEVICE_ID}&siteid=10001&t=${t}&time=${timestamp}&token=${token}&type=android`;
    
    // 构建签名字符串
    const xorResult = xorUtils(
      String.fromCharCode(4, 21, 21, 14, 0, 28, 88),
      101
    );
    const authParts = authInfo.split('-');
    let signBase = `${params}&${xorResult}${authParts[2]}`;
    signBase += `&timestamp=${t}`;
    
    const sign = crypto.createHash('md5').update(signBase).digest('hex');
    params += `&sign=${sign}`;
    
    const url = `${authUrl}?${params}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': `${DEFAULT_USER_AGENT}/tvcVersion${APP_VERSION}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to get watch authentication:', response.status);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error('Get watch authentication error:', error);
    return null;
  }
}

/**
 * 解析认证参数
 */
function parseParams(authResponse: string, authInfo: string): string {
  try {
    const authJson = JSON.parse(authResponse);
    const encryptedData = authJson.data;
    delete authJson.data;
    
    // 分离 key 和 iv
    const authParts = authInfo.split('-');
    const key = authParts[0];
    const iv = authParts[1];
    
    // AES 解密
    const decrypted = aesDecrypt(encryptedData, key, iv);
    const decryptedJson = JSON.parse(decrypted);
    
    // 合并参数
    const allParams = { ...authJson, ...decryptedJson };
    
    // 构建查询字符串
    const queryString = new URLSearchParams(allParams).toString();
    
    return `?${queryString}`;
  } catch (error) {
    console.error('Parse params error:', error);
    return '';
  }
}

/**
 * 获取播放地址
 */
async function getPlayUrl(channelId: number): Promise<string | null> {
  try {
    // 1. 获取频道信息
    const channelInfo = await getChannelInfo(channelId);
    if (!channelInfo) {
      console.error('Failed to get channel info');
      return null;
    }

    // 2. 如果不需要认证,直接返回播放地址
    if (channelInfo.authType === 0) {
      return channelInfo.playUrl;
    }

    // 3. 需要认证,获取认证信息
    const authInfo = await getAuthInfo();
    if (!authInfo) {
      console.error('Failed to get auth info');
      return null;
    }

    // 4. 获取观看认证
    const timestamp = Date.now();
    const authResponse = await getWatchTvAuthentication(
      channelInfo.authUrl,
      timestamp,
      authInfo
    );
    
    if (!authResponse) {
      console.error('Failed to get watch authentication');
      return null;
    }

    // 5. 解析认证参数
    const params = parseParams(authResponse, authInfo);
    
    // 6. 拼接最终播放地址
    return channelInfo.playUrl + params;
  } catch (error) {
    console.error('Get play URL error:', error);
    return null;
  }
}

/**
 * 生成播放列表
 */
function generatePlaylist(baseUrl: string): string {
  let m3u8 = '#EXTM3U\n';
  for (const [id, channel] of Object.entries(CHANNEL_MAP)) {
    m3u8 += `#EXTINF:-1,${channel.name}\n`;
    m3u8 += `${baseUrl}?id=${id}\n`;
  }
  return m3u8;
}

/**
 * GET 请求处理
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'list';

  // 返回播放列表
  if (id === 'list') {
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = getRealHost(request);
    const baseUrl = `${protocol}://${host}/api/jiangxi`;

    const playlist = generatePlaylist(baseUrl);
    return new NextResponse(playlist, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
      },
    });
  }

  // 查找频道 (支持友好ID或数字ID)
  let channel = CHANNEL_MAP[id];
  let channelKey = id;
  
  // 如果没找到,尝试作为数字ID查找
  if (!channel) {
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      const found = Object.entries(CHANNEL_MAP).find(([, ch]) => ch.id === numericId);
      if (found) {
        channelKey = found[0];
        channel = found[1];
      }
    }
  }
  
  // 验证频道ID
  if (!channel) {
    const supportedChannels = Object.entries(CHANNEL_MAP)
      .map(([id, ch]) => `${id} (${ch.name}) - ID:${ch.id}`)
      .join('\n');
    return new NextResponse(
      `错误：频道 '${id}' 不存在。\n\n支持的频道列表：\n${supportedChannels}`,
      {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }

  // 获取播放地址
  const playUrl = await getPlayUrl(channel.id);

  if (!playUrl) {
    return new NextResponse('获取播放地址失败', { status: 500 });
  }

  // 302 重定向到播放地址
  return NextResponse.redirect(playUrl, 302);
}
