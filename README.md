# 全国IPTV直播流代理 - EdgeOne Pages部署项目

基于Next.js的全国各地电视台直播代理服务,可部署到腾讯云EdgeOne Pages。

## 支持的电视台

### 📺 4K频道 (9个)
- btv4k, sh4k, js4k, zj4k, sd4k, hn4k, gd4k, sc4k, sz4k

### 📺 北京TV (10个)
- bjws, bjwy, bjjskj, bjys, bjcj, bjsh, bjxw, bjkk, bjws4k, bjty

### 📺 河南TV (17个)
- hnws, hnds, hnms, hmfz, hndsj, hnxw, htgw, hngg, hnxc, hngj, hnly, wwbk, wspd, jczy, ydxj, xsj, gxpd

### 📺 河北TV (8个)
- hbws, hbjj, nmpd, hbds, hbys, hbse, hbgg, hbsj

### 📺 江苏TV (10个)
- jsws, jsws4k, jscs, jszy, jsys, jsxw, jsjy, jsxx, ymkt, jsgj

### 📺 山东TV (26个)
- sdws, xwpd, qlpd, txyx, shpd, zypd, wlpd, nkpd, sepd + 各地市电视台

### 📺 陕西TV
- 电视频道 + 广播频道

### 📺 深圳TV (11个)
- szws4k, szws, szds, szdsj, szgg, szcj, szyl, szse, szyd, szyh, szgj

### 📺 石家庄TV
- 石家庄电视台频道

### 📺 云南TV (6个)
- ynws, ynds, ynyl, yngg, yngj, ynse

## 功能特性

- ✅ 支持全国多地电视台频道
- ✅ M3U8播放列表代理
- ✅ TS文件自动代理
- ✅ Edge Runtime运行
- ✅ 无需服务器,直接部署到EdgeOne
- ✅ 统一API接口设计
- ✅ TypeScript类型安全

## API使用

### 通用格式

```bash
# 获取M3U8播放列表
https://your-domain.com/api/{region}?id={channel_id}

# 示例
https://your-domain.com/api/yunnan?id=ynws  # 云南卫视
https://your-domain.com/api/beijing?id=bjws # 北京卫视
https://your-domain.com/api/4k?id=btv4k    # 北京卫视4K
```

## 支持频道（详细）

| ID | 频道名 |
|----|--------|
| ynws | 云南卫视 |
| ynds | 云南都市 |
| ynyl | 云南娱乐 |
| yngg | 云南公共 |
| yngj | 云南国际 |
| ynse | 云南少儿 |

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问
http://localhost:3000
```

## API使用

### 获取M3U8播放列表

```
GET /api/yunnan?id={channel_id}
```

示例:
```
# 云南卫视
http://your-domain.com/api/yunnan?id=ynws

# 云南都市
http://your-domain.com/api/yunnan?id=ynds
```

### 播放器使用

```m3u
#EXTM3U
#EXTINF:-1,云南卫视
http://your-domain.com/api/yunnan?id=ynws
#EXTINF:-1,云南都市
http://your-domain.com/api/yunnan?id=ynds
```

## 部署到EdgeOne Pages

1. **准备仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **EdgeOne Pages配置**
   - 登录腾讯云EdgeOne控制台
   - 创建新站点 → 选择Pages服务
   - 连接GitHub/GitLab仓库
   - 构建配置:
     - 构建命令: `npm run build`
     - 输出目录: `.next`
     - Node版本: 18+

3. **环境变量**
   无需额外配置

4. **部署**
   - 推送代码到仓库自动触发部署
   - 或在控制台手动触发部署

## 项目结构

```
yunnan-tv-edgeone/
├── app/
│   ├── api/
│   │   ├── config.ts          # 配置文件
│   │   └── yunnan/
│   │       └── route.ts        # API路由(Edge Runtime)
│   ├── layout.tsx              # 布局组件
│   └── page.tsx                # 首页
├── package.json
├── next.config.js
├── tsconfig.json
└── README.md
```

## 技术栈

- **Next.js 14** - React框架
- **Edge Runtime** - 边缘计算运行时
- **TypeScript** - 类型安全
- **腾讯云EdgeOne Pages** - 部署平台

## 原理说明

1. **获取流信息**: 调用云南TV API获取认证参数
2. **M3U8代理**: 获取原始M3U8并替换TS路径
3. **TS代理**: 通过Edge Function代理TS文件请求
4. **防盗链绕过**: 添加正确的Referer和User-Agent

## 性能优化

- Edge Runtime在边缘节点运行,低延迟
- TS文件缓存300秒
- M3U8实时获取,无缓存

## 注意事项

- 仅供学习和个人使用
- 请遵守相关法律法规和版权
- EdgeOne Pages免费额度有限,注意用量

## License

MIT
