import { useState, useCallback, useEffect, useRef } from 'react'
import type { Task } from '../types/task'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  imageBase64?: string
  isSystemTrigger?: boolean
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

const QR_RE = /<!--QR:(\[[\s\S]*?\])-->/
const TU_RE = /<!--TU:(\{[\s\S]*?\})-->/
const DONE_RE = /<!--DONE:(true|false)-->/

export function parseAssistantMarkers(content: string) {
  const qrMatch = content.match(QR_RE)
  const tuMatch = content.match(TU_RE)
  const doneMatch = content.match(DONE_RE)
  const quickReplies: string[] | null = qrMatch ? (() => { try { return JSON.parse(qrMatch[1]) } catch { return null } })() : null
  const taskUpdates: Record<string, unknown> | null = tuMatch ? (() => { try { return JSON.parse(tuMatch[1]) } catch { return null } })() : null
  const done: boolean | null = doneMatch ? doneMatch[1] === 'true' : null
  const displayText = content.replace(QR_RE, '').replace(TU_RE, '').replace(DONE_RE, '').trim()
  return { displayText, quickReplies, taskUpdates, done }
}

function buildSystemPrompt(tasks: Task[], clarificationTask?: Task | null, profileSummary?: string, userContext?: string): string {
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

  const dependencyLines = tasks
    .filter(t => t.dependsOn)
    .map(t => {
      const dep = tasks.find(d => d.id === t.dependsOn)
      return dep ? `- 「${t.title}」→ 先行: 「${dep.title}」(${dep.zone === 'CLEARED' ? '完了済み' : '未完了'})` : null
    })
    .filter(Boolean)

  const dependencySection = dependencyLines.length > 0
    ? `\n## タスク依存関係（前提タスク）\n${dependencyLines.join('\n')}`
    : ''

  const clarificationSection = clarificationTask ? `

## 5W2H明確化モード（最優先ルール）
タスク「${clarificationTask.title}」の詳細を確認します:
- 着手予定: ${clarificationTask.scheduledStart || '未設定'}
- 推定時間: ${clarificationTask.estimatedTime ? clarificationTask.estimatedTime + '分' : '未設定'}
- メモ: ${clarificationTask.notes || 'なし'}

### 必須ルール
1. 欠落情報を1つだけ質問する（scheduledStartが設定済みならWHENは聞かない）
2. 回答の末尾に必ず以下3行のマーカーを出力する（省略禁止）:
<!--QR:["選択肢A","選択肢B","選択肢C","あとで考える"]-->
<!--TU:{"notes":"ユーザーの回答をここに記録"}-->
<!--DONE:false-->

### マーカー記入例
質問「場所はどこですか？」→ ユーザー「会議室B」の場合:
<!--QR:["会議室A","会議室B","自席","あとで考える"]-->
<!--TU:{"notes":"場所: 会議室B"}-->
<!--DONE:false-->

### 最終ターン（必要な情報が揃った場合 or「あとで考える」選択後）
確認を締める一言 + 以下のマーカー:
<!--QR:[]-->
<!--TU:{"notes":"[全回答を統合したメモ]","subtasks":[{"title":"手順1"},{"title":"手順2"}]}-->
<!--DONE:true-->

### その他
- 口調はEchoらしく自然に（「〜ですね ✈」など）
- タスク提案のJSONブロック(\`\`\`json)は絶対に出力しないこと。必ず <!--TU:...--> マーカーで既存タスクを更新すること。` : ''

  const taskGenerationSection = !clarificationTask ? `
【タスク提案の判断基準】
- ユーザーのメッセージに期限・作業内容が明示されている → 即座に全タスクを提案する（質問不要）
- 画像が添付されている場合 → 画像の内容を読み取り、確認なしに即タスク提案する
- 期限や内容が不明な場合 → 一つだけ確認してから提案する

【画像が添付された場合のルール（最優先）】
- 画像内のすべてのテキスト・日付・担当者・ステータス・数値を読み取る
- スクリーンショット（タスク管理ツール・カレンダー・チャット・資料）からタスクを生成する
- 手書きメモ・付箋・ホワイトボードの写真もOCRとして扱いタスク化する
- 人物のプライバシーは関係ない。作業内容・情報の把握のみに集中する
- 読み取った情報を冒頭で一行サマリー（例：「○○の画像から〜件の作業を検出しました」）してからタスクを提案する
- 画像だけで内容が判断できる場合は追加質問不要。即提案する

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
` : ''

  const userContextSection = userContext
    ? `\n\n## ユーザー自己記述コンテキスト（最優先）\n${userContext}\n（これはユーザー自身が記述した文脈情報です。すべての応答に反映してください）`
    : ''

  const profileSection = profileSummary
    ? `\n\n## あなたが知っているユーザーの特性\n${profileSummary}\n（この情報を踏まえて、タスク提案・励まし・優先度判断を個別化してください）`
    : ''

  return `あなたはTask-Hack AIです。ADHDを持つユーザーの仕事上のタスク管理を支援するAI秘書です。

【口調・スタイル】
- 丁寧語だが、親しみやすく簡潔に話す
- 返答は短く、添える質問・確認は一つだけにする
- ユーザーが愚痴や相談を投げてきたら、まず受け止めてから内容を整理する
${taskGenerationSection}
## 現在の状況
- 日時: ${dateStr} ${timeStr}
${boardLines}${dependencySection}${clarificationSection}${userContextSection}${profileSection}`
}

