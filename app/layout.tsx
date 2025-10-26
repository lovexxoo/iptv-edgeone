import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '全国IPTV直播流代理',
  description: 'National IPTV streaming proxy for EdgeOne Pages',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
