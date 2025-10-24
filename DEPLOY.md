# 部署指南

## 本地测试部署

### 方式一: Docker环境部署(推荐)

#### 1. 检查Docker环境

```bash
# 检查Docker是否安装
docker --version

# 检查Docker服务状态
sudo systemctl status docker
```

#### 2. 拉取Node.js镜像

```bash
# 拉取Node.js 18镜像(推荐)
docker pull node:18-alpine

# 或者拉取Node.js 20镜像
docker pull node:20-alpine
```

#### 3. 创建Dockerfile

在项目根目录创建`Dockerfile`:

```bash
cat > Dockerfile << 'EOF'
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制项目文件
COPY . .

# 构建Next.js应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
EOF
```

#### 4. 创建.dockerignore

```bash
cat > .dockerignore << 'EOF'
node_modules
.next
.git
.gitignore
README.md
Dockerfile
.dockerignore
*.log
EOF
```

#### 5. 构建Docker镜像

```bash
# 构建镜像
docker build -t iptv-edgeone:latest .

# 查看构建的镜像
docker images | grep iptv-edgeone
```

#### 6. 运行容器

```bash
# 运行容器
docker run -d \
  --name iptv-edgeone \
  -p 3000:3000 \
  --restart unless-stopped \
  iptv-edgeone:latest

# 查看容器状态
docker ps | grep iptv-edgeone

# 查看容器日志
docker logs -f iptv-edgeone
```

#### 7. 测试API

```bash
# 测试首页
curl http://localhost:3000

# 测试4K频道API
curl "http://localhost:3000/api/4k?id=btv4k"

# 测试北京卫视
curl "http://localhost:3000/api/beijing?id=bjws"

# 测试云南卫视
curl "http://localhost:3000/api/yunnan?id=ynws"
```

#### 8. Docker常用命令

```bash
# 停止容器
docker stop iptv-edgeone

# 启动容器
docker start iptv-edgeone

# 重启容器
docker restart iptv-edgeone

# 删除容器
docker rm -f iptv-edgeone

# 删除镜像
docker rmi iptv-edgeone:latest

# 查看容器日志
docker logs -f iptv-edgeone

# 进入容器
docker exec -it iptv-edgeone sh
```

#### 9. Docker Compose部署(可选)

创建`docker-compose.yml`:

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  iptv-edgeone:
    build: .
    container_name: iptv-edgeone
    ports:
      - "3000:3000"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
EOF
```

使用Docker Compose:

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

### 方式二: 直接安装Node.js

#### 1. 安装依赖

```bash
cd /home/vitter/github/iptv-edgeone
npm install
```

#### 2. 本地测试

```bash
npm run dev
```

访问 http://localhost:3000 查看首页
访问 http://localhost:3000/api/yunnan?id=ynws 测试API

#### 支持的所有地区API测试

```bash
# 云南台
curl http://localhost:3000/api/yunnan?id=ynws

# 4K频道
curl http://localhost:3000/api/4k?id=欢笑剧场4K

# 北京台
curl http://localhost:3000/api/beijing?id=btv1

# 河南台
curl http://localhost:3000/api/henan?id=HNTV

# 河北台
curl http://localhost:3000/api/hebei?id=hebeiws

# 江苏台  
curl http://localhost:3000/api/jiangsu?id=jsws

# 山东台
curl http://localhost:3000/api/shandong?id=SDTV

# 陕西台
curl http://localhost:3000/api/shaanxi?id=shanxi1

# 深圳台
curl http://localhost:3000/api/shenzhen?id=sztv1

# 石家庄台
curl http://localhost:3000/api/sjz?id=sjztv1
```

#### 3. 构建

```bash
npm run build
```

## EdgeOne Pages部署步骤

### 前置要求

1. 腾讯云账号
2. 已开通EdgeOne服务
3. 代码已推送到GitHub仓库

### 方式一: GitHub自动部署(推荐)

#### 1. 推送代码到GitHub

```bash
git add .
git commit -m "update: add new tv regions"
git push origin main
```

#### 2. EdgeOne控制台配置

1. 登录 [腾讯云EdgeOne控制台](https://console.cloud.tencent.com/edgeone)
2. 点击"Pages" → "新建站点"
3. 选择"从Git导入"
4. 授权GitHub账号
5. 选择仓库: `iptv-edgeone`
6. 选择分支: `main`
7. 配置构建设置:
   - **框架预设**: Next.js
   - **构建命令**: `npm run build`
   - **输出目录**: `.next`
   - **安装命令**: `npm install`
   - **Node.js版本**: `18.x` 或 `20.x`
8. 点击"部署"按钮

#### 3. 等待构建完成

- 构建时间: 约2-5分钟
- 查看构建日志确认无错误
- 获取EdgeOne分配的域名: `https://your-project.edgeone-pages.com`

#### 4. 自动部署

每次推送到main分支,EdgeOne会自动触发重新构建和部署:

```bash
git add .
git commit -m "fix: update api logic"
git push origin main
```

