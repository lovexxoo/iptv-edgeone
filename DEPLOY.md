# 部署指南

## 快速开始

### 1. 安装依赖

```bash
cd yunnan-tv-edgeone
npm install
```

### 2. 本地测试

```bash
npm run dev
```

访问 http://localhost:3000 查看首页
访问 http://localhost:3000/api/yunnan?id=ynws 测试API

### 3. 构建

```bash
npm run build
```

## EdgeOne Pages部署步骤

### 方式一: 通过Git仓库部署(推荐)

1. **初始化Git仓库**
   ```bash
   git init
   git add .
   git commit -m "feat: yunnan tv proxy"
   ```

2. **推送到GitHub/GitLab**
   ```bash
   git remote add origin https://github.com/your-username/yunnan-tv.git
   git push -u origin main
   ```

3. **EdgeOne控制台配置**
   - 登录 [腾讯云EdgeOne控制台](https://console.cloud.tencent.com/edgeone)
   - 点击"Pages" → "新建站点"
   - 选择"从Git导入"
   - 授权GitHub/GitLab
   - 选择仓库: `yunnan-tv-edgeone`
   - 配置构建:
     * 框架预设: `Next.js`
     * 构建命令: `npm run build`
     * 输出目录: `.next`
     * 安装命令: `npm install`
     * Node.js版本: `18.x` 或 `20.x`

4. **部署**
   - 点击"部署"按钮
   - 等待构建完成(通常2-3分钟)
   - 获取域名: `https://your-project.edgeone-pages.com`

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

如果需要自定义配置,在EdgeOne控制台添加环境变量:

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `API_BASE` | 云南TV API地址 | https://yntv-api.yntv.cn |
| `STREAM_BASE` | 流媒体服务器地址 | https://tvlive.yntv.cn |

## 自定义域名

1. EdgeOne控制台 → Pages → 你的项目
2. "设置" → "域名"
3. 添加自定义域名
4. 配置DNS CNAME记录

## 监控和日志

- **访问日志**: EdgeOne控制台 → Pages → 日志
- **错误监控**: 查看Edge Function执行日志
- **流量监控**: 查看请求统计

## 故障排查

### 1. 部署失败

```bash
# 检查构建日志
# 常见问题:
- Node版本不兼容 → 使用18.x或20.x
- 依赖安装失败 → 检查package.json
```

### 2. API返回502

```bash
# 可能原因:
- 云南TV API不可用
- 网络超时
- 请求头不正确
```

### 3. 无法播放

```bash
# 检查:
- M3U8 URL是否正确
- TS代理是否工作
- 播放器是否支持HLS
```

## 性能优化建议

1. **启用CDN缓存**
   - EdgeOne会自动缓存静态资源
   - API响应根据Cache-Control缓存

2. **监控用量**
   - EdgeOne免费额度: 100万请求/月
   - 超出部分按量计费

3. **优化请求**
   - TS文件已设置5分钟缓存
   - 减少不必要的API调用

## 更新部署

```bash
# 修改代码后
git add .
git commit -m "update: xxx"
git push

# EdgeOne会自动触发重新部署
```

## 测试API

```bash
# 获取M3U8
curl "https://your-domain.com/api/yunnan?id=ynws"

# 使用VLC播放
vlc "https://your-domain.com/api/yunnan?id=ynws"

# 使用ffplay播放
ffplay "https://your-domain.com/api/yunnan?id=ynws"
```

## 技术支持

- EdgeOne文档: https://cloud.tencent.com/document/product/1552
- Next.js文档: https://nextjs.org/docs
- Issue: 项目仓库Issues页面
