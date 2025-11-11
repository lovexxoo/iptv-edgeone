/**
 * 山东TV API路由
 * 支持26个山东广播电视台及地市台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { md5, aesDecrypt } from '../utils/crypto';
import { getRealHost } from '../utils/url';

export const runtime = 'edge';

// 频道映射表
const CHANNEL_MAP: { [key: string]: [number, string] } = {
  'sdws': [1, ''],           // 山东卫视
  'xwpd': [3, ''],           // 新闻频道
  'qlpd': [5, ''],           // 齐鲁频道
  'txyx': [7, ''],           // 体育休闲频道
  'shpd': [9, ''],           // 生活频道
  'zypd': [11, ''],          // 综艺频道
  'wlpd': [13, ''],          // 文旅频道
  'nkpd': [15, ''],          // 农科频道
  'sepd': [17, ''],          // 少儿频道
  'jndst': [29883, '/region'],   // 济南电视台
  'zbdst': [100010, '/region'],  // 淄博电视台
  'zzdst': [100023, '/region'],  // 枣庄电视台
  'dydst': [100011, '/region'],  // 东营电视台
  'ytdst': [100012, '/region'],  // 烟台电视台
  'wfdst': [100013, '/region'],  // 潍坊电视台
  'tadst': [100015, '/region'],  // 泰安电视台
  'whdst': [100016, '/region'],  // 威海电视台
  'rzdst': [100017, '/region'],  // 日照电视台
  'lydst': [100019, '/region'],  // 临沂电视台
  'dzdst': [100020, '/region'],  // 德州电视台
  'lcdst': [100021, '/region'],  // 聊城电视台
  'bzdst': [100022, '/region'],  // 滨州电视台
  'hzdst': [100024, '/region'],  // 菏泽电视台
  'jxdst': [100014, '/region'],  // 济宁电视台
  'lzdst': [100018, '/region'],  // 莱芜电视台
  'zcdst': [100026, '/region'],  // 枣庄电视台
};

// 频道名称
const CHANNEL_NAMES: { [key: string]: string } = {
  'sdws': '山东卫视', 'xwpd': '新闻频道', 'qlpd': '齐鲁频道',
  'txyx': '体育休闲', 'shpd': '生活频道', 'zypd': '综艺频道',
  'wlpd': '文旅频道', 'nkpd': '农科频道', 'sepd': '少儿频道',
  'jndst': '济南台', 'zbdst': '淄博台', 'zzdst': '枣庄台',
  'dydst': '东营台', 'ytdst': '烟台台', 'wfdst': '潍坊台',
  'tadst': '泰安台', 'whdst': '威海台', 'rzdst': '日照台',
  'lydst': '临沂台', 'dzdst': '德州台', 'lcdst': '聊城台',
  'bzdst': '滨州台', 'hzdst': '菏泽台', 'jxdst': '济宁台',
  'lzdst': '莱芜台', 'zcdst': '枣庄台',
};

/**
 * 获取播放地址
 * 响应数据格式: gzip压缩 → Base64编码 → AES-256-CBC加密
 * @param channelId 频道ID
 * @param path API路径后缀 ('' 或 '/region')
 * @param streamId 可选,指定streams数组中的特定流ID
 */
