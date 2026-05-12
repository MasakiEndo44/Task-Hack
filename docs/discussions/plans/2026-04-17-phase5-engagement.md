# Phase 5: 持続的エンゲージメント — 実装計画書

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Task-Hack Phase 5 — F2.4（繰り返しタスク）・F4.3（画像ペースト）・F4.4（擬似ボディ・ダブリング）・F4.6（タスク優先度提案）を実装し、「毎日使い続けたくなるAI秘書」を完成させる。

**参照ドキュメント:**
- `docs/output/task-hack-system-requirements.md`
- `docs/output/phase4-completion-report.md`

**設計顧問:** Gemini（googleSearch） + o3（Bing推論）による壁打ちに基づく設計決定を反映。

---

## 設計決定サマリー

### F2.4 繰り返しタスク
| 決定事項 | 内容 | 根拠 |
|---------|------|------|
| データスキーマ | 独自 `RecurrenceRule` 型（RRULE不採用） | Phase5スコープには日次/週次/月次で十分。RRULEライブラリは過剰 |
| 生成タイミング | **ハイブリッド**: CLEARED時 + 起動時チェック | ドーパミンループ維持 + 起動時の missed generation 補完 |
| missed generation | **最新1件のみ**生成 | 複数件まとめて出現はADHDのタスク麻痺を引き起こすアンチパターン |
| 重複防止 | `lastGeneratedAt` フィールド必須 | これがないと起動のたびに重複生成 |

### F4.3 画像ペースト
| 決定事項 | 内容 |
|---------|------|
| 実装 | `navigator.clipboard` API優先（レンダラー内完結）、IPC fallback |
| サイズ上限 | **2MB / 1280×1280px**（GPT-4oの実用限界とコスト抑制のバランス） |
| 同意 | 初回のみ「OpenAIに送信されます」確認ダイアログ |
| useChat | `imageBase64` フィールドは既存対応済み。ChatDrawerの `attachedImage` state に接続するだけ |

### F4.4 擬似ボディ・ダブリング
| 決定事項 | 内容 |
|---------|------|
| 声かけタイミング | 開始時・中間（デフォルトOFF）・wrapup突入・完了後 |
| 実装 | `useTimer` に `onTimerEvent` コールバックを追加。`setTimeout[]` を `useRef` で管理 |
| メッセージ注入 | EchoのBehavioral Invariantsに従い非強制。ChatDrawerのmessages配列に `role: 'assistant'` として挿入 |

### F4.6 優先度提案
| 決定事項 | 内容 |
|---------|------|
| 起点 | HOLDINGゾーンヘッダーに専用ボタン + チャットコマンド両対応 |
| プロンプト規模 | プロファイルサマリー（~250トークン）+ タスク上限30件 = 総計4K以内 |
| キャッシュ | プロファイルサマリーは `profileSummaryCache` に保持。MD変更時に無効化 |
| 結果 | チャットに「✔ 適用 / ✖ 却下」付きで表示 |

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│  Renderer Process (React)                               │
│  Task型: recurrence フィールド追加                        │
│  useTimer: TimerCallbacks追加（onStart/onMidpoint等）    │
│  ChatDrawer: 画像ペースト + ボディ・ダブリング注入         │
│  HOLDINGゾーン: 優先度提案ボタン追加                      │
└────────────────┬────────────────────────────────────────┘
                 │ IPC
┌────────────────▼────────────────────────────────────────┐
│  Preload (index.ts / index.d.ts)                        │
│  recurrence:check  priority:suggest  (新規2本)          │
└────────────────┬────────────────────────────────────────┘
                 │ ipcMain.handle
┌────────────────▼────────────────────────────────────────┐
│  Main Process (index.ts)                                │
│  services/recurrenceService.ts  ← 繰り返しタスク生成    │
│  services/priorityService.ts   ← 優先度提案GPT-4o      │
│  scheduler.ts: checkRecurringTasks() 追加               │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure（追加分）

