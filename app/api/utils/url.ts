/**
 * 获取真实的请求域名
 * EdgeOne Pages内部使用localhost:9000或pages-scf域名，需要从headers中获取真实域名
 */
export function getRealHost(request: Request): string {
  // 尝试多种方式获取真实域名
  
  // 1. 从 X-Forwarded-Host 获取（EdgeOne代理时最可靠）
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('pages-scf') && !forwardedHost.includes('qcloudteo.com')) {
    return forwardedHost;
  }
  
  // 2. 从 X-Original-Host 获取
  const originalHost = request.headers.get('x-original-host');
  if (originalHost && !originalHost.includes('localhost') && !originalHost.includes('pages-scf') && !originalHost.includes('qcloudteo.com')) {
    return originalHost;
  }
  
  // 3. 从 Referer 获取（浏览器访问时有效）
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererHost = refererUrl.host;
      if (!refererHost.includes('localhost') && !refererHost.includes('pages-scf') && !refererHost.includes('qcloudteo.com')) {
        return refererHost;
      }
    } catch {}
  }
  
  // 4. 从 Host header 获取（可能被EdgeOne修改）
  const hostHeader = request.headers.get('host');
  if (hostHeader && !hostHeader.includes('localhost') && !hostHeader.includes('pages-scf') && !hostHeader.includes('qcloudteo.com')) {
    return hostHeader;
  }
  
  // 5. 默认返回配置的域名（EdgeOne环境下的兜底方案）
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
