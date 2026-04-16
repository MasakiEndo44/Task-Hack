import { useState, useCallback } from 'react'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = { role: 'user', content }
    let currentHistory: ChatMessage[] = []
    
    setMessages(prev => {
      currentHistory = [...prev, userMessage]
      return currentHistory
    })
    
    setIsLoading(true)
    try {
      const settings = await window.api.loadSettings()
      if (!settings.openAiApiKey) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'エラー: OpenAI APIキーが設定されていません。' }])
        setIsLoading(false)
        return
      }
      
      const payload = currentHistory.map(m => ({ role: m.role, content: m.content }))
      const reply = await window.api.chatCompletion(payload, settings.openAiApiKey)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `通信エラー: ${e.message}` }])
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { messages, sendMessage, isLoading }
}