### 方式二: CLI部署

```bash
# 安装EdgeOne CLI
npm install -g @edgeone/cli

# 登录
edgeone login

# 部署
edgeone deploy
```

## 环境变量配置(可选)

EdgeOne支持通过环境变量配置API参数。在EdgeOne控制台"Pages" → 项目设置 → "环境变量"中添加:

| 变量名 | 说明 | 默认值 | 用途 |
|--------|------|--------|------|
| `NODE_ENV` | 运行环境 | production | 生产环境标识 |
| `API_TIMEOUT` | API超时时间(ms) | 10000 | 请求超时控制 |

*注意: 当前版本的API调用大多直接使用fetch,未使用环境变量。如需配置可在代码中添加对应逻辑。*

## 自定义域名

### 1. 在EdgeOne控制台绑定域名

1. 进入EdgeOne控制台 → Pages → 你的项目
2. 点击"设置" → "自定义域名"
3. 点击"添加域名"
4. 输入域名: `tv.yourdomain.com`
5. 选择SSL证书(自动或上传)

### 2. 配置DNS记录

在你的域名DNS管理后台添加CNAME记录:

```
类型: CNAME
主机记录: tv (或 @)
记录值: your-project.edgeone-pages.com
TTL: 600
```

### 3. 验证生效

```bash
# 检查DNS解析
nslookup tv.yourdomain.com

# 测试访问
curl https://tv.yourdomain.com/api/yunnan?id=ynws
```

## 监控和日志

### EdgeOne控制台查看

1. **实时日志**
   - EdgeOne控制台 → Pages → 你的项目
   - 点击"日志" → "实时日志"
   - 可查看API请求、响应、错误等

2. **构建日志**
   - "部署" → 选择某次部署
   - 查看构建过程输出
   - 检查TypeScript编译错误

3. **访问统计**
   - "数据分析" → "流量统计"
   - 查看请求量、带宽、状态码分布
   - 分析热门API地区

### 命令行查看日志

```bash
# 安装EdgeOne CLI
npm install -g @edgeone/cli

# 登录
edgeone login

# 查看实时日志
edgeone logs --tail

# 查看最近错误
edgeone logs --level error
```

## 故障排查

### 1. 部署失败 - TypeScript编译错误

**症状**: EdgeOne构建失败,提示TypeScript编译错误

**常见错误**:
```
Error: Type 'Uint8Array<ArrayBuffer>' can only be iterated through when using the '--downlevelIteration' flag
```

**解决方案**:
1. 检查 `tsconfig.json` 配置:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "downlevelIteration": true
     }
   }
   ```

2. 避免使用spread操作符在Uint8Array上:
   ```typescript
   // ❌ 错误
   const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
   
   // ✅ 正确
   const bytes = new Uint8Array(data);
   let binary = '';
   for (let i = 0; i < bytes.length; i++) {
     binary += String.fromCharCode(bytes[i]);
   }
   const base64 = btoa(binary);
   ```

3. BigInt字面量使用:
   ```typescript
   // ❌ ES2020之前不支持
   const value = 86400000n;
   
   // ✅ 使用BigInt()构造函数
   const value = BigInt(86400000);
   ```

### 2. API返回502/504错误

**症状**: 访问API时返回502 Bad Gateway或504 Gateway Timeout

**可能原因**:
- 上游TV API服务不可用
- EdgeOne网络超时(默认30秒)
- 请求头缺失或不正确

**解决方案**:
```bash
# 1. 测试上游API是否正常
curl -I https://yntv-api.yntv.cn

# 2. 检查请求头
curl -H "User-Agent: Mozilla/5.0" https://your-domain.com/api/yunnan?id=ynws