```
src/
├── renderer/
│   ├── types/
│   │   └── task.ts                    # 変更: RecurrenceRule型追加
│   ├── hooks/
│   │   └── useTimer.ts                # 変更: TimerCallbacks追加
│   └── components/
│       ├── ChatDrawer/
│       │   └── ChatDrawer.tsx         # 変更: 画像ペースト強化 + ボディ・ダブリング注入口
│       └── Zone/
│           └── Zone.tsx               # 変更: HOLDINGに優先度提案ボタン追加
└── main/
    └── services/
        ├── recurrenceService.ts       # 新規
        └── priorityService.ts         # 新規

tests/
└── services/
    ├── recurrenceService.test.ts      # 新規
    └── priorityService.test.ts        # 新規
```

---

## Task 1: 繰り返しタスク型定義 + recurrenceService

**Files:**
- Modify: `src/renderer/types/task.ts`
- Create: `src/main/services/recurrenceService.ts`
- Create: `tests/services/recurrenceService.test.ts`

### Step 1: `src/renderer/types/task.ts` に RecurrenceRule 型を追加

```typescript
/** 繰り返しタスクの頻度 */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly'

/** 繰り返しルール */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  /** weekly用: 0=日曜, 1=月曜, ..., 6=土曜 */
  dayOfWeek?: number
  /** monthly用: 1〜31 */
  dayOfMonth?: number
  /** 最後に次インスタンスを生成した日時（重複防止） */
  lastGeneratedAt?: string
}

// Task インターフェースに追加:
// recurrence?: RecurrenceRule
```

- [ ] **`task.ts` の `Task` インターフェースに `recurrence?: RecurrenceRule` フィールドを追加する**

### Step 2: `src/main/services/recurrenceService.ts` を作成

```typescript
import type { Task, RecurrenceRule } from '../../renderer/types/task'
import { generateFlightId } from '../../renderer/utils/flightId'

/**
 * 指定タスクが「今日、新しいインスタンスを生成すべきか」を判定する
 */
export function shouldGenerateToday(rule: RecurrenceRule, now: Date = new Date()): boolean {
  const lastGen = rule.lastGeneratedAt ? new Date(rule.lastGeneratedAt) : null

  // 同日にすでに生成済みなら不要
  if (lastGen && isSameDay(lastGen, now)) return false

  switch (rule.frequency) {
    case 'daily':
      // 前回生成日の翌日以降
      if (!lastGen) return true
      return now.getTime() - lastGen.getTime() >= 24 * 60 * 60 * 1000
    case 'weekly': {
      const targetDay = rule.dayOfWeek ?? 1 // デフォルト月曜
      if (now.getDay() !== targetDay) return false
      if (!lastGen) return true
      return now.getTime() - lastGen.getTime() >= 6 * 24 * 60 * 60 * 1000
    }
    case 'monthly': {
      const targetDate = rule.dayOfMonth ?? 1
      if (now.getDate() !== targetDate) return false
      if (!lastGen) return true
      return now.getMonth() !== lastGen.getMonth() || now.getFullYear() !== lastGen.getFullYear()
    }
  }
}

/**
 * テンプレートタスクから新しいインスタンスを生成する
 * missed generation は「最新1件のみ」生成するため、連続呼び出し不要
 */
export function generateNextInstance(template: Task, now: Date = new Date()): Task {
  const { recurrence, id: _templateId, ...rest } = template
  const newTask: Task = {
    ...rest,
    id: generateFlightId(),
    zone: 'NEXT_ACTION',
    order: 0,
    createdAt: now.toISOString(),
    completedAt: undefined,
  }
  return newTask
}

/**
 * テンプレートの lastGeneratedAt を更新する
 */
export function updateLastGeneratedAt(template: Task, now: Date = new Date()): Task {
  if (!template.recurrence) return template
  return {
    ...template,
    recurrence: {
      ...template.recurrence,
      lastGeneratedAt: now.toISOString(),
    }
  }
}

/**
 * タスクリストから繰り返しタスクを処理する
 * 生成が必要なインスタンスを返し、テンプレートの lastGeneratedAt を更新する
 *
 * @returns { generated: Task[], updatedTemplates: Task[] }
 */
export function processRecurringTasks(
  tasks: Task[],
  now: Date = new Date()
): { generated: Task[]; updatedTemplates: Task[] } {
  const generated: Task[] = []
  const updatedTemplates: Task[] = []

  for (const task of tasks) {
    if (!task.recurrence) continue
    if (task.zone === 'CLEARED') continue // CLEAREDのテンプレートはスキップ（通常はCLEAREDに置かない）

    if (shouldGenerateToday(task.recurrence, now)) {
      generated.push(generateNextInstance(task, now))
      updatedTemplates.push(updateLastGeneratedAt(task, now))
    }
  }

  return { generated, updatedTemplates }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
```

