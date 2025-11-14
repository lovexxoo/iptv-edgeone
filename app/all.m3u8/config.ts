/**
 * API目录名到地区名的映射配置
 * 用于生成 /api/all 汇总列表时的分组
 */

export interface RegionConfig {
  /** API目录名 */
  api: string;
  /** 频道前缀用的地区名（具体地名，如"石家庄"、"深圳"） */
  prefixName: string;
  /** 分组用的地区名（省级地名，如"河北"、"广东"） */
  groupName: string;
  /** 是否启用（可以临时禁用某些地区） */
  enabled: boolean;
}

/**
 * 地区配置列表
 * prefixName: 用于频道名称前缀（如：石家庄新闻、深圳卫视）
 * groupName: 用于M3U8分组（如：河北、广东）
 * 按拼音顺序排列，方便维护
 */
export const REGION_CONFIGS: RegionConfig[] = [
  { api: '4k', prefixName: '4K', groupName: '4K超高清', enabled: true },
  { api: 'anhui', prefixName: '安徽', groupName: '安徽', enabled: true },
  { api: 'beijing', prefixName: '北京', groupName: '北京', enabled: true },
  { api: 'cctv', prefixName: '央视', groupName: '央视', enabled: true },
  { api: 'chongqing', prefixName: '重庆', groupName: '重庆', enabled: true },
  { api: 'fujian', prefixName: '福建', groupName: '福建', enabled: true },
  { api: 'gansu', prefixName: '甘肃', groupName: '甘肃', enabled: true },
  { api: 'guangdong', prefixName: '广东', groupName: '广东', enabled: true },
  { api: 'guangxi', prefixName: '广西', groupName: '广西', enabled: true },
  { api: 'guangzhou', prefixName: '广州', groupName: '广东', enabled: true },
  { api: 'guizhou', prefixName: '贵州', groupName: '贵州', enabled: true },
  { api: 'hainan', prefixName: '海南', groupName: '海南', enabled: true },
  { api: 'hangzhou', prefixName: '杭州', groupName: '浙江', enabled: true },
  { api: 'hebei', prefixName: '河北', groupName: '河北', enabled: true },
  { api: 'heilongjiang', prefixName: '黑龙江', groupName: '黑龙江', enabled: true },
  { api: 'henan', prefixName: '河南', groupName: '河南', enabled: true },
  { api: 'hubei', prefixName: '湖北', groupName: '湖北', enabled: true },
  { api: 'hubei1', prefixName: '湖北', groupName: '湖北', enabled: true },
  { api: 'hunan', prefixName: '湖南', groupName: '湖南', enabled: true },
  { api: 'jiangsu', prefixName: '江苏', groupName: '江苏', enabled: true },
  { api: 'jiangxi', prefixName: '江西', groupName: '江西', enabled: true },
  { api: 'jilin', prefixName: '吉林', groupName: '吉林', enabled: true },
  { api: 'lanzhou', prefixName: '兰州', groupName: '甘肃', enabled: true },
  { api: 'liaoning', prefixName: '辽宁', groupName: '辽宁', enabled: true },
  { api: 'nanjing', prefixName: '南京', groupName: '江苏', enabled: true },
  { api: 'neimenggu', prefixName: '内蒙古', groupName: '内蒙古', enabled: true },
  { api: 'ningxia', prefixName: '宁夏', groupName: '宁夏', enabled: true },
  { api: 'qinghai', prefixName: '青海', groupName: '青海', enabled: true },
  { api: 'shaanxi', prefixName: '陕西', groupName: '陕西', enabled: true },
  { api: 'shandong', prefixName: '山东', groupName: '山东', enabled: true },
  { api: 'shanghai', prefixName: '上海', groupName: '上海', enabled: true },
  { api: 'shanxi', prefixName: '山西', groupName: '山西', enabled: true },
  { api: 'shenzhen', prefixName: '深圳', groupName: '广东', enabled: true },
  { api: 'sichuan', prefixName: '四川', groupName: '四川', enabled: true },
  { api: 'sjz', prefixName: '石家庄', groupName: '河北', enabled: true },
  { api: 'xinjiang', prefixName: '新疆', groupName: '新疆', enabled: true },
  { api: 'xizang', prefixName: '西藏', groupName: '西藏', enabled: true },
  { api: 'yunnan', prefixName: '云南', groupName: '云南', enabled: true },
  { api: 'zhejiang', prefixName: '浙江', groupName: '浙江', enabled: true },
  { api: 'zhejiang1', prefixName: '浙江', groupName: '浙江', enabled: true },
];

/**
 * 获取所有启用的API配置
 * 返回 [api, prefixName, groupName][] 数组
 */
export function getEnabledApiRegions(): Array<[string, string, string]> {
  return REGION_CONFIGS
    .filter(config => config.enabled)
    .map(config => [config.api, config.prefixName, config.groupName]);
}

/**
 * 根据API目录名获取配置
 */
export function getRegionConfig(api: string): { prefixName: string; groupName: string } | null {
  const config = REGION_CONFIGS.find(r => r.api === api);
  if (!config) return null;
  return {
    prefixName: config.prefixName,
    groupName: config.groupName
  };
}
