import { useState, useCallback } from 'react'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  imageBase64?: string
}

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

function buildApiPayload(messages: ChatMessage[]) {
  return messages.map(m => {
    if (m.imageBase64) {
      const parts: OpenAIContentPart[] = [
        { type: 'text', text: m.content },
        { type: 'image_url', image_url: { url: m.imageBase64 } }
      ]
      return { role: m.role, content: parts }
    }
    return { role: m.role, content: m.content }
  })
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (content: string, imageBase64?: string) => {
    const userMessage: ChatMessage = { role: 'user', content, imageBase64 }
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

      const payload = buildApiPayload(currentHistory)
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