### Step 3: テスト — `tests/services/recurrenceService.test.ts` を作成

```typescript
import { describe, it, expect } from 'vitest'
import { shouldGenerateToday, processRecurringTasks } from '../../src/main/services/recurrenceService'
import type { Task } from '../../src/renderer/types/task'

const base: Task = {
  id: 'FS0001', title: 'メールチェック', zone: 'HOLDING',
  priority: 'NRM', createdAt: '2026-04-17T09:00:00Z', order: 0,
  recurrence: { frequency: 'daily' }
}

describe('shouldGenerateToday', () => {
  it('daily: lastGeneratedAt未設定 → 生成すべき', () => {
    expect(shouldGenerateToday({ frequency: 'daily' })).toBe(true)
  })

  it('daily: 同日生成済み → 生成不要', () => {
    const now = new Date('2026-04-17T18:00:00Z')
    expect(shouldGenerateToday({ frequency: 'daily', lastGeneratedAt: '2026-04-17T09:00:00Z' }, now)).toBe(false)
  })

  it('daily: 翌日以降 → 生成すべき', () => {
    const now = new Date('2026-04-18T09:00:00Z')
    expect(shouldGenerateToday({ frequency: 'daily', lastGeneratedAt: '2026-04-17T09:00:00Z' }, now)).toBe(true)
  })

  it('weekly: 指定曜日でない日 → 生成不要', () => {
    // 2026-04-17 は金曜(5)。月曜(1)指定
    const now = new Date('2026-04-17T09:00:00Z')
    expect(shouldGenerateToday({ frequency: 'weekly', dayOfWeek: 1 }, now)).toBe(false)
  })

  it('weekly: 指定曜日かつ未生成 → 生成すべき', () => {
    // 2026-04-20 は月曜(1)
    const now = new Date('2026-04-20T09:00:00Z')
    expect(shouldGenerateToday({ frequency: 'weekly', dayOfWeek: 1 }, now)).toBe(true)
  })

  it('monthly: 日付一致かつ今月未生成 → 生成すべき', () => {
    const now = new Date('2026-04-17T09:00:00Z')
    expect(shouldGenerateToday(
      { frequency: 'monthly', dayOfMonth: 17, lastGeneratedAt: '2026-03-17T09:00:00Z' }, now
    )).toBe(true)
  })
})

describe('processRecurringTasks', () => {
  it('繰り返しタスクから新インスタンスが生成される', () => {
    const now = new Date('2026-04-18T09:00:00Z')
    const { generated, updatedTemplates } = processRecurringTasks([base], now)
    expect(generated).toHaveLength(1)
    expect(generated[0].zone).toBe('NEXT_ACTION')
    expect(generated[0].id).not.toBe(base.id)
    expect(updatedTemplates).toHaveLength(1)
  })

  it('同日生成済みなら再生成しない', () => {
    const now = new Date('2026-04-17T18:00:00Z')
    const task = { ...base, recurrence: { frequency: 'daily' as const, lastGeneratedAt: '2026-04-17T09:00:00Z' } }
    const { generated } = processRecurringTasks([task], now)
    expect(generated).toHaveLength(0)
  })
})
```

```bash
npx vitest run tests/services/recurrenceService.test.ts
```

