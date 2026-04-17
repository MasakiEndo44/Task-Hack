import OpenAI from 'openai'
import type { Task } from '../../renderer/types/task'
import { buildLayeredPrompt } from './soulService'

export interface PriorityProposal {
  taskId: string
  title: string
  suggestedZone: 'ACTIVE' | 'NEXT_ACTION' | 'HOLDING'
  reason: string
}

export interface PriorityResult {
  proposals: PriorityProposal[]
  summary: string
}

export async function suggestPriority(
  apiKey: string,
  tasks: Task[]
): Promise<PriorityResult> {
  if (!apiKey) throw new Error('OpenAI APIキーが設定されていません')

  const openai = new OpenAI({ apiKey })

  const targetTasks = tasks
    .filter(t => t.zone !== 'CLEARED')
    .slice(0, 30)
    .map(t => ({
      id: t.id,
      title: t.title,
      zone: t.zone,
      priority: t.priority,
      estimatedTime: t.estimatedTime,
    }))

  const systemPrompt = await buildLayeredPrompt({
    request: `現在のタスク一覧を分析して、優先順位の提案をしてください。

以下のJSON形式で返してください:
{
  "proposals": [
    {"taskId": "FS0001", "title": "タスク名", "suggestedZone": "ACTIVE|NEXT_ACTION|HOLDING", "reason": "理由（50字以内）"},
    ...
  ],
  "summary": "全体的なアドバイス（100字以内）"
}

ルール:
- ACTIVE提案は最大1件
- NEXT_ACTION提案は最大5件
- 比較・評価語（失敗、サボりなど）は使わない
- 強制せず、選択肢として提示する`
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `現在のタスク一覧:\n${JSON.stringify(targetTasks, null, 2)}` }
    ],
    temperature: 0.4,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  })

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}')
    return {
      proposals: parsed.proposals ?? [],
      summary: parsed.summary ?? '',
    }
  } catch {
    return { proposals: [], summary: '' }
  }
}
