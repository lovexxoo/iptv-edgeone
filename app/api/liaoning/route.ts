import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * 辽宁广播电视台直播代理
 * 数据源: 北斗融媒 (bdrm.bdy.lnyun.com.cn)
 * 特点: RSA加密、auth_key鉴权、需要代理TS切片
 */

// RSA私钥
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAOJqGLjxxzgHtkmT
oON4WPgfhqmwrt13oMEFLIQKgdZa5/H916WzbBDkoSalSLQpOevGL3nKiU+ECZqL
3QD+J0TYBttNup/qA+d9fU4njxRu8eXZ5LYwl7TzxMsTIyf89Xh7OCjP6pthxVql
1tphX5GZrqMNZbOMiw/rK8Pg/PCBAgMBAAECgYAaAQN74lD2L3SROMJmvcDCJqTJ
woAi8YVmBdkaBTbqTqCLG5Nz9Yp42jlj/eG+x2lemfGD9G4W0txjgqLMZWRO/Xp6
WHs+7+L2IX1DfduhJcnFjGkv4WWgwgVUskasZhR41tMVqpTcgkzB+PELuw2NaJjY
yiyR9FNw3xSQPes60QJBAP4qWbep+06AfIuOA66AiHe7axN53HKOQTzjw6Cn4yRs
J45L+F7YpMtAzcabolNnFpJCvBKiO6MpfW0WvHhAQH0CQQDkDHewvlKI4PsrgHM2
u0D90EymbBCmaoOKmARu//TcUOURHOBKE2N8QJZWVjwZN/aV4mrFY2IdO/vFwydc
61NVAkEAj67vYzXz/NAEGHyjNi4xd8Z65Nq6NgSXes2j1Rmz/e4qenYWJcBBgSnU
apenL5ESoIKbgck2/6k/38C/sRdZnQJAQimz2B1/yKKtfJOJ2ck+M+VpN6eGtSGW
BHHSZ3nvSrRVoT9le1hgtr3uYCIo0ZBBBH9qRtZsstqiU2ApXXYQ+QJABGF7U0R5
W81CPtN1qTt+cU4pDsvIIhvv35BM2Nk15Cj62HPkLQmwvZK1F+7n4gDQXLWqekoM
Rk87yN4rDV9Waw==
-----END PRIVATE KEY-----`;

// 频道配置表
const CHANNEL_MAP: Record<string, { id: string; sign: string; name: string }> = {
  'lnws': { id: 'c077b260424404846285cba1e1759280', sign: 'NDEyNjcxNzg1NzY2MDc3490E578144B71624745B39DD0DC0D1AC', name: '辽宁卫视' },
  'dspd': { id: '10d3de0d03c62e85a1a281bbde8b6952', sign: 'ODI0NTYxNzg1NzY2MDc3F0B1FD729E76A90CA24FAAE02357F59D', name: '都市频道' },
  'typd': { id: 'e0bb9a7fd9afa954658bc50d0681cd49', sign: 'NDIzNjcxNzg1NzY2MDc326E12A5421D7907E1675C0BB8EB3E96C', name: '体育频道' },
  'shpd': { id: '078ce87dcf5384d51e4655cb962fda18', sign: 'MzI0NjkxNzg1NzY2MDc3A6C5F5DC5AAD1598E6E413EB4C226089', name: '生活频道' },
  'qspd': { id: '854e7044de9fef5163ae36fabb72de56', sign: 'NTI0NTkxNzg1NzY2MDc38F221A56ADA818918271C956FBA074EE', name: '青少频道' },
  'ysjpd': { id: '918510749a0f319ec12ff695b1c95230', sign: 'MDI0NjkxNzg1NzY2MDc35199C51477AAD1DF17E160A2EB30213B', name: '影视剧频道' },
  'bfpd': { id: '8e95535378bd3e5f7494bc23ab1cb117', sign: 'NjE0NjcxNzg1NzY2MDc3EA435FC58A7F614BAE16828C0AADDB97', name: '北方频道' },
  'yjgw': { id: 'c577efa61117f1ee9687592aa1fd49e8', sign: 'OTI0NTcxNzg1NzY2MDc381F5CC52B2DED40EAE6156756891C92C', name: '宜佳购物' },
  'xdm': { id: '7ff8ce0d226f2eb92e332be0cb13b406', sign: 'MDE0NTkxNzg1NzY2MDc305F5C582D565E4C0A3722551C3C591BB', name: '新动漫' },
  'jtlc': { id: '7e29bde4f41ca08642b7fc3ce4eb1ae4', sign: 'ODEyMzUxNzg1NzY2MDc3D85948DEB26600EB95049D334A9550A7', name: '家庭理财' },
  'ydds': { id: 'fb3cf5af7cd3bcbde56c280cad2e64cb', sign: 'ODE0NTcxNzg1NzY2MDc3E6EDF6FAA3A2C8E669D8427660736FA2', name: '移动电视' }
};

const GROUP_ID = 'd91158f1dc87e3b10ee20cf9fbd36390';
const CACHE_TTL = 1800000; // 30分钟

// 内存缓存
interface StreamCache {
  playURL: string;
  refer: string;
  timestamp: number;
}

const streamCache = new Map<string, StreamCache>();

/**
 * RSA 私钥解密
 */
function rsaDecrypt(encrypted: string): string {
  try {
    const buffer = Buffer.from(encrypted, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: PRIVATE_KEY,
        padding: crypto.constants.RSA_PKCS1_PADDING
      },
      buffer
    );
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('RSA decrypt error:', error);
    return '';
  }
}

/**
 * 获取播放地址和鉴权信息
 */
async function getStreamInfo(channelId: string): Promise<{ playURL: string; refer: string } | null> {
  // 检查缓存
  const cached = streamCache.get(channelId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return { playURL: cached.playURL, refer: cached.refer };
  }

  const channelConfig = CHANNEL_MAP[channelId];
  if (!channelConfig) return null;

  try {
    // 1. 获取域名列表
    const domainUrl = `https://bdrm.bdy.lnyun.com.cn/cloud/apis/live/api/domain/getGroupDomain?groupId=${GROUP_ID}&shows=1`;
    const domainRes = await fetch(domainUrl);
    const domainData = await domainRes.json();

    let m3u8Url = '';
    for (const tv of domainData.data || []) {
      if (tv.id === channelConfig.id) {
        const pull = JSON.parse(tv.pull);
        m3u8Url = pull.m3u8;
        break;
      }
    }

    if (!m3u8Url) {
      console.error('Stream not found for:', channelId);
      return null;
    }

    // 2. 获取OAuth信息
    const oauthUrl = `https://bdrm.bdy.lnyun.com.cn/cloud/apis/live/api/domain/getOauth?domainId=${channelConfig.id}&version=3&sign=${channelConfig.sign}`;
    const oauthRes = await fetch(oauthUrl, { method: 'POST' });
    const oauthData = await oauthRes.json();

    // 3. RSA解密
    const authKey = rsaDecrypt(oauthData.msg);
    const referData = JSON.parse(oauthData.data);
    const refer = rsaDecrypt(referData.refer);

    if (!authKey || !refer) {
      console.error('Failed to decrypt auth info');
      return null;
    }

    // 4. 生成auth_key
    const ts = Math.floor(Date.now() / 1000) + 1800;
    const urlPath = new URL(m3u8Url).pathname;
    const authString = `${urlPath}-${ts}-0-0-${authKey}`;
    const authHash = crypto.createHash('md5').update(authString).digest('hex');
    const playURL = `${m3u8Url}?auth_key=${ts}-0-0-${authHash}`;

    // 保存缓存
    streamCache.set(channelId, {
      playURL,
      refer,
      timestamp: Date.now()
    });

    return { playURL, refer };
  } catch (error) {
    console.error('Get stream info error:', error);
    return null;
  }
}