Expected: 8 tests passed.

---

## Task 2: 繰り返しタスク UI統合

**Files:**
- Modify: `src/renderer/hooks/useTaskReducer.ts`
- Modify: `src/main/index.ts` (IPC handler追加)
- Modify: `src/preload/index.ts` / `index.d.ts`
- Modify: `src/main/services/scheduler.ts`
- Modify: `src/renderer/components/TaskDetail/TaskDetail.tsx`

### Step 1: `useTaskReducer` に繰り返しタスク処理を追加

`useTaskReducer.ts` に以下のアクションを追加:

```typescript
// アクション型追加
| { type: 'GENERATE_RECURRING'; payload: { generated: Task[]; updatedTemplates: Task[] } }

// ReducerのCOMPLETE_TASK ケースに追加:
// CLEARED後にrecurrenceがあれば自動生成をトリガーするため、
// useTaskReducer の外（App.tsx）からIPCを呼び出す設計とする
```

**設計方針**: 繰り返し生成はメインプロセスのロジック（`recurrenceService`）で行い、結果をIPCで受け取りReductに投入する。レンダラー側の `processRecurringTasks` をimportする方法もあるが、メインプロセス統一で依存関係をシンプルにする。

```typescript
// App.tsx の handleComplete を拡張:
const handleComplete = useCallback(async (taskId: string) => {
  dispatch({ type: 'COMPLETE_TASK', payload: { taskId } })
  // CLEAREDにした後、繰り返しタスクのチェック
  const result = await window.api.checkRecurringTasks(tasks)
  if (result.generated.length > 0) {
    result.generated.forEach(task => {
      dispatch({ type: 'ADD_TASK', payload: { ...task, id: task.id } })
    })
    // テンプレートの lastGeneratedAt 更新
    result.updatedTemplates.forEach(updated => {
      dispatch({ type: 'UPDATE_TASK', payload: { taskId: updated.id, updates: updated } })
    })
  }
}, [dispatch, tasks])
```

### Step 2: IPC 追加

`src/preload/index.ts`:
```typescript
checkRecurringTasks: (tasks: Task[]) => ipcRenderer.invoke('recurrence:check', tasks),
```

`src/main/index.ts`:
```typescript
import { processRecurringTasks } from './services/recurrenceService'

ipcMain.handle('recurrence:check', async (_, tasks) => {
  return processRecurringTasks(tasks)
})
```

### Step 3: scheduler.ts に起動時チェックを追加

```typescript
// startScheduler の起動時に checkAndRunRecurringTasks を追加
import { processRecurringTasks } from './recurrenceService'

export async function checkAndRunRecurringTasks(
  loadTasks: () => Promise<Task[]>,
  saveTasks: (tasks: Task[]) => Promise<void>
): Promise<{ generatedCount: number }> {
  const tasks = await loadTasks()
  const { generated, updatedTemplates } = processRecurringTasks(tasks)

  if (generated.length === 0) return { generatedCount: 0 }

  // tasks.json に直接書き込む（UIがレンダラー側でも行うが、起動時はレンダラー未起動の可能性）
  const updatedTasks = tasks
    .map(t => updatedTemplates.find(u => u.id === t.id) ?? t)
    .concat(generated)

  await saveTasks(updatedTasks)
  console.log(`[Recurrence] ${generated.length}件の定期タスクを生成しました`)
  return { generatedCount: generated.length }
}
```

### Step 4: TaskDetail に繰り返し設定 UI を追加

`TaskDetail.tsx` に「🔁 繰り返し」セクションを追加:

