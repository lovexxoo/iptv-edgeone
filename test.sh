#!/bin/bash

echo "========================================="
echo "云南TV EdgeOne Pages 项目测试"
echo "========================================="
echo ""

# 检查Node版本
echo "1. 检查Node.js版本..."
node --version
if [ $? -ne 0 ]; then
    echo "❌ 未安装Node.js"
    exit 1
fi
echo "✅ Node.js已安装"
echo ""

# 安装依赖
echo "2. 安装依赖..."
npm install --silent
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi
echo "✅ 依赖安装成功"
echo ""

# 构建项目
echo "3. 构建项目..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi
echo "✅ 构建成功"
echo ""

echo "========================================="
echo "✅ 所有测试通过!"
echo "========================================="
echo ""
echo "下一步:"
echo "1. npm run dev - 启动开发服务器"
echo "2. npm run build - 生产构建"
echo "3. 部署到EdgeOne Pages"
echo ""