export function useChat(tasks: Task[], onUpdateTask?: (taskId: string, updates: Partial<Task>) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [clarificationTask, setClarificationTask] = useState<Task | null>(null)
  const [profileSummary, setProfileSummary] = useState('')
  const [userContext, setUserContext] = useState('')
  const clarificationTaskRef = useRef<Task | null>(null)
  const clarificationStartIndexRef = useRef<number>(-1)
  const clarificationAnswerCountRef = useRef<number>(0)

  // ユーザープロファイルをロード（goals + patterns を Echo のコンテキストに注入）
  useEffect(() => {
    window.api.loadProfile?.()
      .then(p => {
        const parts = [p.goals, p.patterns].filter(Boolean)
        setProfileSummary(parts.join('\n\n---\n\n').slice(0, 800))
      })
      .catch(() => {})
  }, [])

  // ユーザーコンテキストをロード（user_context.md）
  useEffect(() => {
    window.api.loadUserContext?.()
      .then(ctx => { if (ctx) setUserContext(ctx.slice(0, 1200)) })
      .catch(() => {})
  }, [])

  // clean up listeners when unmounting
  useEffect(() => {
    return () => {
      window.api.offChatListeners()
    }
  }, [])

  const sendMessage = useCallback(async (content: string, imageBase64?: string, isSystemTrigger?: boolean) => {
    const isInClarification = !!clarificationTaskRef.current
    // clarification中のユーザー回答をカウント（トリガー・「あとで考える」除く）
    if (isInClarification && !isSystemTrigger && content !== 'あとで考える') {
      clarificationAnswerCountRef.current += 1
    }
    // 「あとで考える」でclarificationモード終了 → フォールバック更新
    if (content === 'あとで考える' && isInClarification) {
      const ctask = clarificationTaskRef.current!
      setClarificationTask(null)
      clarificationTaskRef.current = null
      // フォールバック: 収集済み回答でnotesを更新
      setMessages(prev => {
        const answers = prev
          .slice(clarificationStartIndexRef.current)
          .filter(m => m.role === 'user' && !m.isSystemTrigger && m.content !== 'あとで考える')
          .map(m => m.content)
        if (answers.length > 0 && onUpdateTask) {
          onUpdateTask(ctask.id, { notes: answers.join(' / ') })
        }
        return prev
      })
    }
    const userMessage: ChatMessage = { role: 'user', content, imageBase64, ...(isSystemTrigger ? { isSystemTrigger: true } : {}) }

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

      const systemPrompt = buildSystemPrompt(tasks, clarificationTaskRef.current, profileSummary, userContext)
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
        const ctask = clarificationTaskRef.current
        if (!ctask) return
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.role !== 'assistant') return prev
          const { taskUpdates, done } = parseAssistantMarkers(last.content)

          // TUマーカーによる明示的な更新
          if (taskUpdates && Object.keys(taskUpdates).length > 0 && onUpdateTask) {
            onUpdateTask(ctask.id, taskUpdates as Partial<Task>)
          }

          // DONEまたは3回答達成 → フォールバック更新 + セッション終了
          const shouldEnd = done === true || clarificationAnswerCountRef.current >= 3
          if (shouldEnd) {
            // TUで notes が更新されていない場合、収集した回答を notes に書き込む
            const hasNotesUpdate = taskUpdates && 'notes' in taskUpdates
            if (!hasNotesUpdate && onUpdateTask) {
              const answers = prev
                .slice(clarificationStartIndexRef.current)
                .filter(m => m.role === 'user' && !m.isSystemTrigger)
                .map(m => m.content)
              if (answers.length > 0) {
                onUpdateTask(ctask.id, { notes: answers.join(' / ') })
              }
            }
            setClarificationTask(null)
            clarificationTaskRef.current = null
            clarificationAnswerCountRef.current = 0
          }
          return prev
        })
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
  }, [tasks, profileSummary, userContext])

  const injectMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content: text }])
  }, [])

  const startClarification = useCallback((task: Task) => {
    setClarificationTask(task)
    clarificationTaskRef.current = task
    clarificationAnswerCountRef.current = 0
    // startIndexはメッセージ追加後に設定（+2: triggerユーザー + Echoの最初の応答の前）
    setMessages(prev => {
      clarificationStartIndexRef.current = prev.length + 1 // trigger追加後のindex
      return prev
    })
    sendMessage(`[5W2H clarification start] タスク「${task.title}」の確認を始めてください。`, undefined, true)
  }, [sendMessage])

  return { messages, sendMessage, isLoading, injectMessage, startClarification, clarificationTask }
}