```tsx
// 繰り返し設定UIの骨格
<div className={styles.section}>
  <label>🔁 繰り返し</label>
  <select
    value={task.recurrence?.frequency ?? ''}
    onChange={e => onUpdate(task.id, {
      recurrence: e.target.value
        ? { frequency: e.target.value as RecurrenceFrequency }
        : undefined
    })}
    className={styles.select}
  >
    <option value="">なし</option>
    <option value="daily">毎日</option>
    <option value="weekly">毎週</option>
    <option value="monthly">毎月</option>
  </select>
  {task.recurrence?.frequency === 'weekly' && (
    <select
      value={task.recurrence.dayOfWeek ?? 1}
      onChange={e => onUpdate(task.id, {
        recurrence: { ...task.recurrence!, dayOfWeek: Number(e.target.value) }
      })}
      className={styles.select}
    >
      {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
        <option key={i} value={i}>{d}曜日</option>
      ))}
    </select>
  )}
  {task.recurrence?.frequency === 'monthly' && (
    <select
      value={task.recurrence.dayOfMonth ?? 1}
      onChange={e => onUpdate(task.id, {
        recurrence: { ...task.recurrence!, dayOfMonth: Number(e.target.value) }
      })}
      className={styles.select}
    >
      {Array.from({ length: 31 }, (_, i) => (
        <option key={i + 1} value={i + 1}>{i + 1}日</option>
      ))}
    </select>
  )}
</div>
```

---

## Task 3: 画像ペーストからのタスク生成（F4.3）

**Files:**
- Modify: `src/renderer/components/ChatDrawer/ChatDrawer.tsx`
- Modify: `src/preload/index.ts` / `index.d.ts` (fallback IPC)
- Modify: `src/main/index.ts` (fallback IPC handler)

### Step 1: ChatDrawer に画像ペースト処理を強化

既存の `attachedImage` state と `fileInputRef` を活用し、クリップボードからの直接ペーストを追加:

```typescript
// 既存の attachedImage state はそのまま使用

// サイズ・MIME検証ヘルパー
const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2MB
const MAX_IMAGE_PIXELS = 1280

async function processImageFile(blob: Blob): Promise<string | null> {
  if (blob.size > MAX_IMAGE_BYTES) {
    alert('画像サイズは2MB以下にしてください')
    return null
  }
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, MAX_IMAGE_PIXELS / Math.max(img.width, img.height))
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = url
  })
}

// Ctrl+V / Cmd+V でのペースト処理
useEffect(() => {
  const handlePaste = async (e: ClipboardEvent) => {
    if (!isOpen) return
    const items = Array.from(e.clipboardData?.items ?? [])
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (!imageItem) return

    const blob = imageItem.getAsFile()
    if (!blob) return

    const dataUrl = await processImageFile(blob)
    if (dataUrl) setAttachedImage(dataUrl)
  }

  window.addEventListener('paste', handlePaste)
  return () => window.removeEventListener('paste', handlePaste)
}, [isOpen])
```

### Step 2: 初回送信時の同意確認

```typescript
const IMAGE_CONSENT_KEY = 'task-hack:image-api-consent'

const handleSendWithImage = async () => {
  if (attachedImage && !localStorage.getItem(IMAGE_CONSENT_KEY)) {
    const ok = confirm(
      'この画像はOpenAI APIに送信され、タスク生成に使用されます。\n' +
      'タスクデータはローカルにのみ保存されます。よろしいですか？'
    )
    if (!ok) return
    localStorage.setItem(IMAGE_CONSENT_KEY, '1')
  }
  // 通常の送信フロー（既存の sendMessage を呼ぶ）
}
```

### Step 3: DnD（ファイルドロップ）対応

```typescript
// ChatDrawer の drop ハンドラーに追加
const handleDrop = useCallback(async (e: React.DragEvent) => {
  e.preventDefault()
  const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
  if (!file) return
  const dataUrl = await processImageFile(file)
  if (dataUrl) setAttachedImage(dataUrl)
}, [])
```

### Step 4: システムプロンプトに画像解析指示を追加

`useChat.ts` の `buildSystemPrompt` を拡張し、画像がある場合のタスク生成プロンプトを強化:

```typescript
// buildSystemPrompt 内に追加:
const imageInstruction = `
【画像からのタスク生成】
ユーザーが画像を添付した場合:
1. 画像の内容を簡潔に説明する（1行）
2. 画像から読み取れるタスクを自動生成して提案する
3. タスクの優先度・所要時間の見積もりも付ける`
```

