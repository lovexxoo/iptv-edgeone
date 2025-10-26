#!/usr/bin/env node
/**
 * 测试AES-256-ECB加密实现
 */
const crypto = require('crypto');

const AES_KEY = '01234567890123450123456789012345';
const API_URL1 = 'https://api.chinaaudiovisual.cn/web/user/getVisitor';

// Node.js标准加密（参考Perl实现）
function aesEncryptNode(plaintext, key) {
  const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(key), null);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

// Web Crypto API模拟（EdgeOne使用 - 真正的ECB实现）
async function aesEncryptWebCryptoECB(plaintext, key) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-CBC', length: 256 },
    false,
    ['encrypt']
  );

  // Prepare data with PKCS7 padding
  const data = encoder.encode(plaintext);
  const blockSize = 16;
  const paddingLength = blockSize - (data.length % blockSize);
  const paddedData = new Uint8Array(data.length + paddingLength);
  paddedData.set(data);
  for (let i = data.length; i < paddedData.length; i++) {
    paddedData[i] = paddingLength;
  }

  // Implement ECB by encrypting each block independently
  const numBlocks = paddedData.length / blockSize;
  const encryptedBlocks = [];

  for (let i = 0; i < numBlocks; i++) {
    const block = paddedData.slice(i * blockSize, (i + 1) * blockSize);
    
    // Use zero IV for each block
    const zeroIV = new Uint8Array(blockSize);
    
    const encryptedBlock = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv: zeroIV },
      cryptoKey,
      block
    );
    
    // Take only the first 16 bytes
    encryptedBlocks.push(new Uint8Array(encryptedBlock).slice(0, blockSize));
  }

  // Concatenate all encrypted blocks
  const totalLength = encryptedBlocks.reduce((sum, block) => sum + block.length, 0);
  const encrypted = new Uint8Array(totalLength);
  let offset = 0;
  for (const block of encryptedBlocks) {
    encrypted.set(block, offset);
    offset += block.length;
  }

  // Base64 encode
  let binary = '';
  for (let i = 0; i < encrypted.length; i++) {
    binary += String.fromCharCode(encrypted[i]);
  }
  const base64 = Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/[\r\n]/g, '');
}

async function test() {
  const timeMillis = Date.now();
  const payload = {
    url: API_URL1,
    params: '',
    time: timeMillis,
  };
  const json = JSON.stringify(payload);

  console.log('Plaintext:', json);
  console.log('');

  const encryptedNode = aesEncryptNode(json, AES_KEY);
  console.log('Node.js crypto (ECB):');
  console.log(encryptedNode);
  console.log('Length:', encryptedNode.length);
  console.log('');

  const encryptedWeb = await aesEncryptWebCryptoECB(json, AES_KEY);
  console.log('Web Crypto API (TRUE ECB via independent blocks):');
  console.log(encryptedWeb);
  console.log('Length:', encryptedWeb.length);
  console.log('');

  if (encryptedNode === encryptedWeb) {
    console.log('✅ Encryption methods match!');
  } else {
    console.log('❌ Encryption methods DO NOT match!');
    console.log('This explains why getToken fails in Edge Runtime.');
  }

  // Test with API using Node.js encryption
  console.log('\n--- Testing with API (Node.js ECB) ---');
  try {
    const response = await fetch(API_URL1, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'headers': '1.1.3',
        'sign': encryptedNode,
      },
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data).substring(0, 200));

    if (data.success) {
      console.log('✅ Node.js encryption works with API');
    } else {
      console.log('❌ Node.js encryption failed with API');
    }
  } catch (error) {
    console.error('API request error:', error.message);
  }

  // Test with API using Web Crypto encryption
  console.log('\n--- Testing with API (Web Crypto ECB) ---');
  try {
    const response2 = await fetch(API_URL1, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'headers': '1.1.3',
        'sign': encryptedWeb,
      },
    });

    console.log('Response status:', response2.status);
    const data2 = await response2.json();
    console.log('Response:', JSON.stringify(data2).substring(0, 200));

    if (data2.success) {
      console.log('✅ Web Crypto ECB encryption works with API');
    } else {
      console.log('❌ Web Crypto ECB encryption failed with API');
    }
  } catch (error) {
    console.error('API request error:', error.message);
  }
}

test().catch(console.error);
