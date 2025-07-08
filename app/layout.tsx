import './globals.css'

export const metadata = {
  title: 'PersonaAgents',
  description: 'AI ペルソナ対話システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}