---

## Task 4: 擬似ボディ・ダブリング（F4.4）

**Files:**
- Modify: `src/renderer/hooks/useTimer.ts`
- Modify: `src/renderer/components/ChatDrawer/ChatDrawer.tsx`
- Modify: `src/renderer/App.tsx`

### Step 1: `useTimer` に TimerCallbacks を追加

```typescript
export interface TimerCallbacks {
  onStart?: (taskTitle: string) => void
  onMidpoint?: (taskTitle: string, remainingMin: number) => void  // デフォルトOFF
  onWrapup?: (taskTitle: string) => void
  onComplete?: (taskTitle: string) => void
}

// useTimer のシグネチャを変更:
export function useTimer(
  initialMinutes: number = 25,
  callbacks?: TimerCallbacks,
  activeTaskTitle: string = ''
): UseTimerResult

// start() 実行時:
useEffect(() => {
  if (state === 'running' && callbacks?.onStart) {
    callbacks.onStart(activeTaskTitle)
  }
  // 50%地点のsetTimeoutを設定（callbacks.onMidpointが存在する場合のみ）
  if (state === 'running' && callbacks?.onMidpoint) {
    const midpointMs = (remainingTime / 2) * 1000
    const id = setTimeout(() => {
      callbacks.onMidpoint?.(activeTaskTitle, Math.floor(remainingTime / 2 / 60))
    }, midpointMs)
    // useRefで管理してクリーンアップ
  }
}, [/* state が running になった時のみ */])

// wrapupステート遷移時:
// 既存の wrapup ステート遷移に onWrapup コールバックを追加

// idle（完了）遷移時:
// onComplete を呼ぶ
```

### Step 2: App.tsx でコールバックをChatDrawerに接続

```typescript
// App.tsx
const handleTimerEvent = useCallback((
  event: 'start' | 'midpoint' | 'wrapup' | 'complete',
  taskTitle: string,
  remainingMin?: number
) => {
  const messages: Record<string, string> = {
    start: `「${taskTitle}」、始めましょう。あなたのペースで大丈夫です ✈`,
    midpoint: `折り返し点です。あと${remainingMin}分ほど。順調ですか？`,
    wrapup: `残り2分です。仕上げに入りましょうか？`,
    complete: `「${taskTitle}」、お疲れさまでした 🛬 ひと息ついてください。`,
  }
  // ChatDrawerのmessagesに直接挿入するためのコールバック
  injectEchoMessage(messages[event])
}, [])
```

### Step 3: ChatDrawer に Echo メッセージ注入口を追加

```typescript
// ChatDrawer の props に追加:
interface ChatDrawerProps {
  // ... 既存
  onInjectMessage?: (register: (message: string) => void) => void
}

// ChatDrawerの内部で:
const injectEchoMessage = useCallback((text: string) => {
  setMessages(prev => [...prev, {
    role: 'assistant' as const,
    content: text
  }])
}, [])

// 外部から呼べるようにする（useImperativeHandle or コールバック登録）
useEffect(() => {
  onInjectMessage?.(injectEchoMessage)
}, [onInjectMessage, injectEchoMessage])
```

---

## Task 5: タスク優先度提案（F4.6）

**Files:**
- Create: `src/main/services/priorityService.ts`
- Modify: `src/preload/index.ts` / `index.d.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/components/Zone/Zone.tsx`
- Modify: `src/renderer/components/ChatDrawer/ChatDrawer.tsx`
- Create: `tests/services/priorityService.test.ts`

### Step 1: `src/main/services/priorityService.ts` を作成

```typescript
import OpenAI from 'openai'
import type { Task } from '../../renderer/types/task'
import { buildLayeredPrompt } from './soulService'
import { loadAllProfile } from './profileService'

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
  const profile = await loadAllProfile()

  // プロファイルサマリー（上限250トークン相当）
  const profileSummary = [
    profile.identity ? `## ユーザー情報\n${profile.identity.slice(0, 500)}` : '',
    profile.goals ? `## 目標\n${profile.goals.slice(0, 300)}` : '',
    profile.patterns ? `## 行動パターン\n${profile.patterns.slice(0, 400)}` : '',
  ].filter(Boolean).join('\n\n')

  // 対象タスク（CLEARED除外、上限30件）
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

