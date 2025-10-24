/**
 * 深圳台pathname算法测试API
 * 用于调试EdgeOne环境
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') || '4azbkoY';
  
  // 获取今天0点的时间戳
  const today = new Date();
  const nowMs = today.getTime();
  const nowIso = today.toISOString();
  
  // 使用CST时区(UTC+8)
  const cstOffset = 8 * 60 * 60 * 1000;
  const cstToday = new Date(today.getTime() + cstOffset);
  cstToday.setUTCHours(0, 0, 0, 0);
  const todayMs = cstToday.getTime() - cstOffset;
  const todayIso = cstToday.toISOString();
  const timestampStr = todayMs.toString();
  
  // 计算r和l
  let r = 0;
  let l = 0;
  let d = -1;
  
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    r += charCode;
    if (d !== -1) {
      l += (d - charCode);
    }
    d = charCode;
  }
  r += l;
  
  // 简单的36进制转换
  const toBase36 = (num: number): string => {
    if (num === 0) return '0';
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    while (num > 0) {
      result = chars[num % 36] + result;
      num = Math.floor(num / 36);
    }
    return result;
  };
  
  const s = toBase36(r);
  
  const result = {
    code,
    time: {
      nowMs,
      nowIso,
      todayMs,
      todayIso,
      timestampStr,
      wday: today.getDay()
    },
    calc: {
      r,
      l,
      s
    },
    expected: {
      timestampStr: '1761235200000',
      r: 639,
      l: -37,
      s: 'hr',
      pathname: 'l3rhasb'
  ,
      testMd5: "test",
  }
  };
  
  return NextResponse.json(result, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}
