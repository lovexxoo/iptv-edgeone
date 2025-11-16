/**
 * 获取真实的请求域名
 * EdgeOne Pages内部使用localhost:9000或pages-scf域名，需要从headers中获取真实域名
 */
export function getRealHost(request: Request): string {
  // 内部域名关键词（EdgeOne/CloudFlare等CDN的内部域名）
  const internalKeywords = ['pages-scf', 'qcloudteo.com'];
  
  const isInternalHost = (host: string | null): boolean => {
    if (!host) return true;
    return internalKeywords.some(keyword => host.includes(keyword));
  };
  
  // 检查是否存在代理 headers（说明在生产环境/CDN后面）
  const forwardedHost = request.headers.get('x-forwarded-host');
  const originalHost = request.headers.get('x-original-host');
  const hasCDNHeaders = forwardedHost || originalHost;
  
  // 1. 从 X-Forwarded-Host 获取（EdgeOne/CDN代理时最可靠）
  if (forwardedHost && !isInternalHost(forwardedHost)) {
    return forwardedHost;
  }
  
  // 2. 从 X-Original-Host 获取
  if (originalHost && !isInternalHost(originalHost)) {
    return originalHost;
  }
  
  // 3. 从 URL 中提取
  let urlHost: string | null = null;
  try {
    const url = new URL(request.url);
    urlHost = url.host;
    if (!isInternalHost(urlHost)) {
      return urlHost;
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
  
  // 5. 从 Host header 获取
  const hostHeader = request.headers.get('host');
  if (hostHeader && !isInternalHost(hostHeader)) {
    return hostHeader;
  }
  
  // 6. 本地开发环境判断
  // 如果没有 CDN headers，说明是直连（本地/Docker），返回实际请求的 host
  // 如果有 CDN headers 但是 host 是 localhost，说明是 EdgeOne 内部转发，不应该返回
  if (!hasCDNHeaders) {
    // 没有 CDN headers，是真正的本地环境，直接返回 urlHost 或 hostHeader
    if (urlHost) return urlHost;
    if (hostHeader) return hostHeader;
  }
  
  // 7. 检查是否为开发环境
  if (process.env.NODE_ENV === 'development') {
    return 'localhost:3000';
  }
  
  // 8. 默认返回配置的域名（EdgeOne环境下的兜底方案）
  // 如果走到这里说明所有检测方法都失败了，记录警告
  if (!process.env.PUBLIC_DOMAIN) {
    console.warn('[getRealHost] Unable to determine real host from headers, using fallback domain');
    console.warn('[getRealHost] Request URL:', request.url);
    console.warn('[getRealHost] Headers:', {
      'x-forwarded-host': forwardedHost,
      'x-original-host': originalHost,
      'host': hostHeader,
      'referer': request.headers.get('referer'),
    });
  }
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