async function getStreamUrl(channelId: number, path: string, streamId?: number): Promise<string | null> {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = md5(`huangye${timestamp}211f68ea4aeb687a6561707b6e3523c84e`);

  const url = `https://sdxw.iqilu.com/v1/app/play/tv${path}/live?e=1&e=1`;

  // AES解密密钥和IV (来自CGI)
  const AES_KEY_HEX = '6262393735383763666138356563653535343961336432353766373931396633';
  const AES_IV_HEX = '30303030303030303030303030303030';

  try {
    // 使用GET请求,并添加完整的header (与CGI一致)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'version': '10.1.1',
        'orgid': '21',
        'platform': `android${timestamp}`,
        'imei': '7f918d21082ed7eb',
        'CQ-AGENT': '{os:android,imei:7f918d21082ed7eb,osversion:7.1.1,network:wifi,device_model:OPPO R9s,version:10.1.1,brand:oppo,core:2.0.0}',
        'timestamp': '',
        'noncestr': 'huangye',
        'sign': sign,
        'User-Agent': 'chuangqi.o.21.com.iqilu.ksd/10.1.1',
        'Host': 'sdxw.iqilu.com',
        'Connection': 'Keep-Alive',
        'Accept-Encoding': 'gzip',
      },
    });

    if (!response.ok) return null;

    // 1. 获取响应文本 (fetch会自动处理gzip)
    const base64Data = await response.text();
    
    // 2. AES-256-CBC解密
    const decrypted = await aesDecrypt(base64Data, AES_KEY_HEX, AES_IV_HEX);
    
    // 3. 解析JSON并查找频道
    try {
      const json = JSON.parse(decrypted);
      
      if (json.code === 1 && Array.isArray(json.data)) {
        const channel = json.data.find((ch: any) => ch.id === channelId);
        
        if (channel) {
          // 如果指定了streamId,从streams数组中查找
          if (streamId !== undefined && Array.isArray(channel.streams)) {
            const streamItem = channel.streams.find((s: any) => s.id === streamId);
            if (streamItem && streamItem.stream) {
              return streamItem.stream;
            }
          }
          
          // 否则返回主stream
          if (channel.stream) {
            return channel.stream;
          }
        }
      }
    } catch (parseError) {
      // JSON解析失败,使用正则表达式回退方案
      console.error('JSON parse failed, using regex fallback:', parseError);
      const pattern = new RegExp(`\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}`, 'gs');
      let match;
      
      while ((match = pattern.exec(decrypted)) !== null) {
        const obj = match[1];
        
        // 检查是否包含目标ID
        const idMatch = new RegExp(`"id"\\s*:\\s*${channelId}\\b`).exec(obj);
        if (idMatch) {
          // 提取stream字段
          const streamMatch = /"stream"\s*:\s*"([^"]+)"/.exec(obj);
          if (streamMatch) {
            // JSON反转义: \/ → /
            const stream = streamMatch[1].replace(/\\\//g, '/');
            return stream;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Get stream URL error:', error);
    return null;
  }
}

/**
 * 从API获取所有频道信息
 * 返回格式: { id: number | string, name: string, stream?: string }[]
 * id可能是数字(单流频道)或字符串(多流频道,格式: "channelId-streamId")
 */
async function getAllChannelsFromAPI(path: string = ''): Promise<Array<{id: number | string, name: string, stream?: string}>> {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = md5(`huangye${timestamp}211f68ea4aeb687a6561707b6e3523c84e`);

  const url = `https://sdxw.iqilu.com/v1/app/play/tv${path}/live?e=1&e=1`;

  // AES解密密钥和IV
  const AES_KEY_HEX = '6262393735383763666138356563653535343961336432353766373931396633';
  const AES_IV_HEX = '30303030303030303030303030303030';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'version': '10.1.1',
        'orgid': '21',
        'platform': `android${timestamp}`,
        'imei': '7f918d21082ed7eb',
        'CQ-AGENT': '{os:android,imei:7f918d21082ed7eb,osversion:7.1.1,network:wifi,device_model:OPPO R9s,version:10.1.1,brand:oppo,core:2.0.0}',
        'timestamp': '',
        'noncestr': 'huangye',
        'sign': sign,
        'User-Agent': 'chuangqi.o.21.com.iqilu.ksd/10.1.1',
        'Host': 'sdxw.iqilu.com',
        'Connection': 'Keep-Alive',
        'Accept-Encoding': 'gzip',
      },
    });

    if (!response.ok) return [];

    const base64Data = await response.text();
    const decrypted = await aesDecrypt(base64Data, AES_KEY_HEX, AES_IV_HEX);
    
    // 解析JSON并提取频道信息
    const channels: Array<{id: number | string, name: string, stream?: string}> = [];
    
    try {
      const json = JSON.parse(decrypted);
      
      if (json.code === 1 && Array.isArray(json.data)) {
        json.data.forEach((channel: any) => {
          if (channel.id && channel.name) {
            // 检查是否有streams数组(多个清晰度)
            if (Array.isArray(channel.streams) && channel.streams.length > 0) {
              const seenStreams = new Set<string>();  // 用于去重
              
              // 为每个清晰度创建独立条目
              channel.streams.forEach((streamItem: any) => {
                if (streamItem.stream && !seenStreams.has(streamItem.stream)) {
                  seenStreams.add(streamItem.stream);
                  channels.push({
                    id: `${channel.id}-${streamItem.id}`,  // 组合ID: 如 "1-1", "1-2"
                    name: `${channel.name}${streamItem.name}`,  // 组合名称: 如 "山东卫视高清", "山东卫视4K"
                    stream: streamItem.stream
                  });
                }
              });
              
              // 如果streams数组中所有流都重复或无效,使用主stream
              if (channels.filter(ch => ch.id.toString().startsWith(`${channel.id}-`)).length === 0 && channel.stream) {
                channels.push({
                  id: channel.id,
                  name: channel.name,
                  stream: channel.stream
                });
              }
            } else {
              // 没有streams数组,使用主stream
              channels.push({
                id: channel.id,
                name: channel.name,
                stream: channel.stream || undefined
              });
            }
          }
        });
      }
    } catch (parseError) {
      // 如果JSON解析失败,回退到正则表达式方式
      console.error('JSON parse failed, using regex fallback:', parseError);
      const pattern = new RegExp(`\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}`, 'gs');
      let match;
      
      while ((match = pattern.exec(decrypted)) !== null) {
        const obj = match[1];
        
        // 提取id
        const idMatch = /"id"\s*:\s*(\d+)/.exec(obj);
        if (!idMatch) continue;
        
        const id = parseInt(idMatch[1]);
        
        // 提取name
        const nameMatch = /"name"\s*:\s*"([^"]+)"/.exec(obj);
        const name = nameMatch ? nameMatch[1] : `频道${id}`;
        
        // 提取stream (可选)
        const streamMatch = /"stream"\s*:\s*"([^"]+)"/.exec(obj);
        const stream = streamMatch ? streamMatch[1].replace(/\\\//g, '/') : undefined;
        
        channels.push({ id, name, stream });
      }
    }

    return channels;
  } catch (error) {
    console.error('Get all channels error:', error);
    return [];
  }
}

