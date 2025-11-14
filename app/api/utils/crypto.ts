/**
 * 加密工具函数
 * 适用于Edge Runtime环境
 */

/**
 * MD5哈希 - 基于blueimp-md5实现
 * 经过验证可以生成正确的MD5哈希值
 * 
 * @param string - 要hash的字符串
 * @returns 32位小写hex字符串
 * 
 * @example
 * md5('hello') // '5d41402abc4b2a76b9719d911017c592'
 */
export function md5(string: string): string {
  function md5cycle(x: number[], k: number[]): void {
    let a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function md51(s: string): number[] {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i: number;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) {
        tail[i] = 0;
      }
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s: string): number[] {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  const hex_chr = '0123456789abcdef'.split('');

  function rhex(n: number): string {
    let s = '';
    for (let j = 0; j < 4; j++) {
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
    }
    return s;
  }

  function hex(x: number[]): string {
    const result: string[] = [];
    for (let i = 0; i < x.length; i++) {
      result[i] = rhex(x[i]);
    }
    return result.join('');
  }

  function add32(a: number, b: number): number {
    return (a + b) & 0xFFFFFFFF;
  }

  return hex(md51(string));
}

/**
 * SHA256哈希 (使用Web Crypto API)
 * 注意: 只在支持Web Crypto API的环境中可用
 * 
 * @param message - 要hash的字符串
 * @returns Promise<32位小写hex字符串>
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * HMAC-SHA256 (使用Web Crypto API)
 * 用于生成签名等场景
 * 
 * @param message - 要签名的消息
 * @param key - 密钥字符串
 * @returns Promise<64位小写hex字符串>
 */
export async function hmacSha256(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);

  // 导入密钥
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // 生成签名
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * AES-256-CBC解密 (使用Web Crypto API)
 * 用于山东TV API响应解密
 * 
 * @param base64Data - Base64编码的加密数据
 * @param keyHex - 十六进制格式的密钥
 * @param ivHex - 十六进制格式的初始化向量
 * @returns Promise<解密后的字符串>
 */
export async function aesDecrypt(base64Data: string, keyHex: string, ivHex: string): Promise<string> {
  // 将hex转为Uint8Array
  function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  // Base64解码
  function base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  const keyBytes = hexToBytes(keyHex);
  const ivBytes = hexToBytes(ivHex);
  const encryptedBytes = base64ToBytes(base64Data);

  // 导入密钥 - 使用slice(0)创建新的ArrayBuffer
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.slice(0),
    { name: 'AES-CBC', length: 256 },
    false,
    ['decrypt']
  );

  // 解密 - 使用slice(0)创建新的ArrayBuffer
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: ivBytes.slice(0) },
    cryptoKey,
    encryptedBytes.slice(0)
  );

  // 转换为字符串 (移除PKCS7 padding)
  const bytes = new Uint8Array(decrypted);
  const paddingLength = bytes[bytes.length - 1];
  
  // 验证PKCS7 padding是否有效
  if (paddingLength > 0 && paddingLength <= 16) {
    // 检查所有padding字节是否一致
    let validPadding = true;
    for (let i = 1; i <= paddingLength; i++) {
      if (bytes[bytes.length - i] !== paddingLength) {
        validPadding = false;
        break;
      }
    }
    
    if (validPadding) {
      // 移除有效的padding
      const textBytes = bytes.slice(0, bytes.length - paddingLength);
      return new TextDecoder().decode(textBytes);
    }
  }
  
  // 如果padding无效,返回完整数据
  return new TextDecoder().decode(bytes);
}

/**
 * AES-128-CBC解密 (使用Web Crypto API)
 * 用于CCTV等需要128位密钥的CBC解密
 * 
 * @param base64Data - Base64编码的加密数据
 * @param key - 16字节密钥字符串或Uint8Array
 * @param iv - 16字节IV字符串或Uint8Array
 * @returns Promise<解密后的字符串>
 */
export async function aes128CbcDecrypt(
  base64Data: string, 
  key: string | Uint8Array, 
  iv: string | Uint8Array
): Promise<string> {
  // Base64解码
  function base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // 字符串转Uint8Array
  function strToBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  const keyBytes = typeof key === 'string' ? strToBytes(key) : key;
  const ivBytes = typeof iv === 'string' ? strToBytes(iv) : iv;
  const encryptedBytes = base64ToBytes(base64Data);

  // 导入密钥
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.slice(0),
    { name: 'AES-CBC', length: 128 },
    false,
    ['decrypt']
  );

  // 解密
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: ivBytes.slice(0) },
    cryptoKey,
    encryptedBytes.slice(0)
  );

  // 转换为字符串 (移除PKCS7 padding)
  const bytes = new Uint8Array(decrypted);
  const paddingLength = bytes[bytes.length - 1];
  
  // 验证并移除PKCS7 padding
  if (paddingLength > 0 && paddingLength <= 16) {
    let validPadding = true;
    for (let i = 1; i <= paddingLength; i++) {
      if (bytes[bytes.length - i] !== paddingLength) {
        validPadding = false;
        break;
      }
    }
    
    if (validPadding) {
      const textBytes = bytes.slice(0, bytes.length - paddingLength);
      return new TextDecoder().decode(textBytes);
    }
  }
  
  return new TextDecoder().decode(bytes);
}

