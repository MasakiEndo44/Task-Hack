import OpenAI from 'openai'
import type { Task } from '../../renderer/types/task'
import { buildLayeredPrompt } from './soulService'
import { getWeekLabel } from './vaultService'
import { injectContext } from './contextService'

export interface WeeklyReportResult {
  reportMd: string
  archiveMd: string
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
  await updateContextFromTasks(apiKey, clearedTasks, weekLabel)

  return { reportMd, archiveMd }
}

export async function updateContextFromTasks(
  apiKey: string,
  clearedTasks: Task[],
  weekLabel: string
): Promise<void> {
  const input = `以下の完了タスクから、ユーザーの「Patterns」と「Insights」に記録すべき傾向や発見を抽出し、user-context.mdを更新してください。

対象週: ${weekLabel}
完了タスク:
${JSON.stringify(clearedTasks.map(t => ({ title: t.title, completedAt: t.completedAt, estimatedTime: t.estimatedTime })))}`

  await injectContext(apiKey, input)
}
