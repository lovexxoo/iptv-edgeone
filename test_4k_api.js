#!/usr/bin/env node
/**
 * 测试4K频道API - 本地调试版本
 */

const AES_KEY = '01234567890123450123456789012345';
const API_URL1 = 'https://api.chinaaudiovisual.cn/web/user/getVisitor';
const API_URL2 = 'https://api.chinaaudiovisual.cn/column/getColumnList';

const CHANNEL_MAP = {
  'btv4k': 91417,
  'sh4k': 96050,
  'js4k': 95925,
  'zj4k': 96039,
  'sd4k': 95975,
  'hn4k': 96038,
  'gd4k': 93733,
  'sc4k': 95965,
  'sz4k': 93735,
};

// 简单的AES-256-ECB加密（使用Node.js crypto）
function aesEncrypt(plaintext, key) {
  const crypto = require('crypto');
  const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(key), null);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

async function makeSign(url, params, timeMillis, key) {
  const payload = {
    url: url,
    params: params,
    time: timeMillis,
  };
  const json = JSON.stringify(payload);
  return aesEncrypt(json, key);
}

async function getToken() {
  const timeMillis = Date.now();
  const sign = await makeSign(API_URL1, '', timeMillis, AES_KEY);

  try {
    const response = await fetch(API_URL1, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'headers': '1.1.3',
        'sign': sign,
      },
    });

    if (!response.ok) {
      console.error('Token request failed:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data?.success || !data?.data?.token) {
      console.error('Invalid token response:', data);
      return null;
    }

    console.log('✓ Got token:', data.data.token.substring(0, 20) + '...');
    return data.data.token;
  } catch (error) {
    console.error('Get token error:', error);
    return null;
  }
}

async function getColumnData(token) {
  const columnId = 350;
  const params = new URLSearchParams({
    columnId: columnId.toString(),
    token: token,
  });

  const timeMillis = Date.now();
  const sign = await makeSign(API_URL2, params.toString(), timeMillis, AES_KEY);

  try {
    const response = await fetch(API_URL2, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'okhttp/3.11.0',
        'sign': sign,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error('Column data request failed:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data?.success) {
      console.error('Invalid column data response');
      return null;
    }

    console.log('✓ Got column data, items:', data.data?.length || 0);
    
    // 打印数据结构样本
    if (data.data && data.data.length > 0) {
      console.log('\n📊 Sample data structure:');
      console.log(JSON.stringify(data.data[0], null, 2));
    }

    return data;
  } catch (error) {
    console.error('Get column data error:', error);
    return null;
  }
}

function findPlayUrl(dataArr, targetId) {
  if (!dataArr?.data || !Array.isArray(dataArr.data)) {
    console.error('❌ Invalid data structure');
    return null;
  }

  console.log(`\n🔍 Searching for channel ID: ${targetId}`);

  for (let i = 0; i < dataArr.data.length; i++) {
    const item = dataArr.data[i];
    
    // 检查多种可能的数据结构
    if (item?.mediaAsset?.id === targetId && item?.mediaAsset?.url) {
      console.log(`✓ Found in mediaAsset`);
      return item.mediaAsset.url;
    }
    
    if (item?.id === targetId && item?.url) {
      console.log(`✓ Found in item directly`);
      return item.url;
    }
    
    if (item?.data?.mediaAsset?.id === targetId && item?.data?.mediaAsset?.url) {
      console.log(`✓ Found in nested data.mediaAsset`);
      return item.data.mediaAsset.url;
    }
  }

  console.error(`❌ Channel ID ${targetId} not found`);
  return null;
}

async function testChannel(id) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing channel: ${id}`);
  console.log('='.repeat(60));

  if (!CHANNEL_MAP[id]) {
    console.error('❌ Channel not in map');
    return;
  }

  const token = await getToken();
  if (!token) {
    console.error('❌ Failed to get token');
    return;
  }

  const dataArr = await getColumnData(token);
  if (!dataArr) {
    console.error('❌ Failed to get column data');
    return;
  }

  const targetId = CHANNEL_MAP[id];
  const playUrl = findPlayUrl(dataArr, targetId);

  if (playUrl) {
    console.log(`\n✅ SUCCESS!`);
    console.log(`Play URL: ${playUrl}`);
  } else {
    console.log(`\n❌ FAILED - No play URL found`);
  }
}

// 测试浙江卫视4K
testChannel('zj4k').catch(console.error);
