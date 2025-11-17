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

// 频道配置表 - 按照 PHP 版本的完整配置
interface ChannelConfig {
  type: string;
  groupId: string;
  id: string;
  sign: string;
  name: string;
}

const CHANNEL_MAP: Record<string, ChannelConfig> = {
  // 北斗融媒 - 辽宁省台
  'lnws': { type: 'bdrm', groupId: 'd91158f1dc87e3b10ee20cf9fbd36390', id: 'c077b260424404846285cba1e1759280', sign: 'NDEyNjcxNzg1NzY2MDc3490E578144B71624745B39DD0DC0D1AC', name: '辽宁卫视' },
  'lnds': { type: 'bdrm', groupId: 'd91158f1dc87e3b10ee20cf9fbd36390', id: '10d3de0d03c62e85a1a281bbde8b6952', sign: 'ODI0NTYxNzg1NzY2MDc3F0B1FD729E76A90CA24FAAE02357F59D', name: '辽宁都市' },
  'lnys': { type: 'bdrm', groupId: 'd91158f1dc87e3b10ee20cf9fbd36390', id: '918510749a0f319ec12ff695b1c95230', sign: 'MDI0NjkxNzg1NzY2MDc35199C51477AAD1DF17E160A2EB30213B', name: '辽宁影视' },
  'lnjy': { type: 'bdrm', groupId: 'd91158f1dc87e3b10ee20cf9fbd36390', id: '854e7044de9fef5163ae36fabb72de56', sign: 'NTI0NTkxNzg1NzY2MDc38F221A56ADA818918271C956FBA074EE', name: '辽宁教育青少' },
  'lnsh': { type: 'bdrm', groupId: 'd91158f1dc87e3b10ee20cf9fbd36390', id: '078ce87dcf5384d51e4655cb962fda18', sign: 'MzI0NjkxNzg1NzY2MDc3A6C5F5DC5AAD1598E6E413EB4C226089', name: '辽宁生活' },
  'lnty': { type: 'bdrm', groupId: 'd91158f1dc87e3b10ee20cf9fbd36390', id: 'e0bb9a7fd9afa954658bc50d0681cd49', sign: 'NDIzNjcxNzg1NzY2MDc326E12A5421D7907E1675C0BB8EB3E96C', name: '辽宁体育' },
  'lnbf': { type: 'bdrm', groupId: 'd91158f1dc87e3b10ee20cf9fbd36390', id: '8e95535378bd3e5f7494bc23ab1cb117', sign: 'NjE0NjcxNzg1NzY2MDc3EA435FC58A7F614BAE16828C0AADDB97', name: '辽宁北方' },
  'lnyj': { type: 'bdrm', groupId: 'd91158f1dc87e3b10ee20cf9fbd36390', id: 'c577efa61117f1ee9687592aa1fd49e8', sign: 'OTI0NTcxNzg1NzY2MDc381F5CC52B2DED40EAE6156756891C92C', name: '辽宁宜佳购物' },
  'lnxdm': { type: 'bdrm', groupId: 'd91158f1dc87e3b10ee20cf9fbd36390', id: '7ff8ce0d226f2eb92e332be0cb13b406', sign: 'MDE0NTkxNzg1NzY2MDc305F5C582D565E4C0A3722551C3C591BB', name: '辽宁新动漫' },
  'lnjtlc': { type: 'bdrm', groupId: 'd91158f1dc87e3b10ee20cf9fbd36390', id: '7e29bde4f41ca08642b7fc3ce4eb1ae4', sign: 'ODEyMzUxNzg1NzY2MDc3D85948DEB26600EB95049D334A9550A7', name: '辽宁家庭理财' },
  'lnyd': { type: 'bdrm', groupId: 'd91158f1dc87e3b10ee20cf9fbd36390', id: 'fb3cf5af7cd3bcbde56c280cad2e64cb', sign: 'ODE0NTcxNzg1NzY2MDc3E6EDF6FAA3A2C8E669D8427660736FA2', name: '辽宁移动电视' },
  
  // 抚顺
  'fszh': { type: 'fsgbdst', groupId: '586ae47ad6f2db5866babc99cf8d3617', id: 'b2326b3d482e30a9d95d63e09fc3f460', sign: 'NjE0NTYxNzg1NzY2MDc3F9358EB2E403FBC9E62F8E46CCA62D57', name: '抚顺综合' },
  'fsjy': { type: 'fsgbdst', groupId: '586ae47ad6f2db5866babc99cf8d3617', id: 'c0d75ae269a96b4e8a8f67fd1b4a316e', sign: 'NTE0NjkxNzg1NzY2MDc344718B3A053EF59ADCAAF54BA54ECCBA', name: '抚顺教育' },
  'qyzh': { type: 'qingyuan', groupId: '0b83732a7b69fbd61caad074a4d8de08', id: '907b5c520cb34f92ac0997542431076f', sign: 'NzIzNDUxNzg1NzY2MDc3B0CDF36D3C0B73EBF88F4B52049C5026', name: '清原综合' },
  
  // 铁岭
  'dbszh': { type: 'diaobingshan', groupId: '084e85c0775691975c6f5d87ff29c535', id: '06686835e532339822ba87250359062e', sign: 'NDE0NTYxNzg1NzY2MDc37B6B5591736F197379363AB7EFB0144B', name: '调兵山综合' },
  'ctzh': { type: 'changtu', groupId: '8c58ac19aacc3b4079768d870f8f9bc6', id: '77b08c94f5f06f2e0f81c34e048b88a5', sign: 'MzE0NjkxNzg1NzY2MDc31A0F502874629CE2BC4385BF396ED6E3', name: '昌图综合' },
  'xfzh': { type: 'xifeng', groupId: 'cdce0e6bf7f498d9ee50a7506699dca0', id: '1328caa0b1af409eb5df9e6219e372ca', sign: 'MDE0NjcxNzg1NzY2MDc33705B6970357D97DC504452A48DAA35C', name: '西丰综合' },
  'kyzh': { type: 'kaiyuan', groupId: '6305e714b752d5a3e99700a62bfc03bb', id: 'fb21b09f0ff234cf9bd875f28c6e292b', sign: 'MDEzNTkxNzg1NzY2MDc3389E50D0FFD1A612AC5DFCC07433EBE1', name: '开原综合' },
  
  // 沈阳
  'fkxwzh': { type: 'faku', groupId: '201021a06e6577b49da709306e58da94', id: 'a3b23d35ddaa48b2a83857137b6fedac', sign: 'NjEzNjkxNzg1NzY2MDc34AB60D4F26CFC950FFC23CD1355B2B93', name: '法库新闻综合' },
  'xmzh': { type: 'xinmin', groupId: 'f4e0888bc12e35525c5d706993f59a0c', id: 'dfecf2346b3349acb8e9aeca1c357f89', sign: 'NzE0NjcxNzg1NzY2MDc38404A7B68907ED8B962DCE6B5D40C7E0', name: '新民综合' },
  
  // 朝阳
  'cyxdst': { type: 'chaoyang', groupId: '0c519f8ab44ab2342a80e909047c2729', id: 'ab980e1e8b434701a3fe30b47d500d3b', sign: 'NjIzNDYxNzg1NzY2MDc39E4F4CDA88E2E4AEA43397D245711379', name: '朝阳县广播电视台' },
  'bpxwzh': { type: 'beipiao', groupId: 'fd4201c5dd19d72ed944acf010b3913f', id: '5a229d456caa4cdba4e93e36bf20678a', sign: 'MTIzNjcxNzg1NzY2MDc321E7A25C0BAE61D29AE1DC2B5BD00480', name: '北票新闻综合' },
  'kzzh': { type: 'kazuo', groupId: '29d3fb5c2f279587d4d1cd76dca7055b', id: '1eabde0f69c94bdce63705656c922220', sign: 'MjIzNjkxNzg1NzY2MDc34A6915247FE0AD832970501D00F3D8A9', name: '喀左综合' },
  
  // 阜新
  'fmhyzh': { type: 'fumeng', groupId: '7cfd84127e0e9491d47589a2c5f8d54a', id: '60c458b8acdd039e1884f63babb769ac', sign: 'OTEyNTYxNzg1NzY2MDc31A63270EA1377F89E48C43C255413DE7', name: '阜蒙汉语综合' },
  'zwzh': { type: 'zhangwu', groupId: 'a4c21afece4a6f3b22076713562dfb42', id: '0e0574ed6004404eb7742344ffff9851', sign: 'MDE0NjcxNzg1NzY2MDc3D2D65CFB0F17079E5C42B314C7C64695', name: '彰武综合' },
  
  // 葫芦岛
  'xczh': { type: 'xingcheng', groupId: '0ccdf323fb5e0e67b978f7d5405aea09', id: '02f5583da51cec4a7aaf80e1d0734c88', sign: 'MDIzNjcxNzg1NzY2MDc33B733E585D864608742EA1CF4C35DB22', name: '兴城综合' },
  'szzh': { type: 'suizhong', groupId: '7434b92fc4eaff622bffbdecdc776a3f', id: '88c54422a27a82ac15a0cb62e1120335', sign: 'MDI0NTgxNzg1NzY2MDc3981A6537EF948A1BCAB49E29A52BDCB8', name: '绥中综合' },
  
  // 大连
  'wfdxwzh': { type: 'wafangdian', groupId: '8f0774048509accaac5c495bf08145f2', id: '045011f3c0914ac1a96f3279a753c98c', sign: 'NTE0NjcxNzg1NzY2MDc38782188ED1AB2AE2532333DCB4CF5E3F', name: '瓦房店新闻综合' },
  'zhzh': { type: 'zhuanghe', groupId: 'e043ba0420ee7367ed8f58ba4ecc0080', id: '8891fc9a1d2753a6bfc86faf57e2912a', sign: 'MDI0NjcxNzg1NzY2MDc3877904318E674F3EBA9832EA0FF8F4E6', name: '庄河综合' },
  
  // 丹东
  'dgxdg': { type: 'donggang', groupId: 'b8d29ac77a60922d079dcf608df440d8', id: '4afb2cf41d8242408b770e83b0c828b8', sign: 'OTI0NTcxNzg1NzY2MDc350AC8979A3572E5BA25FC954F64976EE', name: '东港新东港' },
  'kdzh': { type: 'kuandian', groupId: '5d677d377b5f9e4649430fd715dff056', id: 'b12940ec52807af72f86af4ad50234b9', sign: 'MjE0NjcxNzg1NzY2MDc364537B85B6677C1D4944792FC9CE6E28', name: '宽甸综合' },
  
  // 辽阳
  'lyxwzh': { type: 'lys', groupId: '81c5990fafee3dbd9015b7a80f78bc38', id: '3ab65e5440d63a760a326fdc99fc2284', sign: 'NjEyNjcxNzg1NzY2MDc30A195BC67848DA945E75B5FA988747B2', name: '辽阳新闻综合' },
  'lyshsh': { type: 'lys', groupId: '81c5990fafee3dbd9015b7a80f78bc38', id: '1608db4a6543faf21a43262953cb3844', sign: 'NDEzNjgxNzg1NzY2MDc3A317CB4F08D985FC6E0EA5A5FED388F6', name: '辽阳社会生活' },
  
  // 营口
  'ykxwzh': { type: 'yingkou', groupId: '019eb9aaf5c03f5fa47f1c861abe1bc1', id: '1b2dc76c9a4980391cf779302ca5a0c5', sign: 'MjI0NTcxNzg1NzY2MDc30E5745DEC694F1CF65CFA3B8D32BAD02', name: '营口新闻综合' },
  'yklh': { type: 'yingkou', groupId: '019eb9aaf5c03f5fa47f1c861abe1bc1', id: '70bdc7636d61e36fcabee748519d8734', sign: 'NDI0NjcxNzg1NzY2MDc30256ACC81D5DAB68722CD9CCF601B661', name: '营口辽河文化生活' }
};
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
 * 检查当前是否为直播,并获取可用的流地址
 * 逻辑: 优先使用直播流,只有停播时才用回放流
 */
