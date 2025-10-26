#!/bin/bash
# 测试AES-256-ECB加密和API调用

KEY="01234567890123450123456789012345"
TIME=$(node -e "console.log(Date.now())")
URL="https://api.chinaaudiovisual.cn/web/user/getVisitor"

PAYLOAD="{\"url\":\"$URL\",\"params\":\"\",\"time\":$TIME}"

echo "Time: $TIME"
echo "Payload: $PAYLOAD"

# 使用openssl加密
HEXKEY=$(echo -n "$KEY" | xxd -p -c 256)
SIGN=$(echo -n "$PAYLOAD" | openssl enc -aes-256-ecb -K $HEXKEY -base64 -A)

echo "Sign: $SIGN"
echo "Sign length: ${#SIGN}"

# 发送请求
echo ""
echo "--- API Response ---"
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "headers: 1.1.3" \
  -H "sign: $SIGN"

echo ""
