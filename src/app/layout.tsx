import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NextEngine価格更新システム',
  description: '田中貴金属価格に基づくNextEngine商品価格自動更新システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}