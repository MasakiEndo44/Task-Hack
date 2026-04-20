import type { AppTag } from '../types/tag'
import type { Task } from '../types/task'

/** クライアントサイドのみで動作するEcho Auto-Fill候補算出（max 2件） */
export function getTagSuggestions(task: Task, allTags: AppTag[], allTasks: Task[]): AppTag[] {
  const assignedIds = new Set(task.tagIds ?? [])
  const candidates = allTags.filter(t => !assignedIds.has(t.id))
  if (candidates.length === 0) return []

  const recentTasks = allTasks.filter(t => t.id !== task.id).slice(-10)

  const score = (tag: AppTag): number => {
    let s = 0
    if (task.title.toLowerCase().includes(tag.name.toLowerCase())) s += 10
    s += recentTasks.filter(t => t.tagIds?.includes(tag.id)).length
    if (task.category && tag.name.toLowerCase().includes(task.category.toLowerCase())) s += 3
    return s
  }

  return candidates
    .map(tag => ({ tag, s: score(tag) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 2)
    .map(({ tag }) => tag)
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/** 類似タグペアを検出（Levenshtein ≤ 2 または一方が他方を含む） */
export function findSimilarTagPairs(tags: AppTag[]): Array<[AppTag, AppTag]> {
  const pairs: Array<[AppTag, AppTag]> = []
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const a = tags[i].name.toLowerCase()
      const b = tags[j].name.toLowerCase()
      if (levenshtein(a, b) <= 2 || a.includes(b) || b.includes(a)) {
        pairs.push([tags[i], tags[j]])
      }
    }
  }
  return pairs
}
