/**
 * 获取真实的请求域名
 * EdgeOne Pages内部使用localhost:9000或pages-scf域名，需要从headers中获取真实域名
 */
export function getRealHost(request: Request): string {
  // 内部域名关键词（需要过滤的）
  const internalKeywords = ['localhost', 'pages-scf', 'qcloudteo.com', '127.0.0.1'];
  
  const isInternalHost = (host: string | null): boolean => {
    if (!host) return true;
    return internalKeywords.some(keyword => host.includes(keyword));
  };
  
  // 1. 从 X-Forwarded-Host 获取（EdgeOne代理时最可靠）
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost && !isInternalHost(forwardedHost)) {
    return forwardedHost;
  }
  
  // 2. 从 X-Original-Host 获取
  const originalHost = request.headers.get('x-original-host');
  if (originalHost && !isInternalHost(originalHost)) {
    return originalHost;
  }
  
  // 3. 从 URL 中提取（如果是公网域名）
  try {
    const url = new URL(request.url);
    if (!isInternalHost(url.host)) {
      return url.host;
    }
  } catch {}
  
  // 4. 从 Referer 获取（浏览器访问时有效）
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererHost = refererUrl.host;
      if (!isInternalHost(refererHost)) {
        return refererHost;
      }
    } catch {}
  }
  
  // 5. 从 Host header 获取（可能被EdgeOne修改）
  const hostHeader = request.headers.get('host');
  if (hostHeader && !isInternalHost(hostHeader)) {
    return hostHeader;
  }
  
  // 6. 检查是否为开发环境
  if (process.env.NODE_ENV === 'development') {
    return 'localhost:3000';
  }
  
  // 7. 默认返回配置的域名（EdgeOne环境下的兜底方案）
  return process.env.PUBLIC_DOMAIN || 'iptv.tmd2.com';
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