/**
 * XXTEA解密算法
 * 用于吉林台等加密接口
 */
function int32(n: number): number {
  while (n >= 2147483648) n -= 4294967296;
  while (n <= -2147483649) n += 4294967296;
  return Math.floor(n);
}

function str2long(s: Uint8Array, w: boolean): number[] {
  const len = s.length;
  const v: number[] = [];
  
  for (let i = 0; i < len; i += 4) {
    v.push(
      s[i] | 
      (s[i + 1] << 8) | 
      (s[i + 2] << 16) | 
      (s[i + 3] << 24)
    );
  }
  
  if (w) {
    v.push(len);
  }
  
  return v;
}

function long2str(v: number[], w: boolean): Uint8Array {
  let n = (v.length - 1) << 2;
  
  if (w) {
    const m = v[v.length - 1];
    if (m < n - 3 || m > n) {
      throw new Error('Invalid XXTEA data');
    }
    n = m;
  }
  
  const s = new Uint8Array(n);
  let offset = 0;
  
  for (let i = 0; i < v.length; i++) {
    s[offset++] = v[i] & 0xff;
    if (offset >= n) break;
    s[offset++] = (v[i] >>> 8) & 0xff;
    if (offset >= n) break;
    s[offset++] = (v[i] >>> 16) & 0xff;
    if (offset >= n) break;
    s[offset++] = (v[i] >>> 24) & 0xff;
    if (offset >= n) break;
  }
  
  return s;
}

/**
 * XXTEA解密
 * @param data - base64编码的加密数据
 * @param key - 解密密钥
 * @returns 解密后的字符串
 */
export function xxteaDecrypt(data: string, key: string): string {
  // Base64解码
  const encryptedBytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  
  // 密钥处理
  const keyBytes = new TextEncoder().encode(key);
  const paddedKey = new Uint8Array(16);
  paddedKey.set(keyBytes.slice(0, 16));
  
  // 转换为32位整数数组
  let v = str2long(encryptedBytes, false);
  const k = str2long(paddedKey, false);
  
  // 补齐密钥为4个32位整数
  while (k.length < 4) {
    k.push(0);
  }
  
  const n = v.length - 1;
  if (n < 1) {
    return '';
  }
  
  let z = v[n];
  let y = v[0];
  const delta = 0x9E3779B9;
  const q = Math.floor(6 + 52 / (n + 1));
  let sum = int32(q * delta);
  
  while (sum !== 0) {
    const e = (sum >>> 2) & 3;
    
    for (let p = n; p > 0; p--) {
      z = v[p - 1];
      const mx = int32(
        (((z >>> 5) ^ (y << 2)) + ((y >>> 3) ^ (z << 4))) ^
        ((sum ^ y) + (k[(p & 3) ^ e] ^ z))
      );
      y = v[p] = int32(v[p] - mx);
    }
    
    z = v[n];
    const mx = int32(
      (((z >>> 5) ^ (y << 2)) + ((y >>> 3) ^ (z << 4))) ^
      ((sum ^ y) + (k[0 ^ e] ^ z))
    );
    y = v[0] = int32(v[0] - mx);
    sum = int32(sum - delta);
  }
  
  // 转换回字符串
  const decryptedBytes = long2str(v, true);
  return new TextDecoder().decode(decryptedBytes);
}

/**
 * AES-128-ECB解密 (用于广西TV TS流解密)
 * 使用aes-js实现，性能比crypto-js快7.5倍
 * ECB模式不需要IV，直接对每个16字节块进行解密
 * 
 * @param data - 要解密的数据 (Uint8Array, 必须是16字节)
 * @param key - 16字节密钥 (Uint8Array)
 * @returns 解密后的Uint8Array
 * 
 * @example
 * const key = hexToBytes('aa390855e94889d26ccf2c5a0c342e73');
 * const encrypted = new Uint8Array([...]); // 16字节块
 * const decrypted = aesEcbDecrypt(encrypted, key);
 */
export function aesEcbDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  // 使用aes-js（性能比crypto-js快7.5倍）
  const aesjs = require('aes-js');
  
  // 创建AES-ECB解密器（无padding）
  const aesEcb = new aesjs.ModeOfOperation.ecb(key);
  
  // 解密（aes-js直接返回Uint8Array）
  return aesEcb.decrypt(data);
}

/**
 * Hex字符串转字节数组
 * 
 * @param hex - 十六进制字符串
 * @returns Uint8Array
 * 
 * @example
 * hexToBytes('aa390855') // Uint8Array [170, 57, 8, 85]
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