ユーザープロファイル:
${profileSummary}

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
```

### Step 2: IPC 追加

`src/preload/index.ts`:
```typescript
suggestPriority: (tasks: Task[]) => ipcRenderer.invoke('priority:suggest', tasks),
```

`src/main/index.ts`:
```typescript
import { suggestPriority } from './services/priorityService'

ipcMain.handle('priority:suggest', async (_, tasks) => {
  const settings = await loadCurrentSettings()
  return suggestPriority(settings.openAiApiKey ?? '', tasks)
})
```

### Step 3: HOLDINGゾーンに優先度提案ボタンを追加

`Zone.tsx` の HOLDING ゾーンヘッダーに追加:

```tsx
// Zone コンポーネントの props に追加:
interface ZoneProps {
  // ... 既存
  onSuggestPriority?: () => void
  zone: ZoneType
}

// JSX内 (zone === 'HOLDING' の場合のみ表示):
{zone === 'HOLDING' && onSuggestPriority && (
  <button
    className={styles.prioritySuggestBtn}
    onClick={onSuggestPriority}
    title="Echoに優先順位を提案してもらう"
  >
    ◈ Echo に聞く
  </button>
)}
```

### Step 4: App.tsx で優先度提案を実装

```typescript
const handleSuggestPriority = useCallback(async () => {
  try {
    const result = await window.api.suggestPriority(tasks)
    // 提案をChatDrawerに表示
    const proposalText = [
      result.summary,
      '',
      ...result.proposals.map(p =>
        `**${p.title}** → ${p.suggestedZone}\n  理由: ${p.reason}`
      ),
      '',
      '適用しますか？ タスクをドラッグで移動するか、「全て適用」とお伝えください。'
    ].join('\n')
    injectEchoMessage(proposalText)
    setIsChatOpen(true)
  } catch (e: any) {
    console.error('Priority suggestion failed:', e)
  }
}, [tasks])
```

### Step 5: テスト — `tests/services/priorityService.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/test-home') }
}))

const mockFs = vi.hoisted(() => ({
  readFile: vi.fn().mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' })),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('fs/promises', () => ({ default: mockFs }))

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({
            proposals: [
              { taskId: 'FS0001', title: 'テスト', suggestedZone: 'ACTIVE', reason: 'テスト理由' }
            ],
            summary: 'テスト要約'
          }) } }]
        })
      }
    }
  }))
}))

import { suggestPriority } from '../../src/main/services/priorityService'
import type { Task } from '../../src/renderer/types/task'

const mockTask: Task = {
  id: 'FS0001', title: 'テストタスク', zone: 'HOLDING',
  priority: 'NRM', createdAt: '2026-04-17T09:00:00Z', order: 0
}