/**
 * 获取可用频道列表(动态验证)
 * 从API获取真实的频道列表,包括省级和地市台
 * 会展开每个频道的多个清晰度流
 */
async function getAvailableChannels(): Promise<Array<{id: number | string, name: string, stream: string}>> {
  // 获取省级频道
  const provinceChannels = await getAllChannelsFromAPI('');
  
  // 获取地市频道
  const regionChannels = await getAllChannelsFromAPI('/region');
  
  // 合并所有频道
  const allChannels = [...provinceChannels, ...regionChannels];
  
  // 过滤出有stream的频道
  return allChannels.filter(ch => ch.stream) as Array<{id: number, name: string, stream: string}>;
}

/**
 * GET请求处理
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'sdws';

  // 如果是list请求，返回频道列表
  if (id === 'list') {
    let m3u8Content = '#EXTM3U\n';
    
    // 获取真实域名
    const host = getRealHost(request);
    const protocol = request.url.startsWith('https') ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}/api/shandong`;

    // 检查是否需要动态验证
    const all = searchParams.get('all');
    
    if (all === '1') {
      // 动态模式: 从API获取真实频道列表
      const availableChannels = await getAvailableChannels();
      
      for (const channel of availableChannels) {
        m3u8Content += `#EXTINF:-1,${channel.name}\n`;
        m3u8Content += `${baseUrl}?id=${channel.id}\n`;
      }
      
      return new NextResponse(m3u8Content, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'public, max-age=300', // 5分钟缓存
        },
      });
    } else {
      // 静态模式: 返回预定义频道
      for (const [cid, _] of Object.entries(CHANNEL_MAP)) {
        const channelName = CHANNEL_NAMES[cid] || cid;
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
  }

  // 尝试从预定义映射获取频道
  let channelId: number;
  let path: string;
  let streamId: number | undefined;  // 用于指定特定的流
  
  if (CHANNEL_MAP[id]) {
    // 从CHANNEL_MAP获取
    [channelId, path] = CHANNEL_MAP[id];
  } else {
    // 检查是否为组合ID (格式: "channelId-streamId")
    const parts = id.split('-');
    
    if (parts.length === 2) {
      // 组合ID: "1-2" 表示频道1的流2
      channelId = parseInt(parts[0]);
      streamId = parseInt(parts[1]);
      
      if (isNaN(channelId) || isNaN(streamId)) {
        return new NextResponse('Invalid channel ID format', {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
      
      path = channelId >= 29883 ? '/region' : '';
    } else {
      // 尝试直接使用id作为频道ID
      const numId = parseInt(id);
      if (isNaN(numId)) {
        return new NextResponse(
          `Channel not found: ${id}\nAvailable channels: ${Object.keys(CHANNEL_MAP).join(', ')}`,
          {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          }
        );
      }
      
      // 判断是否为地市频道 (ID >= 29883)
      channelId = numId;
      path = numId >= 29883 ? '/region' : '';
    }
  }

  // 获取播放地址
  const streamUrl = await getStreamUrl(channelId, path, streamId);

  if (!streamUrl) {
    return new NextResponse('Stream not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
