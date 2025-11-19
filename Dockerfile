FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --progress=false

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# 复制 standalone 输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# 修改 CMD 添加安全参数
CMD ["node", "--security-revert=CVE-2023-46809", "server.js"]