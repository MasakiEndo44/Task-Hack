import { useState, useCallback, useEffect } from 'react'
import type { Task } from '../types/task'

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

function buildSystemPrompt(tasks: Task[]): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
  const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

  const activeTask = tasks.find(t => t.zone === 'ACTIVE')
  const nextTasks = tasks.filter(t => t.zone === 'NEXT_ACTION')
  const holdingTasks = tasks.filter(t => t.zone === 'HOLDING')

  const boardLines = [
    activeTask
      ? `- ACTIVE（進行中）: ${activeTask.title}${activeTask.priority === 'URG' ? '【緊急】' : ''}`
      : '- ACTIVE（進行中）: なし',
    nextTasks.length > 0
      ? `- NEXT（次のアクション）: ${nextTasks.length}件 — ${nextTasks.map(t => t.title).join('、')}`
      : '- NEXT（次のアクション）: なし',
    `- HOLDING（待機中）: ${holdingTasks.length}件`
  ].join('\n')

  return `あなたはTask-Hack AIです。ADHDを持つユーザーの仕事上のタスク管理を支援するAI秘書です。

【口調・スタイル】
- 丁寧語だが、親しみやすく簡潔に話す
- 返答は短く、添える質問・確認は一つだけにする
- ユーザーが愚痴や相談を投げてきたら、まず受け止めてから内容を整理する

【タスク提案の判断基準】
- ユーザーのメッセージに期限・作業内容が明示されている → 即座に全タスクを提案する（質問不要）
- 期限や内容が不明な場合 → 一つだけ確認してから提案する

【MECE分解ルール（最重要）】
- ユーザーのメッセージに複数の作業が含まれる場合、必ずすべてを個別タスクとして列挙する
- 一部だけ提案して残りを省略することは禁止。漏れなく網羅すること
- 例：「抽出して、まとめて、資料化する」→ 3つのタスクとして提案する

【タスク生成のルール】
- 1タスクの工数は最大120分（2時間）。超える場合は複数タスクに分解する
- タスクを提案するときは、必ず以下のJSON形式を \`\`\`json ブロックで出力する
- priority は "URG"（緊急）または "NRM"（通常）のみ
- estimatedMinutes は 15〜120 の整数
- scheduledStart は着手推奨日時（ISO 8601形式）。期限から逆算して今日〜明日を目安に設定
- subtasks は着手の足がかりになる手順を最大3件。省略可
- notes は補足情報や注意点を一言で。省略可

\`\`\`json
{
  "tasks": [
    {
      "title": "タスク名（簡潔に）",
      "estimatedMinutes": 60,
      "priority": "NRM",
      "scheduledStart": "2026-04-18T10:00:00",
      "subtasks": [
        {"title": "最初にやること"},
        {"title": "次にやること"}
      ],
      "notes": "補足メモ（任意）"
    }
  ]
}
\`\`\`

## 現在の状況
- 日時: ${dateStr} ${timeStr}
${boardLines}`
}

export function useChat(tasks: Task[]) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // clean up listeners when unmounting
  useEffect(() => {
    return () => {
      window.api.offChatListeners()
    }
  }, [])

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
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'エラー: OpenAI APIキーが設定されていません。' }
        ])
        setIsLoading(false)
        return
      }

      const systemPrompt = buildSystemPrompt(tasks)
      const payload = buildApiPayload(currentHistory)

      // add empty assistant message to update progressively
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      window.api.offChatListeners()

      window.api.onChatChunk((text) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          updated[updated.length - 1] = { ...last, content: last.content + text }
          return updated
        })
      })

      window.api.onChatDone(() => {
        setIsLoading(false)
        window.api.offChatListeners()
      })

      window.api.onChatError((msg) => {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `通信エラー: ${msg}`
          }
          return updated
        })
        setIsLoading(false)
        window.api.offChatListeners()
      })

      await window.api.startChatStream(payload, systemPrompt, settings.openAiApiKey)
    } catch (e: any) {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && last.content === '') {
          updated[updated.length - 1] = { ...last, content: `通信エラー: ${e.message}` }
        } else {
          updated.push({ role: 'assistant', content: `通信エラー: ${e.message}` })
        }
        return updated
      })
      setIsLoading(false)
      window.api.offChatListeners()
    }
  }, [tasks])

  const injectMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content: text }])
  }, [])

  return { messages, sendMessage, isLoading, injectMessage }
}