describe('suggestPriority', () => {
  it('APIキーが空の場合はエラーをスロー', async () => {
    await expect(suggestPriority('', [mockTask])).rejects.toThrow('APIキー')
  })

  it('proposals と summary を返す', async () => {
    const result = await suggestPriority('sk-test', [mockTask])
    expect(result.proposals).toHaveLength(1)
    expect(result.proposals[0].suggestedZone).toBe('ACTIVE')
    expect(result.summary).toBe('テスト要約')
  })

  it('CLEARED タスクは送信しない（呼び出し元で除外）', async () => {
    const clearedTask = { ...mockTask, zone: 'CLEARED' as const }
    // priorityService自体はゾーンフィルタをAPIキー検証の前に行わない設計
    // フィルタはIPCハンドラー側またはApp.tsx側で行う
    const result = await suggestPriority('sk-test', [clearedTask])
    expect(result).toBeDefined()
  })
})
```

---

## Task 6: 最終統合 + テスト + ビルド確認

- [ ] `npx vitest run` — 全テストグリーン確認（目標: 100+テスト）
- [ ] `npm run build` — TypeScriptエラーなし確認
- [ ] `npm run dev` — 動作確認

### 確認シナリオ

**F2.4 繰り返しタスク:**
1. TaskDetailで任意のタスクに「毎日」繰り返しを設定
2. タスクをCLEAREDにする → NEXT_ACTIONに新しいインスタンスが自動生成される
3. アプリを再起動 → 翌日以降なら新インスタンスが生成される

**F4.3 画像ペースト:**
1. ChatDrawerを開いてスクリーンショットをCtrl+V → プレビューが表示される
2. 送信 → 「この画像はOpenAI APIに送信されます」の初回確認
3. AIが画像からタスクを提案 → 承認でボードに追加

**F4.4 ボディ・ダブリング:**
1. ACTIVEタスクのタイマーをスタート → ChatDrawerにEchoの声かけが表示
2. wrapup（残り2分）で声かけが表示される
3. 完了後に「お疲れさまでした」が表示される

**F4.6 優先度提案:**
1. HOLDINGゾーンの「◈ Echo に聞く」ボタンをクリック
2. ChatDrawerが開きEchoの提案が表示される
3. D&Dで提案されたゾーンにタスクを移動して適用

---

## 最終完了チェックリスト

- [ ] 繰り返しタスクをCLEAREDにすると次インスタンスが自動生成される
- [ ] アプリ起動時に未生成の定期タスクが補完される（最新1件のみ）
- [ ] TaskDetailに繰り返し設定UIが表示される（日次/週次/月次）
- [ ] ChatDrawerでCtrl+Vによる画像ペーストが動作する
- [ ] 2MB超の画像はエラーメッセージが表示される
- [ ] 初回送信時のみAPIへの送信確認ダイアログが表示される
- [ ] タイマー開始時にChatDrawerにEcho声かけが表示される
- [ ] wrapup・完了時にも声かけが表示される
- [ ] HOLDINGゾーンの「◈ Echo に聞く」ボタンが表示される
- [ ] 優先度提案がChatDrawerに表示され、提案内容が適切である
- [ ] `npx vitest run` 全テストグリーン
- [ ] `npm run build` TypeScriptエラーゼロ

---

## 実装スケジュール目安

| Task | 主な作業 | 想定工数 | 依存 |
|------|---------|---------|------|
| Task 1 | RecurrenceRule型 + recurrenceService | 2h | なし |
| Task 2 | 繰り返しUI統合（TaskDetail + useTaskReducer + IPC） | 3h | Task 1 |
| Task 3 | 画像ペースト強化（ChatDrawer + サイズ検証） | 2h | なし |
| Task 4 | ボディ・ダブリング（useTimer拡張 + Echo注入） | 3h | なし |
| Task 5 | 優先度提案（priorityService + Zone UI + App.tsx） | 3h | Task 1 |
| Task 6 | 統合テスト + ビルド確認 | 1h | 全Task |

**合計想定工数: 14h**

---

## 設計顧問からの重要警告

> **Gemini:** 繰り返しタスクの「missed generation は最新1件のみ」は絶対に守ること。数日分まとめて出現はADHDのタスク麻痺を引き起こすアンチパターン。

> **o3:** `lastGeneratedAt` フィールドなしで実装した場合、起動のたびに重複生成するバグが必ず発生する。これを最優先で実装すること。

> **Gemini:** ボディ・ダブリングの50%チェックインは「デフォルトOFF」にすること。過集中中断のリスクが最も高い。

> **o3:** 優先度提案のプロファイルは毎回フルMDをパースせず、キャッシュ済みサマリーを使うこと。API費用と応答速度の両面で重要。

---

> *本計画書は `docs/output/task-hack-system-requirements.md` の詳細要件定義、Phase4完了レポート、およびGemini/o3との設計壁打ちに基づいて策定されました。*
> *作成日: 2026-04-17*
