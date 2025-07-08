import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PersonaAgents - AI ペルソナ対話システム',
  description: '日系調味料メーカーの北米進出を支援するAIペルソナ対話システム',
}

export default function Home() {
  return (
    <iframe 
      src="/index.html" 
      style={{ 
        width: '100%', 
        height: '100vh', 
        border: 'none' 
      }}
      title="PersonaAgents Application"
    />
  )
}