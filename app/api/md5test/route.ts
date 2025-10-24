import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 简单测试:直接导入shenzhen的MD5?不行,我们直接测试字符串
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || 'bf9b2cab35a9c38857b82aabf99874aa96b9ffbb/4azbkoY/500/l3rhasb.m3u868fb4c21';
  
  // 使用 Web Crypto API 的 SHA-256 来验证环境
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return NextResponse.json({
    input: text.substring(0, 50) + '...',
    inputLength: text.length,
    sha256,
    note: 'MD5 not available in Web Crypto API, using SHA-256 for testing'
  });
}