# 3. 查看EdgeOne日志
edgeone logs --tail --filter "502"
```

### 3. CORS跨域问题

**症状**: 浏览器控制台提示CORS错误

**解决方案**:
在 `app/api/*/route.ts` 中添加CORS头:
```typescript
export async function GET(request: Request) {
  const response = NextResponse.json(data);
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  return response;
}
```

### 4. M3U8播放失败

**症状**: VLC或其他播放器无法播放返回的m3u8链接

**排查步骤**:
```bash
# 1. 测试API是否返回正确格式
curl https://your-domain.com/api/yunnan?id=ynws

# 2. 检查返回的m3u8链接
curl -I "返回的m3u8 URL"

# 3. 使用VLC测试
vlc "返回的m3u8 URL"

# 4. 检查防盗链/鉴权
# 部分TV台需要特定Referer或签名
```

### 5. Docker容器启动失败

**症状**: `docker run` 后容器立即退出

**解决方案**:
```bash
# 查看容器日志
docker logs iptv-edgeone

# 常见问题:
# - 端口占用: 修改 -p 3000:3000 为其他端口
# - 权限问题: 添加 --user node
# - 内存不足: 添加 --memory 512m

# 重新运行
docker run -d \
  --name iptv-edgeone \
  -p 3001:3000 \
  --user node \
  --restart unless-stopped \
  iptv-edgeone:latest
```

### 6. 特定地区API不工作

**症状**: 某个地区的API返回错误,其他地区正常

**排查方法**:
```bash
# 1. 查看具体错误信息
curl -v https://your-domain.com/api/4k?id=欢笑剧场4K

# 2. 检查该地区的route.ts逻辑
# 例如 4K频道需要AES解密
cat app/api/4k/route.ts

# 3. 测试上游API
curl "上游API地址"

# 4. 检查是否需要特殊参数
# - 时间戳
# - 签名
# - Token
```

### 3. 无法播放

```bash
# 检查:
- M3U8 URL是否正确
- TS代理是否工作
- 播放器是否支持HLS
```

## 性能优化建议

### 1. CDN缓存策略

EdgeOne会自动缓存静态资源(JS/CSS/图片),API响应可通过Cache-Control控制:

```typescript
// 在route.ts中设置缓存
export async function GET(request: Request) {
  const response = NextResponse.json(data);
  
  // M3U8链接缓存1分钟
  response.headers.set('Cache-Control', 'public, max-age=60');
  
  return response;
}
```

### 2. 监控用量

- **EdgeOne免费额度**: 100万请求/月
- **超出计费**: ¥0.02/万请求
- **带宽**: 按实际使用计费

在EdgeOne控制台查看实时用量:
```
Pages → 你的项目 → 数据分析 → 用量统计
```

### 3. 优化请求性能

**减少API调用**:
```bash
# ❌ 避免频繁请求
while true; do curl https://your-domain.com/api/yunnan?id=ynws; sleep 1; done

# ✅ 客户端缓存m3u8链接
# M3U8链接有效期通常为几分钟,无需每秒请求
```

**启用gzip压缩**:
EdgeOne自动启用,无需配置。

**使用HTTP/2**:
EdgeOne默认支持HTTP/2和HTTP/3(QUIC)。

### 4. 区域访问优化

EdgeOne支持多地域边缘节点,自动选择最近节点:
- 中国大陆: 20+节点
- 海外: 100+节点

可在控制台查看访问分布:
```
数据分析 → 访问分析 → 地域分布
```

## 更新部署

### 自动部署(推荐)

```bash
# 1. 修改代码
vim app/api/yunnan/route.ts

# 2. 提交到Git
git add .
git commit -m "fix: update yunnan api logic"

# 3. 推送到GitHub
git push origin main

# 4. EdgeOne自动检测并部署
# 无需手动操作,约2-5分钟后生效
```

### 手动触发部署

在EdgeOne控制台:
```
Pages → 你的项目 → 部署 → 重新部署
```

### 回滚到历史版本

```
Pages → 你的项目 → 部署 → 选择历史部署 → 回滚
```

## API测试示例

### 1. 使用curl测试

```bash
# 云南卫视
curl "https://your-domain.com/api/yunnan?id=ynws"

# 4K频道(欢笑剧场4K)
curl "https://your-domain.com/api/4k?id=欢笑剧场4K"

# 北京卫视
curl "https://your-domain.com/api/beijing?id=btv1"

# 河南卫视
curl "https://your-domain.com/api/henan?id=HNTV"

# 深圳卫视
curl "https://your-domain.com/api/shenzhen?id=sztv1"
```

### 2. 播放器测试

**VLC播放器**:
```bash
vlc "https://your-domain.com/api/yunnan?id=ynws"
```

**ffplay**:
```bash
ffplay "https://your-domain.com/api/4k?id=欢笑剧场4K"
```

**mpv**:
```bash
mpv "https://your-domain.com/api/beijing?id=btv1"
```

### 3. 生成M3U播放列表

```bash
# 创建playlist.m3u
cat > playlist.m3u << 'EOF'
#EXTM3U
#EXTINF:-1,云南卫视
https://your-domain.com/api/yunnan?id=ynws
#EXTINF:-1,欢笑剧场4K
https://your-domain.com/api/4k?id=欢笑剧场4K
#EXTINF:-1,北京卫视
https://your-domain.com/api/beijing?id=btv1
EOF

# 使用VLC打开
vlc playlist.m3u
```

### 4. 浏览器测试

支持的浏览器插件:
- **Native HLS Playback** (Chrome)
- **Play HLS M3u8** (Firefox)

直接在浏览器打开:
```
https://your-domain.com/api/yunnan?id=ynws
```

## 技术支持

### 官方文档

- **EdgeOne文档**: https://cloud.tencent.com/document/product/1552
- **Next.js文档**: https://nextjs.org/docs
- **Edge Runtime**: https://nextjs.org/docs/app/api-reference/edge

### 问题反馈

- **项目Issues**: https://github.com/vitter/iptv-edgeone/issues
- **EdgeOne工单**: 腾讯云控制台 → 工单系统

### 社区支持

- Next.js Discord: https://nextjs.org/discord
- EdgeOne技术论坛: https://cloud.tencent.com/developer/ask
