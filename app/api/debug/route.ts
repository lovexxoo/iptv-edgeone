/**
 * Debug API - 查看EdgeOne请求头
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const headers: { [key: string]: string } = {};
  
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return NextResponse.json({
    url: request.url,
    method: request.method,
    headers: headers,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
