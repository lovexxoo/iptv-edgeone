import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '云南TV直播代理',
  description: 'Yunnan TV streaming proxy for EdgeOne Pages',
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
