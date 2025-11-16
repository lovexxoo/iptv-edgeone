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
  
  // 6. 如果是本地开发/测试环境（Docker或npm dev），返回实际请求的host
  // 这样在Docker容器内通过127.0.0.1:3000访问时能正确返回127.0.0.1:3000
  if (urlHost && (urlHost.includes('localhost') || urlHost.includes('127.0.0.1'))) {
    return urlHost;
  }
  
  if (hostHeader && (hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1'))) {
    return hostHeader;
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
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-original-host': request.headers.get('x-original-host'),
      'host': request.headers.get('host'),
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
