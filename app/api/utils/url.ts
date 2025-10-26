/**
 * 获取真实的请求域名
 * EdgeOne Pages内部使用localhost:9000，需要从headers中获取真实域名
 */
export function getRealHost(request: Request): string {
  // 尝试多种方式获取真实域名
  
  // 1. 从 Host header 获取（最可靠）
  const hostHeader = request.headers.get('host');
  if (hostHeader && !hostHeader.includes('localhost') && !hostHeader.includes('pages-scf')) {
    return hostHeader;
  }
  
  // 2. 从 X-Forwarded-Host 获取
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    return forwardedHost;
  }
  
  // 3. 从 X-Original-Host 获取
  const originalHost = request.headers.get('x-original-host');
  if (originalHost) {
    return originalHost;
  }
  
  // 4. 从 Referer 获取（浏览器访问时有效）
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host;
    } catch {}
  }
  
  // 5. 从请求URL获取（降级方案）
  try {
    const url = new URL(request.url);
    return url.host;
  } catch {}
  
  // 6. 默认返回配置的域名
  return 'iptv.tmd2.com';
}

/**
 * 构建完整的API URL
 */
export function buildApiUrl(request: Request, apiPath: string, channelId?: string): string {
  const host = getRealHost(request);
  const protocol = request.url.startsWith('https') ? 'https' : 'http';
  
  let url = `${protocol}://${host}${apiPath}`;
  if (channelId) {
    url += `?id=${channelId}`;
  }
  
  return url;
}