async function checkLiveStatus(channelConfig: ChannelConfig): Promise<{ isLive: boolean; m3u8Url: string }> {
  const now = new Date();
  const timezone = 'Asia/Shanghai';
  
  // 先获取基础直播流地址
  const domainUrl = `https://${channelConfig.type}.bdy.lnyun.com.cn/cloud/apis/live/api/domain/getGroupDomain?groupId=${channelConfig.groupId}&shows=1`;
  const domainRes = await fetch(domainUrl);
  const domainData = await domainRes.json();

  let liveM3u8Url = '';
  for (const tv of domainData.data || []) {
    if (tv.id === channelConfig.id) {
      const pull = JSON.parse(tv.pull);
      liveM3u8Url = pull.m3u8;
      break;
    }
  }

  if (!liveM3u8Url) {
    return { isLive: false, m3u8Url: '' };
  }
  
  // 检查EPG,判断是否停播
  for (let day = 0; day <= 1; day++) {
    const checkDate = new Date(now);
    if (day > 0) {
      checkDate.setDate(checkDate.getDate() - day);
    }
    
    const dateStr = checkDate.toLocaleDateString('zh-CN', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
    
    try {
      const programUrl = `https://${channelConfig.type}.bdy.lnyun.com.cn/cloud/apis/live/api/program/getNewProgram?domainId=${channelConfig.id}&times=${dateStr}`;
      const res = await fetch(programUrl);
      const data = await res.json();
      
      if (data.code === 200 && data.data && data.data.length > 0) {
        const epg = data.data[0];
        const currentTime = Math.floor(Date.now() / 1000);
        const isToday = day === 0;
        
        // 保存最近的有效回放URL(用于停播时)
        let vodUrl = '';
        
        if (isToday) {
          // 今天:检查是否在停播时段
          for (let i = 0; i < epg.startTimeStamp.length; i++) {
            const isStopped = epg.name[i].includes('停播');
            
            // 保存非停播时段的回放URL
            if (!isStopped && epg.pullDomain && epg.pullDomain[i]) {
              vodUrl = epg.pullDomain[i];
            }
            
            // 如果当前时段停播,返回最近的回放URL
            if (isStopped && epg.startTimeStamp[i] <= currentTime && currentTime <= epg.endTimeStamp[i]) {
              // 当前正在停播,使用回放流
              if (vodUrl) {
                return { isLive: false, m3u8Url: vodUrl };
              }
              // 没有可用回放,返回空
              return { isLive: false, m3u8Url: '' };
            }
          }
          
          // 当前时段正常播出,使用直播流
          return { isLive: true, m3u8Url: liveM3u8Url };
        } else {
          // 昨天:找最后一个非停播的回放URL
          if (epg.pullDomain) {
            for (let i = epg.startTimeStamp.length - 1; i >= 0; i--) {
              const isStopped = epg.name[i].includes('停播');
              if (!isStopped && epg.pullDomain[i]) {
                vodUrl = epg.pullDomain[i];
                break;
              }
            }
          }
          
          if (vodUrl) {
            return { isLive: false, m3u8Url: vodUrl };
          }
        }
      }
    } catch (error) {
      console.error(`Failed to get program for ${channelConfig.name}:`, error);
    }
  }
  
  // 默认返回直播流
  return { isLive: true, m3u8Url: liveM3u8Url };
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
    // 1. 检查直播状态并获取实际播放URL
    const liveStatus = await checkLiveStatus(channelConfig);
    if (!liveStatus.m3u8Url) {
      console.error('Stream not found for:', channelId);
      return null;
    }
    
    const m3u8Url = liveStatus.m3u8Url;

    // 2. 获取OAuth信息
    const oauthUrl = `https://${channelConfig.type}.bdy.lnyun.com.cn/cloud/apis/live/api/domain/getOauth?domainId=${channelConfig.id}&version=3&sign=${channelConfig.sign}`;
    const oauthRes = await fetch(oauthUrl, { method: 'POST' });
    const oauthData = await oauthRes.json();

    // 3. RSA解密
    const authKey = rsaDecrypt(oauthData.msg);
    const referData = JSON.parse(oauthData.data);
    let refer = rsaDecrypt(referData.refer);

    console.log(`[${channelId}] Decrypted refer (raw):`, refer);

    if (!authKey || !refer) {
      console.error('Failed to decrypt auth info');
      return null;
    }

    // 确保 refer 以 http:// 开头 (与PHP代码一致)
    if (!refer.startsWith('http://') && !refer.startsWith('https://')) {
      refer = 'http://' + refer;
      console.log(`[${channelId}] Added protocol prefix:`, refer);
    }

    // 4. 生成auth_key
    const ts = Math.floor(Date.now() / 1000) + 1800;
    const urlPath = new URL(m3u8Url).pathname;
    const authString = `${urlPath}-${ts}-0-0-${authKey}`;
    const authHash = crypto.createHash('md5').update(authString).digest('hex');
    // 判断URL是否已有查询参数,决定用 ? 还是 &
    const connector = m3u8Url.includes('?') ? '&' : '?';
    const playURL = `${m3u8Url}${connector}auth_key=${ts}-0-0-${authHash}`;

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
      // ref参数已经包含协议前缀(http://),不要重复添加
      const referUrl = ref.startsWith('http') ? ref : `http://${ref}`;
      
      const response = await fetch(playURL, {
        headers: {
          'Referer': referUrl
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
    // 获取 m3u8 内容 - 注意: 这里用 GET 方法,不是 POST
    // refer 已经在 getStreamInfo 中添加了协议前缀,直接使用
    console.log(`[${id}] Fetching m3u8: ${streamInfo.playURL}`);
    console.log(`[${id}] Using Referer: ${streamInfo.refer}`);
    
    const response = await fetch(streamInfo.playURL, {
      headers: {
        'Referer': streamInfo.refer
      }
    });

    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch stream: ${response.status} - ${errorText}`);
      return new NextResponse(`Failed to fetch stream: ${response.status}`, { status: 502 });
    }

    let m3u8Content = await response.text();

    // 替换 TS 地址为代理地址
    const host = getRealHost(request);
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}/api/liaoning`;
    
    // 获取m3u8的基础路径(用于拼接相对路径的TS)
    const m3u8BaseUrl = new URL(streamInfo.playURL).origin + new URL(streamInfo.playURL).pathname.substring(0, new URL(streamInfo.playURL).pathname.lastIndexOf('/') + 1);

    // 替换所有非#开头的行(TS URL行)
    m3u8Content = m3u8Content.replace(
      /^((?!#).+)$/gm,
      (match) => {
        const tsLine = match.trim();
        if (!tsLine) return match;
        
        // 判断是否为绝对URL
        let tsFullUrl: string;
        if (tsLine.startsWith('http://') || tsLine.startsWith('https://')) {
          tsFullUrl = tsLine;
        } else {
          // 相对URL,加上基础路径
          tsFullUrl = m3u8BaseUrl + tsLine;
        }
        
        // 移除协议和https://前缀,只保留域名和路径部分作为u参数
        const tsUrlWithoutProtocol = tsFullUrl.replace(/^https?:\/\//, '');
        
        return `${baseUrl}?ref=${encodeURIComponent(streamInfo.refer)}&u=${encodeURIComponent(tsUrlWithoutProtocol)}`;
      }
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
