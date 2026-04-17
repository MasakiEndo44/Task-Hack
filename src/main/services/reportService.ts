import OpenAI from 'openai'
import type { Task } from '../../renderer/types/task'
import { buildLayeredPrompt } from './soulService'
import { getWeekLabel } from './vaultService'

export interface WeeklyReportResult {
  reportMd: string
  archiveMd: string
  profileUpdates: {
    patterns: string
    insights: string
  }
}

export function buildArchiveMd(clearedTasks: Task[], weekLabel: string): string {
  const now = new Date().toISOString()
  const rows = clearedTasks.map(t =>
    `| ${t.id} | ${t.title} | ${t.priority} | ${t.completedAt ? new Date(t.completedAt).toLocaleString('ja-JP') : '-'} | ${t.estimatedTime ?? '-'}分 |`
  ).join('\n')

  return `# 📁 タスクアーカイブ：${weekLabel}

---
type: task-archive
period: ${weekLabel}
taskCount: ${clearedTasks.length}
archivedAt: ${now}
---

| ID | タイトル | 優先度 | 完了日時 | 見積時間 |
|---|---|---|---|---|
${rows || '| - | タスクなし | - | - | - |'}
`
}

export async function generateWeeklyReport(
  apiKey: string,
  clearedTasks: Task[],
  weekLabel: string = getWeekLabel()
): Promise<WeeklyReportResult> {
  if (!apiKey) throw new Error('OpenAI APIキーが設定されていません')

  const openai = new OpenAI({ apiKey })

  const taskListJson = JSON.stringify(
    clearedTasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      estimatedTime: t.estimatedTime,
      completedAt: t.completedAt,
      notes: t.notes,
    })),
    null, 2
  )

  const systemPrompt = await buildLayeredPrompt({
    profileSections: ['identity', 'patterns', 'goals'],
    request: `週次レポートを生成してください。

対象週: ${weekLabel}
完了タスク数: ${clearedTasks.length}件

以下のMarkdown形式で出力してください（YAMLフロントマターを含む）:

---
type: weekly-report
period: ${weekLabel}
tasksCompleted: ${clearedTasks.length}
generatedAt: ${new Date().toISOString()}
---

# 🛬 週次レポート：${weekLabel}

## ✅ 今週こなしたフライト
（タスクのテーブル。ID・タイトル・完了日時を含む）

## 💡 今週の発見
（200字以内。行動パターンの気づき、承認的なトーン。比較や評価は含めない）

## 🔄 次週への橋渡し
（1〜2個の軽い提案。強制感のない表現で）`
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `今週完了したタスク:\n\`\`\`json\n${taskListJson}\n\`\`\`` }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  })

  const reportMd = response.choices[0]?.message?.content ?? ''
  const archiveMd = buildArchiveMd(clearedTasks, weekLabel)
  const profileUpdates = await updateProfileFromTasks(apiKey, clearedTasks, weekLabel)

  return { reportMd, archiveMd, profileUpdates }
}

export async function updateProfileFromTasks(
  apiKey: string,
  clearedTasks: Task[],
  weekLabel: string
): Promise<{ patterns: string; insights: string }> {
  const openai = new OpenAI({ apiKey })

  const systemPrompt = await buildLayeredPrompt({
    profileSections: ['patterns', 'insights'],
    request: `今週完了したタスクデータを分析して、patterns.mdとinsights.mdの更新内容を生成してください。

以下のJSON形式のみで返してください（他のテキストは含めないでください）:
{"patterns": "（更新後のpatterns.mdの全文）", "insights": "（更新後のinsights.mdの全文）"}`
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${weekLabel}の完了タスク:\n${JSON.stringify(clearedTasks.map(t => ({ title: t.title, completedAt: t.completedAt, estimatedTime: t.estimatedTime })))}` }
    ],
    temperature: 0.5,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  })

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}')
    return {
      patterns: parsed.patterns ?? '',
      insights: parsed.insights ?? '',
    }
  } catch {
    return { patterns: '', insights: '' }
  }
}