/**
 * 生成播放列表
 */
function generatePlaylist(baseUrl: string): string {
  let m3u8 = '#EXTM3U\n';
  for (const [id, config] of Object.entries(CHANNEL_MAP)) {
    m3u8 += `#EXTINF:-1,${config.name}\n`;
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
  const tsUrl = searchParams.get('u');
  const ref = searchParams.get('ref');

  // 代理 TS 切片
  if (tsUrl && ref) {
    try {
      const playURL = `https://${tsUrl}`;
      const response = await fetch(playURL, {
        headers: {
          'Referer': `http://${ref}`
        }
      });

      if (!response.ok) {
        return new NextResponse('Failed to fetch TS segment', { status: 502 });
      }

      const data = await response.arrayBuffer();
      return new NextResponse(data, {
        status: 200,
        headers: {
          'Content-Type': 'binary/octet-stream'
        }
      });
    } catch (error) {
      console.error('TS proxy error:', error);
      return new NextResponse('TS proxy error', { status: 500 });
    }
  }

  // 返回播放列表
  if (id === 'list') {
    const host = getRealHost(request);
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}/api/liaoning`;

    const playlist = generatePlaylist(baseUrl);
    return new NextResponse(playlist, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8'
      }
    });
  }

  // 验证频道ID
  if (!CHANNEL_MAP[id]) {
    const supportedChannels = Object.keys(CHANNEL_MAP).join(', ');
    return new NextResponse(
      `错误：频道 '${id}' 不存在。\n\n支持的频道列表：\n${supportedChannels}`,
      { 
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  }

  // 获取频道流
  const streamInfo = await getStreamInfo(id);
  if (!streamInfo) {
    return new NextResponse('获取流信息失败', { status: 500 });
  }

  try {
    // 获取 m3u8 内容
    const response = await fetch(streamInfo.playURL, {
      method: 'POST',
      headers: {
        'Referer': `http://${streamInfo.refer}`
      }
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch stream', { status: 502 });
    }

    let m3u8Content = await response.text();

    // 替换 TS 地址为代理地址
    const host = getRealHost(request);
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}/api/liaoning`;

    m3u8Content = m3u8Content.replace(
      /(.*?)_(.*?\.ts)/gi,
      `${baseUrl}?ref=${streamInfo.refer}&u=$1/bdrm/$1_$2`
    );

    return new NextResponse(m3u8Content, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Content-Disposition': `filename=${id}.m3u8`
      }
    });
  } catch (error) {
    console.error('Stream error:', error);
    return new NextResponse('Stream error', { status: 500 });
  }
}
