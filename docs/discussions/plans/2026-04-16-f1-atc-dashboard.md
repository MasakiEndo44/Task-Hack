# F1: ATC型ダッシュボード Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ADHD向けタスク管理アプリ Task-Hack の F1 ATC型ダッシュボード（4ゾーン表示、フライトストリップカード、ドラッグ＆ドロップ、タイムライン、ステータスバー、リアルタイム時計）を構築する。

**Architecture:** Electron + Vite + React + TypeScript でデスクトップアプリを構築。UIはVanilla CSS (CSS Modules) でATCダークテーマを実現。ドラッグ＆ドロップは `@dnd-kit/core` を使用。データモデルはReactの `useState` + `useReducer` でローカル管理（永続化は Phase 2 で実装）。1画面構成で、上部にステータスバー＋時計＋タイムライン、中央に4ゾーンを配置。

**Tech Stack:**
- Electron + electron-vite (デスクトップ基盤)
- React 18 + TypeScript 5 (UIフレームワーク)
- Vanilla CSS with CSS Modules (スタイリング)
- @dnd-kit/core + @dnd-kit/sortable (ドラッグ＆ドロップ)
- Vitest + React Testing Library (テスト)
- Google Fonts: JetBrains Mono (デジタル時計), Inter (UI全般)

---

## File Structure

```
Task_Hack/
├── electron.vite.config.ts              # electron-vite 設定
├── package.json                          # 依存関係・スクリプト
├── tsconfig.json                         # TypeScript設定
├── tsconfig.node.json                    # Node用TypeScript設定
├── tsconfig.web.json                     # Web用TypeScript設定
├── vitest.config.ts                      # Vitest設定
├── src/
│   ├── main/
│   │   └── index.ts                      # Electronメインプロセス
│   ├── preload/
│   │   └── index.ts                      # プリロードスクリプト
│   └── renderer/
│       ├── index.html                    # HTMLエントリーポイント
│       ├── main.tsx                      # Reactエントリーポイント
│       ├── App.tsx                       # ルートコンポーネント
│       ├── App.module.css                # Appレイアウト
│       ├── styles/
│       │   ├── global.css                # グローバルスタイル・CSS変数・リセット
│       │   └── fonts.css                 # フォント定義
│       ├── types/
│       │   └── task.ts                   # タスクデータ型定義
│       ├── hooks/
│       │   ├── useTaskReducer.ts         # タスク状態管理reducer
│       │   └── useClock.ts              # リアルタイム時計hook
│       ├── components/
│       │   ├── StatusBar/
│       │   │   ├── StatusBar.tsx          # ステータスバーコンポーネント
│       │   │   └── StatusBar.module.css
│       │   ├── Clock/
│       │   │   ├── Clock.tsx             # デジタル時計コンポーネント
│       │   │   └── Clock.module.css
│       │   ├── Timeline/
│       │   │   ├── Timeline.tsx          # タイムラインコンポーネント
│       │   │   └── Timeline.module.css
│       │   ├── FlightStrip/
│       │   │   ├── FlightStrip.tsx       # フライトストリップカード
│       │   │   └── FlightStrip.module.css
│       │   ├── Zone/
│       │   │   ├── Zone.tsx              # ゾーンコンテナ
│       │   │   └── Zone.module.css
│       │   └── Dashboard/
│       │       ├── Dashboard.tsx         # ダッシュボード（4ゾーン管理）
│       │       └── Dashboard.module.css
│       └── utils/
│           └── flightId.ts              # フライトID生成ユーティリティ
├── tests/
│   ├── types/
│   │   └── task.test.ts                  # タスク型テスト
│   ├── hooks/
│   │   ├── useTaskReducer.test.ts        # タスクreducerテスト
│   │   └── useClock.test.ts             # 時計hookテスト
│   ├── components/
│   │   ├── StatusBar.test.tsx            # ステータスバーテスト
│   │   ├── Clock.test.tsx               # 時計テスト
│   │   ├── Timeline.test.tsx            # タイムラインテスト
│   │   ├── FlightStrip.test.tsx         # フライトストリップテスト
│   │   ├── Zone.test.tsx                # ゾーンテスト
│   │   └── Dashboard.test.tsx           # ダッシュボードテスト
│   └── utils/
│       └── flightId.test.ts             # フライトID生成テスト
└── docs/
    └── superpowers/
        └── plans/
            └── 2026-04-16-f1-atc-dashboard.md  # このファイル
```

---

## Task 1: プロジェクトスキャフォルディング

**Files:**
- Create: `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `src/main/index.ts`, `src/preload/index.ts`
- Create: `src/renderer/index.html`, `src/renderer/main.tsx`
- Create: `vitest.config.ts`

- [ ] **Step 1: electron-vite でプロジェクトを初期化**

```bash
cd /Users/masaki/Documents/Projects/Task_Hack
npx -y create-electron-vite@latest . -- --template react-ts
```

もし対話モードを求められる場合は、プロジェクト名 `task-hack`、テンプレート `react-ts` を選択。

- [ ] **Step 2: 追加依存関係をインストール**

```bash
cd /Users/masaki/Documents/Projects/Task_Hack
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node
```

- [ ] **Step 3: vitest.config.ts を作成**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped'
      }
    }
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer')
    }
  }
})
```

- [ ] **Step 4: テストセットアップファイルを作成**

```typescript
// tests/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: アプリが起動することを確認**

```bash
cd /Users/masaki/Documents/Projects/Task_Hack
npm run dev
```

Expected: Electronウィンドウが表示される。表示内容はデフォルトテンプレート。

- [ ] **Step 6: テストが動くことを確認**

ダミーテストを作成して Vitest が動作することを検証:

```typescript
// tests/smoke.test.ts
import { describe, it, expect } from 'vitest'

describe('smoke test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2)
  })
})
```

```bash
cd /Users/masaki/Documents/Projects/Task_Hack
npx vitest run
```

Expected: `1 passed`

- [ ] **Step 7: コミット**

```bash
cd /Users/masaki/Documents/Projects/Task_Hack
git add -A
git commit -m "chore: scaffold Electron + Vite + React + TypeScript project with test setup"
```

---

## Task 2: デザインシステム（CSS変数・グローバルスタイル）

**Files:**
- Create: `src/renderer/styles/global.css`
- Create: `src/renderer/styles/fonts.css`
- Modify: `src/renderer/index.html` (フォント読み込み追加)

- [ ] **Step 1: フォント定義ファイルを作成**

```css
/* src/renderer/styles/fonts.css */

/* JetBrains Mono — デジタル時計・フライトID用 */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

/* Inter — UI全般 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

- [ ] **Step 2: グローバルスタイル・CSS変数を作成**

```css
/* src/renderer/styles/global.css */
@import './fonts.css';

:root {
  /* === ATCダークテーマ カラーパレット === */
  
  /* 背景色 */
  --bg-primary: #0a0e17;        /* メイン背景（レーダースクリーン深色） */
  --bg-secondary: #111827;      /* ゾーン背景 */
  --bg-surface: #1a2332;        /* カード・パネル背景 */
  --bg-elevated: #243044;       /* ホバー・アクティブ状態 */

  /* テキスト色 */
  --text-primary: #e8edf5;      /* メインテキスト */
  --text-secondary: #8b9dc3;    /* サブテキスト */
  --text-muted: #4a5d80;        /* 非活性テキスト */

  /* ATCゾーンカラー */
  --zone-active: #ff3b3b;       /* ACTIVE — 赤（警戒色） */
  --zone-active-glow: rgba(255, 59, 59, 0.3);
  --zone-next: #fbbf24;         /* NEXT ACTION — 琥珀色 */
  --zone-next-glow: rgba(251, 191, 36, 0.2);
  --zone-holding: #3b82f6;      /* HOLDING — 青 */
  --zone-holding-glow: rgba(59, 130, 246, 0.15);
  --zone-cleared: #10b981;      /* CLEARED — 緑 */
  --zone-cleared-glow: rgba(16, 185, 129, 0.15);

  /* 優先度カラー */
  --priority-urgent: #ff3b3b;   /* URG — 赤 */
  --priority-normal: #3b82f6;   /* NRM — 青 */

  /* スキャンライン・グロー効果 */
  --glow-green: rgba(16, 185, 129, 0.4);
  --glow-amber: rgba(251, 191, 36, 0.4);
  --sweep-line: rgba(16, 185, 129, 0.8);

  /* ボーダー */
  --border-default: #1e2d42;
  --border-active: #ff3b3b;
  --border-hover: #3b82f6;

  /* フォント */
  --font-mono: 'JetBrains Mono', monospace;
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  /* サイズ */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* スペーシング */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* トランジション */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 400ms ease;

  /* Z-index */
  --z-timeline: 10;
  --z-status-bar: 20;
  --z-drag-overlay: 100;
  --z-modal: 200;
}

/* === リセット === */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: var(--font-ui);
  font-size: 14px;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ATCスキャンライン効果（背景） */
body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(16, 185, 129, 0.015) 2px,
    rgba(16, 185, 129, 0.015) 4px
  );
  z-index: 9999;
}

/* スクロールバーのスタイル */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* フォーカスリング */
:focus-visible {
  outline: 2px solid var(--zone-next);
  outline-offset: 2px;
}

/* セレクション */
::selection {
  background-color: rgba(59, 130, 246, 0.3);
  color: var(--text-primary);
}
```

- [ ] **Step 3: index.html にフォントのpreconnectを追加**

`src/renderer/index.html` の `<head>` 内に以下を追加:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<title>Task-Hack — ATC Task Manager</title>
<meta name="description" content="ADHD-focused task management inspired by Air Traffic Control">
```

- [ ] **Step 4: main.tsx から global.css をインポート**

```typescript
// src/renderer/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 5: 表示を確認**

```bash
cd /Users/masaki/Documents/Projects/Task_Hack
npm run dev
```

Expected: ダークテーマの背景にスキャンラインが表示される。フォントが読み込まれている。

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "feat: add ATC dark theme design system with CSS variables and fonts"
```

---

## Task 3: タスクデータ型定義とフライトID生成

**Files:**
- Create: `src/renderer/types/task.ts`
- Create: `src/renderer/utils/flightId.ts`
- Test: `tests/types/task.test.ts`, `tests/utils/flightId.test.ts`

- [ ] **Step 1: フライトID生成のfailing testを作成**

```typescript
// tests/utils/flightId.test.ts
import { describe, it, expect } from 'vitest'
import { generateFlightId } from '@renderer/utils/flightId'

describe('generateFlightId', () => {
  it('should return a string in format FS + 4 digits', () => {
    const id = generateFlightId()
    expect(id).toMatch(/^FS\d{4}$/)
  })

  it('should generate unique IDs across multiple calls', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateFlightId())
    }
    // 100回の生成で少なくとも90種類以上のユニークIDが出ることを確認
    expect(ids.size).toBeGreaterThan(90)
  })

  it('should not generate IDs that collide with existing IDs', () => {
    const existingIds = ['FS1234', 'FS5678']
    const newId = generateFlightId(existingIds)
    expect(existingIds).not.toContain(newId)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run tests/utils/flightId.test.ts
```

Expected: FAIL — `generateFlightId` が見つからない

- [ ] **Step 3: フライトID生成の最小実装**

```typescript
// src/renderer/utils/flightId.ts

/**
 * ATCフライトストリップ風のフライトIDを生成する。
 * 形式: "FS" + 4桁の数字 (例: FS1234, FS0042)
 * 
 * @param existingIds - 衝突を避けるための既存IDリスト
 * @returns 一意のフライトID文字列
 */
export function generateFlightId(existingIds: string[] = []): string {
  const existingSet = new Set(existingIds)
  let id: string

  do {
    const num = Math.floor(Math.random() * 10000)
    id = `FS${num.toString().padStart(4, '0')}`
  } while (existingSet.has(id))

  return id
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx vitest run tests/utils/flightId.test.ts
```

Expected: 3 passed

- [ ] **Step 5: タスク型定義のfailing testを作成**

```typescript
// tests/types/task.test.ts
import { describe, it, expect } from 'vitest'
import type { Task, ZoneType, Priority } from '@renderer/types/task'
import { ZONE_LIMITS, isZoneFull } from '@renderer/types/task'

describe('Task type system', () => {
  it('should define all four zone types', () => {
    const zones: ZoneType[] = ['ACTIVE', 'NEXT_ACTION', 'HOLDING', 'CLEARED']
    expect(zones).toHaveLength(4)
  })

  it('should define priority levels', () => {
    const priorities: Priority[] = ['NRM', 'URG']
    expect(priorities).toHaveLength(2)
  })

  it('should enforce ACTIVE zone limit of 1', () => {
    expect(ZONE_LIMITS.ACTIVE).toBe(1)
  })

  it('should enforce NEXT_ACTION zone limit of 5', () => {
    expect(ZONE_LIMITS.NEXT_ACTION).toBe(5)
  })

  it('should have no limit for HOLDING', () => {
    expect(ZONE_LIMITS.HOLDING).toBe(Infinity)
  })

  it('should have no limit for CLEARED', () => {
    expect(ZONE_LIMITS.CLEARED).toBe(Infinity)
  })

  it('isZoneFull returns true when zone is at capacity', () => {
    expect(isZoneFull('ACTIVE', 1)).toBe(true)
    expect(isZoneFull('NEXT_ACTION', 5)).toBe(true)
  })

  it('isZoneFull returns false when zone has capacity', () => {
    expect(isZoneFull('ACTIVE', 0)).toBe(false)
    expect(isZoneFull('NEXT_ACTION', 3)).toBe(false)
    expect(isZoneFull('HOLDING', 100)).toBe(false)
    expect(isZoneFull('CLEARED', 100)).toBe(false)
  })
})
```

- [ ] **Step 6: テストが失敗することを確認**

```bash
npx vitest run tests/types/task.test.ts
```

Expected: FAIL — モジュールが見つからない

- [ ] **Step 7: タスク型定義の最小実装**

```typescript
// src/renderer/types/task.ts

/** タスクが所属するゾーン */
export type ZoneType = 'ACTIVE' | 'NEXT_ACTION' | 'HOLDING' | 'CLEARED'

/** タスクの優先度 */
export type Priority = 'NRM' | 'URG'

/** タスクのカテゴリ（AIが自律形成するが、初期はstring） */
export type Category = string

/** ゾーンごとのタスク上限数 */
export const ZONE_LIMITS: Record<ZoneType, number> = {
  ACTIVE: 1,
  NEXT_ACTION: 5,
  HOLDING: Infinity,
  CLEARED: Infinity
}

/**
 * ゾーンがタスク上限に達しているかを判定する。
 */
export function isZoneFull(zone: ZoneType, currentCount: number): boolean {
  return currentCount >= ZONE_LIMITS[zone]
}

/** タスクデータ */
export interface Task {
  /** フライトID (FS + 4桁数字) */
  id: string

  /** タスクタイトル */
  title: string

  /** タスク詳細（任意） */
  description?: string

  /** 所属ゾーン */
  zone: ZoneType

  /** 優先度 */
  priority: Priority

  /** カテゴリ（任意） */
  category?: Category

  /** 予定開始時刻（ISO 8601文字列、任意） */
  scheduledStart?: string

  /** 予定終了時刻（ISO 8601文字列、任意） */
  scheduledEnd?: string

  /** 作成日時（ISO 8601文字列） */
  createdAt: string

  /** 完了日時（ISO 8601文字列、任意） */
  completedAt?: string

  /** ゾーン内の表示順序 */
  order: number
}

/** タスク作成時の入力（idとcreatedAtは自動生成） */
export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'order'>
```

- [ ] **Step 8: テストがパスすることを確認**

```bash
npx vitest run tests/types/task.test.ts
```

Expected: 8 passed

- [ ] **Step 9: コミット**

```bash
git add -A
git commit -m "feat: add Task type definitions, zone limits, and flight ID generator"
```

---

## Task 4: タスク状態管理 (useTaskReducer)

**Files:**
- Create: `src/renderer/hooks/useTaskReducer.ts`
- Test: `tests/hooks/useTaskReducer.test.ts`

- [ ] **Step 1: useTaskReducer のfailing testを作成**

```typescript
// tests/hooks/useTaskReducer.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTaskReducer } from '@renderer/hooks/useTaskReducer'
import type { Task, ZoneType } from '@renderer/types/task'

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'FS0001',
    title: 'Test Task',
    zone: 'HOLDING' as ZoneType,
    priority: 'NRM',
    createdAt: new Date().toISOString(),
    order: 0,
    ...overrides
  }
}

describe('useTaskReducer', () => {
  it('should initialize with empty tasks', () => {
    const { result } = renderHook(() => useTaskReducer())
    expect(result.current.tasks).toEqual([])
  })

  it('should initialize with provided tasks', () => {
    const initial = [createMockTask()]
    const { result } = renderHook(() => useTaskReducer(initial))
    expect(result.current.tasks).toHaveLength(1)
  })

  it('should add a task', () => {
    const { result } = renderHook(() => useTaskReducer())
    act(() => {
      result.current.dispatch({
        type: 'ADD_TASK',
        payload: {
          title: 'New Task',
          zone: 'HOLDING',
          priority: 'NRM'
        }
      })
    })
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('New Task')
    expect(result.current.tasks[0].id).toMatch(/^FS\d{4}$/)
    expect(result.current.tasks[0].createdAt).toBeDefined()
  })

  it('should move a task between zones', () => {
    const task = createMockTask({ zone: 'HOLDING' })
    const { result } = renderHook(() => useTaskReducer([task]))
    act(() => {
      result.current.dispatch({
        type: 'MOVE_TASK',
        payload: { taskId: 'FS0001', toZone: 'NEXT_ACTION', toIndex: 0 }
      })
    })
    expect(result.current.tasks[0].zone).toBe('NEXT_ACTION')
  })

  it('should NOT move task to ACTIVE if zone is full', () => {
    const activeTask = createMockTask({ id: 'FS0001', zone: 'ACTIVE' })
    const holdingTask = createMockTask({ id: 'FS0002', zone: 'HOLDING' })
    const { result } = renderHook(() => useTaskReducer([activeTask, holdingTask]))
    act(() => {
      result.current.dispatch({
        type: 'MOVE_TASK',
        payload: { taskId: 'FS0002', toZone: 'ACTIVE', toIndex: 0 }
      })
    })
    // holdingTask should still be in HOLDING
    const movedTask = result.current.tasks.find(t => t.id === 'FS0002')
    expect(movedTask?.zone).toBe('HOLDING')
  })

  it('should NOT move task to NEXT_ACTION if zone is full (5 tasks)', () => {
    const nextTasks = Array.from({ length: 5 }, (_, i) =>
      createMockTask({ id: `FS000${i}`, zone: 'NEXT_ACTION', order: i })
    )
    const holdingTask = createMockTask({ id: 'FS0099', zone: 'HOLDING' })
    const { result } = renderHook(() => useTaskReducer([...nextTasks, holdingTask]))
    act(() => {
      result.current.dispatch({
        type: 'MOVE_TASK',
        payload: { taskId: 'FS0099', toZone: 'NEXT_ACTION', toIndex: 0 }
      })
    })
    const movedTask = result.current.tasks.find(t => t.id === 'FS0099')
    expect(movedTask?.zone).toBe('HOLDING')
  })

  it('should complete a task (move to CLEARED)', () => {
    const task = createMockTask({ zone: 'ACTIVE' })
    const { result } = renderHook(() => useTaskReducer([task]))
    act(() => {
      result.current.dispatch({
        type: 'COMPLETE_TASK',
        payload: { taskId: 'FS0001' }
      })
    })
    expect(result.current.tasks[0].zone).toBe('CLEARED')
    expect(result.current.tasks[0].completedAt).toBeDefined()
  })

  it('should return tasks grouped by zone via getTasksByZone', () => {
    const tasks = [
      createMockTask({ id: 'FS0001', zone: 'ACTIVE' }),
      createMockTask({ id: 'FS0002', zone: 'NEXT_ACTION' }),
      createMockTask({ id: 'FS0003', zone: 'NEXT_ACTION' }),
      createMockTask({ id: 'FS0004', zone: 'HOLDING' }),
      createMockTask({ id: 'FS0005', zone: 'CLEARED' })
    ]
    const { result } = renderHook(() => useTaskReducer(tasks))
    const grouped = result.current.getTasksByZone()
    expect(grouped.ACTIVE).toHaveLength(1)
    expect(grouped.NEXT_ACTION).toHaveLength(2)
    expect(grouped.HOLDING).toHaveLength(1)
    expect(grouped.CLEARED).toHaveLength(1)
  })

  it('should return zone counts via getZoneCounts', () => {
    const tasks = [
      createMockTask({ id: 'FS0001', zone: 'ACTIVE', priority: 'URG' }),
      createMockTask({ id: 'FS0002', zone: 'NEXT_ACTION', priority: 'NRM' }),
      createMockTask({ id: 'FS0003', zone: 'NEXT_ACTION', priority: 'URG' }),
      createMockTask({ id: 'FS0004', zone: 'HOLDING', priority: 'NRM' })
    ]
    const { result } = renderHook(() => useTaskReducer(tasks))
    const counts = result.current.getZoneCounts()
    expect(counts.ACTIVE).toEqual({ total: 1, urgent: 1 })
    expect(counts.NEXT_ACTION).toEqual({ total: 2, urgent: 1 })
    expect(counts.HOLDING).toEqual({ total: 1, urgent: 0 })
    expect(counts.CLEARED).toEqual({ total: 0, urgent: 0 })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run tests/hooks/useTaskReducer.test.ts
```

Expected: FAIL — `useTaskReducer` が見つからない

- [ ] **Step 3: useTaskReducer の最小実装**

```typescript
// src/renderer/hooks/useTaskReducer.ts
import { useReducer, useCallback } from 'react'
import type { Task, ZoneType, TaskInput } from '../types/task'
import { isZoneFull } from '../types/task'
import { generateFlightId } from '../utils/flightId'

// --- Action Types ---

type TaskAction =
  | { type: 'ADD_TASK'; payload: TaskInput }
  | { type: 'MOVE_TASK'; payload: { taskId: string; toZone: ZoneType; toIndex: number } }
  | { type: 'COMPLETE_TASK'; payload: { taskId: string } }
  | { type: 'UPDATE_TASK'; payload: { taskId: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: { taskId: string } }

// --- Reducer ---

function taskReducer(state: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case 'ADD_TASK': {
      const existingIds = state.map(t => t.id)
      const newTask: Task = {
        ...action.payload,
        id: generateFlightId(existingIds),
        createdAt: new Date().toISOString(),
        order: state.filter(t => t.zone === action.payload.zone).length
      }
      return [...state, newTask]
    }

    case 'MOVE_TASK': {
      const { taskId, toZone, toIndex } = action.payload
      const task = state.find(t => t.id === taskId)
      if (!task) return state

      // 同じゾーンへの移動は順序の変更のみ
      if (task.zone === toZone) {
        const zoneTasks = state
          .filter(t => t.zone === toZone && t.id !== taskId)
          .sort((a, b) => a.order - b.order)
        zoneTasks.splice(toIndex, 0, task)
        const reordered = zoneTasks.map((t, i) => ({ ...t, order: i }))
        return state.map(t => {
          const updated = reordered.find(r => r.id === t.id)
          return updated || t
        })
      }

      // 上限チェック
      const targetCount = state.filter(t => t.zone === toZone).length
      if (isZoneFull(toZone, targetCount)) {
        return state // 移動を拒否
      }

      return state.map(t =>
        t.id === taskId
          ? { ...t, zone: toZone, order: toIndex }
          : t
      )
    }

    case 'COMPLETE_TASK': {
      const { taskId } = action.payload
      return state.map(t =>
        t.id === taskId
          ? {
              ...t,
              zone: 'CLEARED' as ZoneType,
              completedAt: new Date().toISOString(),
              order: state.filter(tk => tk.zone === 'CLEARED').length
            }
          : t
      )
    }

    case 'UPDATE_TASK': {
      const { taskId, updates } = action.payload
      return state.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    }

    case 'DELETE_TASK': {
      return state.filter(t => t.id !== action.payload.taskId)
    }

    default:
      return state
  }
}

// --- Hook ---

export function useTaskReducer(initialTasks: Task[] = []) {
  const [tasks, dispatch] = useReducer(taskReducer, initialTasks)

  const getTasksByZone = useCallback(() => {
    const grouped: Record<ZoneType, Task[]> = {
      ACTIVE: [],
      NEXT_ACTION: [],
      HOLDING: [],
      CLEARED: []
    }
    for (const task of tasks) {
      grouped[task.zone].push(task)
    }
    // 各ゾーン内でorderでソート
    for (const zone of Object.keys(grouped) as ZoneType[]) {
      grouped[zone].sort((a, b) => a.order - b.order)
    }
    return grouped
  }, [tasks])

  const getZoneCounts = useCallback(() => {
    const counts: Record<ZoneType, { total: number; urgent: number }> = {
      ACTIVE: { total: 0, urgent: 0 },
      NEXT_ACTION: { total: 0, urgent: 0 },
      HOLDING: { total: 0, urgent: 0 },
      CLEARED: { total: 0, urgent: 0 }
    }
    for (const task of tasks) {
      counts[task.zone].total++
      if (task.priority === 'URG') {
        counts[task.zone].urgent++
      }
    }
    return counts
  }, [tasks])

  return { tasks, dispatch, getTasksByZone, getZoneCounts }
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx vitest run tests/hooks/useTaskReducer.test.ts
```

Expected: 9 passed

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: add useTaskReducer hook with zone limits enforcement"
```

---

## Task 5: リアルタイム時計 (F1.6) — useClock + Clockコンポーネント

**Files:**
- Create: `src/renderer/hooks/useClock.ts`
- Create: `src/renderer/components/Clock/Clock.tsx`
- Create: `src/renderer/components/Clock/Clock.module.css`
- Test: `tests/hooks/useClock.test.ts`, `tests/components/Clock.test.tsx`

- [ ] **Step 1: useClock のfailing testを作成**

```typescript
// tests/hooks/useClock.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClock } from '@renderer/hooks/useClock'

describe('useClock', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return current time as formatted string (HH:MM:SS)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T14:30:45'))
    const { result } = renderHook(() => useClock())
    expect(result.current.timeString).toBe('14:30:45')
  })

  it('should return current Date object', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T14:30:45'))
    const { result } = renderHook(() => useClock())
    expect(result.current.now).toBeInstanceOf(Date)
  })

  it('should update every second', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T14:30:45'))
    const { result } = renderHook(() => useClock())
    expect(result.current.timeString).toBe('14:30:45')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.timeString).toBe('14:30:46')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run tests/hooks/useClock.test.ts
```

Expected: FAIL — `useClock` が見つからない

- [ ] **Step 3: useClock の最小実装**

```typescript
// src/renderer/hooks/useClock.ts
import { useState, useEffect } from 'react'

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export function useClock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return {
    now,
    timeString: formatTime(now)
  }
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx vitest run tests/hooks/useClock.test.ts
```

Expected: 3 passed

- [ ] **Step 5: Clock コンポーネントのfailing testを作成**

```tsx
// tests/components/Clock.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Clock } from '@renderer/components/Clock/Clock'

describe('Clock', () => {
  it('should render time in digital clock format', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T14:30:45'))
    render(<Clock />)
    expect(screen.getByText('14:30:45')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('should have role="timer" for accessibility', () => {
    render(<Clock />)
    expect(screen.getByRole('timer')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: テストが失敗することを確認**

```bash
npx vitest run tests/components/Clock.test.tsx
```

Expected: FAIL — `Clock` コンポーネントが見つからない

- [ ] **Step 7: Clock コンポーネントの最小実装**

```tsx
// src/renderer/components/Clock/Clock.tsx
import { useClock } from '../../hooks/useClock'
import styles from './Clock.module.css'

export function Clock() {
  const { timeString } = useClock()

  return (
    <div className={styles.clock} role="timer" aria-label="現在時刻">
      <span className={styles.time}>{timeString}</span>
    </div>
  )
}
```

```css
/* src/renderer/components/Clock/Clock.module.css */
.clock {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-md);
}

.time {
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 700;
  color: var(--glow-green);
  text-shadow:
    0 0 10px var(--glow-green),
    0 0 20px rgba(16, 185, 129, 0.2);
  letter-spacing: 0.1em;
}
```

- [ ] **Step 8: テストがパスすることを確認**

```bash
npx vitest run tests/components/Clock.test.tsx
```

Expected: 2 passed

- [ ] **Step 9: コミット**

```bash
git add -A
git commit -m "feat: add real-time digital clock component (F1.6)"
```

---

## Task 6: ステータスバー (F1.5)

**Files:**
- Create: `src/renderer/components/StatusBar/StatusBar.tsx`
- Create: `src/renderer/components/StatusBar/StatusBar.module.css`
- Test: `tests/components/StatusBar.test.tsx`

- [ ] **Step 1: StatusBar のfailing testを作成**

```tsx
// tests/components/StatusBar.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from '@renderer/components/StatusBar/StatusBar'
import type { ZoneType } from '@renderer/types/task'

const mockCounts: Record<ZoneType, { total: number; urgent: number }> = {
  ACTIVE: { total: 1, urgent: 1 },
  NEXT_ACTION: { total: 3, urgent: 1 },
  HOLDING: { total: 5, urgent: 0 },
  CLEARED: { total: 2, urgent: 0 }
}

describe('StatusBar', () => {
  it('should display zone counts', () => {
    render(<StatusBar zoneCounts={mockCounts} />)
    // ACT: 1, NXT: 3, HLD: 5, CLR: 2
    expect(screen.getByText('ACT')).toBeInTheDocument()
    expect(screen.getByText('NXT')).toBeInTheDocument()
    expect(screen.getByText('HLD')).toBeInTheDocument()
    expect(screen.getByText('CLR')).toBeInTheDocument()
  })

  it('should display total count for each zone', () => {
    render(<StatusBar zoneCounts={mockCounts} />)
    // 各ゾーンのカウント表示を検証（data-testidで取得）
    expect(screen.getByTestId('count-ACTIVE')).toHaveTextContent('1')
    expect(screen.getByTestId('count-NEXT_ACTION')).toHaveTextContent('3')
    expect(screen.getByTestId('count-HOLDING')).toHaveTextContent('5')
    expect(screen.getByTestId('count-CLEARED')).toHaveTextContent('2')
  })

  it('should display total urgent count', () => {
    render(<StatusBar zoneCounts={mockCounts} />)
    // URGのトータル = 1 + 1 = 2
    expect(screen.getByTestId('count-urgent')).toHaveTextContent('2')
  })

  it('should have aria-label for accessibility', () => {
    render(<StatusBar zoneCounts={mockCounts} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run tests/components/StatusBar.test.tsx
```

Expected: FAIL — `StatusBar` が見つからない

- [ ] **Step 3: StatusBar の最小実装**

```tsx
// src/renderer/components/StatusBar/StatusBar.tsx
import type { ZoneType } from '../../types/task'
import styles from './StatusBar.module.css'

interface StatusBarProps {
  zoneCounts: Record<ZoneType, { total: number; urgent: number }>
}

const ZONE_LABELS: { zone: ZoneType; label: string; cssVar: string }[] = [
  { zone: 'ACTIVE', label: 'ACT', cssVar: '--zone-active' },
  { zone: 'NEXT_ACTION', label: 'NXT', cssVar: '--zone-next' },
  { zone: 'HOLDING', label: 'HLD', cssVar: '--zone-holding' },
  { zone: 'CLEARED', label: 'CLR', cssVar: '--zone-cleared' }
]

export function StatusBar({ zoneCounts }: StatusBarProps) {
  const totalUrgent = Object.values(zoneCounts).reduce(
    (sum, c) => sum + c.urgent,
    0
  )

  return (
    <div className={styles.statusBar} role="status" aria-label="タスクステータス">
      <div className={styles.zones}>
        {ZONE_LABELS.map(({ zone, label, cssVar }) => (
          <div
            key={zone}
            className={styles.zoneIndicator}
            style={{ '--indicator-color': `var(${cssVar})` } as React.CSSProperties}
          >
            <span className={styles.zoneLabel}>{label}</span>
            <span className={styles.zoneCount} data-testid={`count-${zone}`}>
              {zoneCounts[zone].total}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.urgentIndicator}>
        <span className={styles.urgentLabel}>URG</span>
        <span className={styles.urgentCount} data-testid="count-urgent">
          {totalUrgent}
        </span>
      </div>
    </div>
  )
}
```

```css
/* src/renderer/components/StatusBar/StatusBar.module.css */
.statusBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) var(--space-md);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-default);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  z-index: var(--z-status-bar);
}

.zones {
  display: flex;
  gap: var(--space-md);
}

.zoneIndicator {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.zoneLabel {
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
}

.zoneCount {
  color: var(--indicator-color);
  font-weight: 700;
  font-size: 0.85rem;
  text-shadow: 0 0 8px var(--indicator-color);
  min-width: 1.2em;
  text-align: center;
}

.urgentIndicator {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 2px var(--space-sm);
  background: rgba(255, 59, 59, 0.1);
  border: 1px solid rgba(255, 59, 59, 0.3);
  border-radius: var(--radius-sm);
}

.urgentLabel {
  color: var(--priority-urgent);
  font-weight: 600;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
}

.urgentCount {
  color: var(--priority-urgent);
  font-weight: 700;
  font-size: 0.85rem;
  text-shadow: 0 0 8px rgba(255, 59, 59, 0.5);
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx vitest run tests/components/StatusBar.test.tsx
```

Expected: 4 passed

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: add StatusBar component with zone counts and urgent indicator (F1.5)"
```

---

## Task 7: フライトストリップカード (F1.2)

**Files:**
- Create: `src/renderer/components/FlightStrip/FlightStrip.tsx`
- Create: `src/renderer/components/FlightStrip/FlightStrip.module.css`
- Test: `tests/components/FlightStrip.test.tsx`

- [ ] **Step 1: FlightStrip のfailing testを作成**

```tsx
// tests/components/FlightStrip.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlightStrip } from '@renderer/components/FlightStrip/FlightStrip'
import type { Task } from '@renderer/types/task'

const mockTask: Task = {
  id: 'FS1234',
  title: 'メールチェックと重要メールリスト化',
  zone: 'NEXT_ACTION',
  priority: 'NRM',
  category: 'daily',
  scheduledStart: '2026-04-16T09:00:00',
  createdAt: '2026-04-16T08:00:00',
  order: 0
}

describe('FlightStrip', () => {
  it('should display flight ID', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('FS1234')).toBeInTheDocument()
  })

  it('should display task title', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('メールチェックと重要メールリスト化')).toBeInTheDocument()
  })

  it('should display priority badge', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('NRM')).toBeInTheDocument()
  })

  it('should display URG priority badge with urgent styling', () => {
    const urgentTask = { ...mockTask, priority: 'URG' as const }
    render(<FlightStrip task={urgentTask} onComplete={vi.fn()} />)
    expect(screen.getByText('URG')).toBeInTheDocument()
  })

  it('should display scheduled time if present', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('09:00')).toBeInTheDocument()
  })

  it('should display category if present', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('daily')).toBeInTheDocument()
  })

  it('should call onComplete when complete button is clicked', () => {
    const onComplete = vi.fn()
    render(<FlightStrip task={mockTask} onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /完了/i }))
    expect(onComplete).toHaveBeenCalledWith('FS1234')
  })

  it('should have the correct data-testid', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByTestId('flight-strip-FS1234')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run tests/components/FlightStrip.test.tsx
```

Expected: FAIL — `FlightStrip` が見つからない

- [ ] **Step 3: FlightStrip の最小実装**

```tsx
// src/renderer/components/FlightStrip/FlightStrip.tsx
import type { Task } from '../../types/task'
import styles from './FlightStrip.module.css'

interface FlightStripProps {
  task: Task
  onComplete: (taskId: string) => void
  isDragging?: boolean
}

function formatScheduledTime(iso?: string): string | null {
  if (!iso) return null
  const date = new Date(iso)
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function FlightStrip({ task, onComplete, isDragging = false }: FlightStripProps) {
  const scheduledTime = formatScheduledTime(task.scheduledStart)
  const isUrgent = task.priority === 'URG'

  return (
    <div
      className={`${styles.strip} ${styles[task.zone.toLowerCase()]} ${isDragging ? styles.dragging : ''}`}
      data-testid={`flight-strip-${task.id}`}
    >
      {/* 左: フライトID */}
      <div className={styles.idSection}>
        <span className={styles.flightId}>{task.id}</span>
        {scheduledTime && (
          <span className={styles.time}>{scheduledTime}</span>
        )}
      </div>

      {/* 中央: タイトル + カテゴリ */}
      <div className={styles.infoSection}>
        <span className={styles.title}>{task.title}</span>
        {task.category && (
          <span className={styles.category}>{task.category}</span>
        )}
      </div>

      {/* 右: 優先度バッジ + 完了ボタン */}
      <div className={styles.actionSection}>
        <span className={`${styles.priorityBadge} ${isUrgent ? styles.urgent : styles.normal}`}>
          {task.priority}
        </span>
        <button
          className={styles.completeButton}
          onClick={() => onComplete(task.id)}
          aria-label="完了"
          title="タスクを完了する"
        >
          ✓
        </button>
      </div>
    </div>
  )
}
```

```css
/* src/renderer/components/FlightStrip/FlightStrip.module.css */
.strip {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-left: 3px solid var(--border-default);
  border-radius: var(--radius-md);
  cursor: grab;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
  user-select: none;
}

.strip:hover {
  background: var(--bg-elevated);
  border-color: var(--border-hover);
}

/* ゾーン別のアクセントカラー */
.active {
  border-left-color: var(--zone-active);
  box-shadow: inset 0 0 20px var(--zone-active-glow);
}

.next_action {
  border-left-color: var(--zone-next);
}

.holding {
  border-left-color: var(--zone-holding);
  opacity: 0.85;
}

.cleared {
  border-left-color: var(--zone-cleared);
  opacity: 0.6;
}

.dragging {
  opacity: 0.5;
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  cursor: grabbing;
}

/* フライトIDセクション */
.idSection {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 64px;
}

.flightId {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.time {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-muted);
}

/* タスク情報セクション */
.infoSection {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* アクションセクション */
.actionSection {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.priorityBadge {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  letter-spacing: 0.1em;
}

.urgent {
  background: rgba(255, 59, 59, 0.2);
  color: var(--priority-urgent);
  border: 1px solid rgba(255, 59, 59, 0.4);
  animation: urgentPulse 2s ease-in-out infinite;
}

.normal {
  background: rgba(59, 130, 246, 0.15);
  color: var(--priority-normal);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

@keyframes urgentPulse {
  0%, 100% { box-shadow: 0 0 4px rgba(255, 59, 59, 0.3); }
  50% { box-shadow: 0 0 12px rgba(255, 59, 59, 0.6); }
}

.completeButton {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-default);
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.8rem;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.completeButton:hover {
  color: var(--zone-cleared);
  border-color: var(--zone-cleared);
  background: rgba(16, 185, 129, 0.1);
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx vitest run tests/components/FlightStrip.test.tsx
```

Expected: 8 passed

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: add FlightStrip card component with ATC styling (F1.2)"
```

---

## Task 8: ゾーンコンテナ + ドラッグ＆ドロップ (F1.1, F1.3)

**Files:**
- Create: `src/renderer/components/Zone/Zone.tsx`
- Create: `src/renderer/components/Zone/Zone.module.css`
- Create: `src/renderer/components/Dashboard/Dashboard.tsx`
- Create: `src/renderer/components/Dashboard/Dashboard.module.css`
- Test: `tests/components/Zone.test.tsx`, `tests/components/Dashboard.test.tsx`

- [ ] **Step 1: Zone コンポーネントのfailing testを作成**

```tsx
// tests/components/Zone.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Zone } from '@renderer/components/Zone/Zone'
import type { Task, ZoneType } from '@renderer/types/task'

const mockTasks: Task[] = [
  {
    id: 'FS0001',
    title: 'Task 1',
    zone: 'NEXT_ACTION',
    priority: 'NRM',
    createdAt: '2026-04-16T08:00:00',
    order: 0
  },
  {
    id: 'FS0002',
    title: 'Task 2',
    zone: 'NEXT_ACTION',
    priority: 'URG',
    createdAt: '2026-04-16T08:01:00',
    order: 1
  }
]

describe('Zone', () => {
  it('should display zone title', () => {
    render(
      <Zone
        zone="NEXT_ACTION"
        title="NEXT ACTION"
        tasks={mockTasks}
        maxTasks={5}
        onComplete={vi.fn()}
      />
    )
    expect(screen.getByText('NEXT ACTION')).toBeInTheDocument()
  })

  it('should display task count with limit', () => {
    render(
      <Zone
        zone="NEXT_ACTION"
        title="NEXT ACTION"
        tasks={mockTasks}
        maxTasks={5}
        onComplete={vi.fn()}
      />
    )
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
  })

  it('should display task count without limit when Infinity', () => {
    render(
      <Zone
        zone="HOLDING"
        title="HOLDING"
        tasks={mockTasks}
        maxTasks={Infinity}
        onComplete={vi.fn()}
      />
    )
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should render flight strips for each task', () => {
    render(
      <Zone
        zone="NEXT_ACTION"
        title="NEXT ACTION"
        tasks={mockTasks}
        maxTasks={5}
        onComplete={vi.fn()}
      />
    )
    expect(screen.getByTestId('flight-strip-FS0001')).toBeInTheDocument()
    expect(screen.getByTestId('flight-strip-FS0002')).toBeInTheDocument()
  })

  it('should show empty state when no tasks', () => {
    render(
      <Zone
        zone="ACTIVE"
        title="ACTIVE"
        tasks={[]}
        maxTasks={1}
        onComplete={vi.fn()}
      />
    )
    expect(screen.getByText(/ドラッグ/i)).toBeInTheDocument()
  })

  it('should have correct data-testid', () => {
    render(
      <Zone
        zone="HOLDING"
        title="HOLDING"
        tasks={[]}
        maxTasks={Infinity}
        onComplete={vi.fn()}
      />
    )
    expect(screen.getByTestId('zone-HOLDING')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run tests/components/Zone.test.tsx
```

Expected: FAIL — `Zone` が見つからない

- [ ] **Step 3: Zone コンポーネントの最小実装**

```tsx
// src/renderer/components/Zone/Zone.tsx
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task, ZoneType } from '../../types/task'
import { FlightStrip } from '../FlightStrip/FlightStrip'
import styles from './Zone.module.css'

interface ZoneProps {
  zone: ZoneType
  title: string
  tasks: Task[]
  maxTasks: number
  onComplete: (taskId: string) => void
}

function SortableFlightStrip({
  task,
  onComplete
}: {
  task: Task
  onComplete: (taskId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <FlightStrip task={task} onComplete={onComplete} isDragging={isDragging} />
    </div>
  )
}

export function Zone({ zone, title, tasks, maxTasks, onComplete }: ZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: zone })
  const isFull = maxTasks !== Infinity && tasks.length >= maxTasks
  const countDisplay = maxTasks === Infinity
    ? `${tasks.length}`
    : `${tasks.length} / ${maxTasks}`

  return (
    <div
      ref={setNodeRef}
      className={`${styles.zone} ${styles[zone.toLowerCase()]} ${isOver ? styles.over : ''} ${isFull ? styles.full : ''}`}
      data-testid={`zone-${zone}`}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.count}>{countDisplay}</span>
      </div>
      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.taskList}>
          {tasks.length === 0 ? (
            <div className={styles.empty}>
              ここにタスクをドラッグして追加
            </div>
          ) : (
            tasks.map(task => (
              <SortableFlightStrip
                key={task.id}
                task={task}
                onComplete={onComplete}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}
```

```css
/* src/renderer/components/Zone/Zone.module.css */
.zone {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
  min-height: 120px;
}

.zone.over {
  border-color: var(--zone-next);
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.2);
}

.zone.full.over {
  border-color: var(--zone-active);
  box-shadow: 0 0 16px rgba(255, 59, 59, 0.2);
}

/* ゾーン別アクセントカラー */
.active {
  border-color: var(--zone-active);
  box-shadow: inset 0 0 30px var(--zone-active-glow);
}

.next_action {
  border-top: 2px solid var(--zone-next);
}

.holding {
  border-top: 2px solid var(--zone-holding);
}

.cleared {
  border-top: 2px solid var(--zone-cleared);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border-default);
  background: rgba(0, 0, 0, 0.2);
}

.title {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.count {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-muted);
}

.taskList {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm);
  flex: 1;
  overflow-y: auto;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-style: italic;
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
  margin: var(--space-sm);
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx vitest run tests/components/Zone.test.tsx
```

Expected: 6 passed

- [ ] **Step 5: Dashboard コンポーネントのfailing testを作成**

```tsx
// tests/components/Dashboard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from '@renderer/components/Dashboard/Dashboard'
import type { Task, ZoneType } from '@renderer/types/task'

const mockTasks: Task[] = [
  {
    id: 'FS0001',
    title: 'Active Task',
    zone: 'ACTIVE',
    priority: 'URG',
    createdAt: '2026-04-16T08:00:00',
    order: 0
  },
  {
    id: 'FS0002',
    title: 'Next Task 1',
    zone: 'NEXT_ACTION',
    priority: 'NRM',
    createdAt: '2026-04-16T08:01:00',
    order: 0
  },
  {
    id: 'FS0003',
    title: 'Holding Task',
    zone: 'HOLDING',
    priority: 'NRM',
    createdAt: '2026-04-16T08:02:00',
    order: 0
  }
]

const mockTasksByZone: Record<ZoneType, Task[]> = {
  ACTIVE: mockTasks.filter(t => t.zone === 'ACTIVE'),
  NEXT_ACTION: mockTasks.filter(t => t.zone === 'NEXT_ACTION'),
  HOLDING: mockTasks.filter(t => t.zone === 'HOLDING'),
  CLEARED: []
}

describe('Dashboard', () => {
  it('should render all four zones', () => {
    render(
      <Dashboard
        tasksByZone={mockTasksByZone}
        onComplete={vi.fn()}
        onMoveTask={vi.fn()}
      />
    )
    expect(screen.getByTestId('zone-ACTIVE')).toBeInTheDocument()
    expect(screen.getByTestId('zone-NEXT_ACTION')).toBeInTheDocument()
    expect(screen.getByTestId('zone-HOLDING')).toBeInTheDocument()
    expect(screen.getByTestId('zone-CLEARED')).toBeInTheDocument()
  })

  it('should display zone titles', () => {
    render(
      <Dashboard
        tasksByZone={mockTasksByZone}
        onComplete={vi.fn()}
        onMoveTask={vi.fn()}
      />
    )
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    expect(screen.getByText('NEXT ACTION')).toBeInTheDocument()
    expect(screen.getByText('HOLDING')).toBeInTheDocument()
    expect(screen.getByText('CLEARED')).toBeInTheDocument()
  })

  it('should render flight strips in correct zones', () => {
    render(
      <Dashboard
        tasksByZone={mockTasksByZone}
        onComplete={vi.fn()}
        onMoveTask={vi.fn()}
      />
    )
    expect(screen.getByTestId('flight-strip-FS0001')).toBeInTheDocument()
    expect(screen.getByTestId('flight-strip-FS0002')).toBeInTheDocument()
    expect(screen.getByTestId('flight-strip-FS0003')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: テストが失敗することを確認**

```bash
npx vitest run tests/components/Dashboard.test.tsx
```

Expected: FAIL — `Dashboard` が見つからない

- [ ] **Step 7: Dashboard コンポーネントの最小実装**

```tsx
// src/renderer/components/Dashboard/Dashboard.tsx
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core'
import { useState } from 'react'
import type { Task, ZoneType } from '../../types/task'
import { ZONE_LIMITS } from '../../types/task'
import { Zone } from '../Zone/Zone'
import { FlightStrip } from '../FlightStrip/FlightStrip'
import styles from './Dashboard.module.css'

interface DashboardProps {
  tasksByZone: Record<ZoneType, Task[]>
  onComplete: (taskId: string) => void
  onMoveTask: (taskId: string, toZone: ZoneType, toIndex: number) => void
}

const ZONE_CONFIG: { zone: ZoneType; title: string }[] = [
  { zone: 'ACTIVE', title: 'ACTIVE' },
  { zone: 'NEXT_ACTION', title: 'NEXT ACTION' },
  { zone: 'HOLDING', title: 'HOLDING' },
  { zone: 'CLEARED', title: 'CLEARED' }
]

export function Dashboard({ tasksByZone, onComplete, onMoveTask }: DashboardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const allTasks = Object.values(tasksByZone).flat()
    const task = allTasks.find(t => t.id === active.id)
    if (task) setActiveTask(task)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    let toZone: ZoneType
    let toIndex = 0

    // overがゾーンIDの場合
    if (['ACTIVE', 'NEXT_ACTION', 'HOLDING', 'CLEARED'].includes(over.id as string)) {
      toZone = over.id as ZoneType
      toIndex = tasksByZone[toZone].length
    } else {
      // overが他のタスクIDの場合 — そのタスクのゾーンに移動
      const allTasks = Object.values(tasksByZone).flat()
      const overTask = allTasks.find(t => t.id === over.id)
      if (!overTask) return
      toZone = overTask.zone
      toIndex = tasksByZone[toZone].findIndex(t => t.id === over.id)
    }

    onMoveTask(taskId, toZone, toIndex)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.dashboard}>
        {/* 上段: ACTIVE（左・大きく） + NEXT ACTION（右） */}
        <div className={styles.topRow}>
          <div className={styles.activeZone}>
            <Zone
              zone="ACTIVE"
              title="ACTIVE"
              tasks={tasksByZone.ACTIVE}
              maxTasks={ZONE_LIMITS.ACTIVE}
              onComplete={onComplete}
            />
          </div>
          <div className={styles.nextZone}>
            <Zone
              zone="NEXT_ACTION"
              title="NEXT ACTION"
              tasks={tasksByZone.NEXT_ACTION}
              maxTasks={ZONE_LIMITS.NEXT_ACTION}
              onComplete={onComplete}
            />
          </div>
        </div>

        {/* 下段: HOLDING（左） + CLEARED（右） */}
        <div className={styles.bottomRow}>
          <div className={styles.holdingZone}>
            <Zone
              zone="HOLDING"
              title="HOLDING"
              tasks={tasksByZone.HOLDING}
              maxTasks={ZONE_LIMITS.HOLDING}
              onComplete={onComplete}
            />
          </div>
          <div className={styles.clearedZone}>
            <Zone
              zone="CLEARED"
              title="CLEARED"
              tasks={tasksByZone.CLEARED}
              maxTasks={ZONE_LIMITS.CLEARED}
              onComplete={onComplete}
            />
          </div>
        </div>
      </div>

      {/* ドラッグ時のオーバーレイ */}
      <DragOverlay>
        {activeTask ? (
          <FlightStrip task={activeTask} onComplete={() => {}} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
```

```css
/* src/renderer/components/Dashboard/Dashboard.module.css */
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  flex: 1;
  overflow: hidden;
}

.topRow {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-md);
  flex: 1;
  min-height: 0;
}

.bottomRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  flex: 1;
  min-height: 0;
}

.activeZone,
.nextZone,
.holdingZone,
.clearedZone {
  display: flex;
  min-height: 0;
}

.activeZone > *,
.nextZone > *,
.holdingZone > *,
.clearedZone > * {
  flex: 1;
}
```

- [ ] **Step 8: テストがパスすることを確認**

```bash
npx vitest run tests/components/Dashboard.test.tsx
```

Expected: 3 passed

- [ ] **Step 9: コミット**

```bash
git add -A
git commit -m "feat: add Zone and Dashboard with drag-and-drop support (F1.1, F1.3)"
```

---

## Task 9: タイムライン表示 (F1.4)

**Files:**
- Create: `src/renderer/components/Timeline/Timeline.tsx`
- Create: `src/renderer/components/Timeline/Timeline.module.css`
- Test: `tests/components/Timeline.test.tsx`

- [ ] **Step 1: Timeline のfailing testを作成**

```tsx
// tests/components/Timeline.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Timeline } from '@renderer/components/Timeline/Timeline'
import type { Task } from '@renderer/types/task'

const mockTasks: Task[] = [
  {
    id: 'FS0001',
    title: 'Morning Meeting',
    zone: 'ACTIVE',
    priority: 'NRM',
    scheduledStart: '2026-04-16T09:00:00',
    scheduledEnd: '2026-04-16T10:00:00',
    createdAt: '2026-04-16T08:00:00',
    order: 0
  },
  {
    id: 'FS0002',
    title: 'Development',
    zone: 'NEXT_ACTION',
    priority: 'URG',
    scheduledStart: '2026-04-16T10:30:00',
    scheduledEnd: '2026-04-16T12:00:00',
    createdAt: '2026-04-16T08:01:00',
    order: 0
  }
]

describe('Timeline', () => {
  it('should render time markers for business hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T10:00:00'))

    render(<Timeline tasks={mockTasks} />)

    // 時刻マーカーが表示されている
    expect(screen.getByText('06')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('should render the sweep line (current time indicator)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T10:00:00'))

    render(<Timeline tasks={mockTasks} />)

    expect(screen.getByTestId('sweep-line')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('should render task blocks for scheduled tasks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T10:00:00'))

    render(<Timeline tasks={mockTasks} />)

    expect(screen.getByTestId('timeline-block-FS0001')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-block-FS0002')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('should not render blocks for tasks without scheduled time', () => {
    const unscheduledTask: Task = {
      id: 'FS0003',
      title: 'No Schedule',
      zone: 'HOLDING',
      priority: 'NRM',
      createdAt: '2026-04-16T08:00:00',
      order: 0
    }

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T10:00:00'))

    render(<Timeline tasks={[unscheduledTask]} />)

    expect(screen.queryByTestId('timeline-block-FS0003')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it('should have correct data-testid', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T10:00:00'))

    render(<Timeline tasks={mockTasks} />)
    expect(screen.getByTestId('timeline')).toBeInTheDocument()

    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run tests/components/Timeline.test.tsx
```

Expected: FAIL — `Timeline` が見つからない

- [ ] **Step 3: Timeline の最小実装**

```tsx
// src/renderer/components/Timeline/Timeline.tsx
import { useClock } from '../../hooks/useClock'
import type { Task } from '../../types/task'
import styles from './Timeline.module.css'

interface TimelineProps {
  tasks: Task[]
}

/** タイムライン表示時間帯 (6:00 - 24:00) */
const TIMELINE_START_HOUR = 6
const TIMELINE_END_HOUR = 24
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR

/** 時刻を0-1のパーセンテージに変換 */
function timeToPercent(date: Date): number {
  const hours = date.getHours() + date.getMinutes() / 60
  const clamped = Math.max(TIMELINE_START_HOUR, Math.min(TIMELINE_END_HOUR, hours))
  return ((clamped - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100
}

/** ゾーンに対応するCSS変数名 */
const ZONE_COLORS: Record<string, string> = {
  ACTIVE: 'var(--zone-active)',
  NEXT_ACTION: 'var(--zone-next)',
  HOLDING: 'var(--zone-holding)',
  CLEARED: 'var(--zone-cleared)'
}

export function Timeline({ tasks }: TimelineProps) {
  const { now } = useClock()
  const sweepPercent = timeToPercent(now)

  const scheduledTasks = tasks.filter(t => t.scheduledStart)

  const hourMarkers = Array.from(
    { length: TOTAL_HOURS + 1 },
    (_, i) => TIMELINE_START_HOUR + i
  )

  return (
    <div className={styles.timeline} data-testid="timeline">
      {/* 時間マーカー */}
      <div className={styles.markers}>
        {hourMarkers.map(hour => (
          <div
            key={hour}
            className={styles.marker}
            style={{ left: `${((hour - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100}%` }}
          >
            <span className={styles.markerLabel}>
              {hour.toString().padStart(2, '0')}
            </span>
            <div className={styles.markerLine} />
          </div>
        ))}
      </div>

      {/* タスクブロック */}
      <div className={styles.blocks}>
        {scheduledTasks.map(task => {
          const start = new Date(task.scheduledStart!)
          const end = task.scheduledEnd ? new Date(task.scheduledEnd) : new Date(start.getTime() + 3600000)
          const leftPercent = timeToPercent(start)
          const rightPercent = timeToPercent(end)
          const widthPercent = rightPercent - leftPercent

          return (
            <div
              key={task.id}
              className={styles.block}
              data-testid={`timeline-block-${task.id}`}
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(widthPercent, 1)}%`,
                '--block-color': ZONE_COLORS[task.zone] || 'var(--text-muted)'
              } as React.CSSProperties}
              title={`${task.id}: ${task.title}`}
            >
              <span className={styles.blockLabel}>{task.id}</span>
            </div>
          )
        })}
      </div>

      {/* スイープライン（現在時刻） */}
      <div
        className={styles.sweepLine}
        data-testid="sweep-line"
        style={{ left: `${sweepPercent}%` }}
      >
        <div className={styles.sweepDot} />
      </div>
    </div>
  )
}
```

```css
/* src/renderer/components/Timeline/Timeline.module.css */
.timeline {
  position: relative;
  height: 60px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-default);
  overflow: hidden;
  z-index: var(--z-timeline);
}

/* 時間マーカー */
.markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.marker {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.markerLabel {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  color: var(--text-muted);
  padding-top: 2px;
}

.markerLine {
  width: 1px;
  flex: 1;
  background: var(--border-default);
  opacity: 0.5;
}

/* タスクブロック */
.blocks {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  bottom: 4px;
}

.block {
  position: absolute;
  top: 4px;
  height: calc(100% - 8px);
  background: color-mix(in srgb, var(--block-color) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--block-color) 50%, transparent);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  padding: 0 4px;
  overflow: hidden;
  transition: background var(--transition-fast);
}

.block:hover {
  background: color-mix(in srgb, var(--block-color) 35%, transparent);
}

.blockLabel {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* スイープライン */
.sweepLine {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--sweep-line);
  box-shadow:
    0 0 8px var(--glow-green),
    0 0 16px rgba(16, 185, 129, 0.3);
  z-index: 2;
  pointer-events: none;
  animation: sweepGlow 2s ease-in-out infinite;
}

.sweepDot {
  position: absolute;
  top: -3px;
  left: -3px;
  width: 8px;
  height: 8px;
  background: var(--sweep-line);
  border-radius: 50%;
  box-shadow: 0 0 6px var(--glow-green);
}

@keyframes sweepGlow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx vitest run tests/components/Timeline.test.tsx
```

Expected: 5 passed

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: add Timeline component with sweep line and task blocks (F1.4)"
```

---

## Task 10: App統合 — 全コンポーネントの組み立て

**Files:**
- Modify: `src/renderer/App.tsx`
- Create: `src/renderer/App.module.css`
- Modify: `src/main/index.ts` (ウィンドウサイズ調整)

- [ ] **Step 1: App コンポーネントを統合実装**

```tsx
// src/renderer/App.tsx
import { useCallback } from 'react'
import { useTaskReducer } from './hooks/useTaskReducer'
import type { ZoneType } from './types/task'
import { Clock } from './components/Clock/Clock'
import { StatusBar } from './components/StatusBar/StatusBar'
import { Timeline } from './components/Timeline/Timeline'
import { Dashboard } from './components/Dashboard/Dashboard'
import styles from './App.module.css'

// デモ用サンプルタスク（開発時のみ）
const DEMO_TASKS = [
  {
    id: 'FS4219',
    title: 'プレゼン資料の最終確認',
    zone: 'ACTIVE' as ZoneType,
    priority: 'URG' as const,
    category: 'presentation',
    scheduledStart: '2026-04-16T09:00:00',
    scheduledEnd: '2026-04-16T10:00:00',
    createdAt: '2026-04-16T08:00:00',
    order: 0
  },
  {
    id: 'FS7731',
    title: 'メールチェックと重要メールリスト化',
    zone: 'NEXT_ACTION' as ZoneType,
    priority: 'NRM' as const,
    category: 'daily',
    scheduledStart: '2026-04-16T10:30:00',
    scheduledEnd: '2026-04-16T11:00:00',
    createdAt: '2026-04-16T08:01:00',
    order: 0
  },
  {
    id: 'FS2054',
    title: 'API設計レビュー',
    zone: 'NEXT_ACTION' as ZoneType,
    priority: 'URG' as const,
    category: 'development',
    scheduledStart: '2026-04-16T13:00:00',
    scheduledEnd: '2026-04-16T14:30:00',
    createdAt: '2026-04-16T08:02:00',
    order: 1
  },
  {
    id: 'FS8392',
    title: 'ドキュメント更新',
    zone: 'NEXT_ACTION' as ZoneType,
    priority: 'NRM' as const,
    category: 'documentation',
    createdAt: '2026-04-16T08:03:00',
    order: 2
  },
  {
    id: 'FS5510',
    title: '来週のスプリント計画',
    zone: 'HOLDING' as ZoneType,
    priority: 'NRM' as const,
    category: 'planning',
    scheduledStart: '2026-04-16T16:00:00',
    scheduledEnd: '2026-04-16T17:00:00',
    createdAt: '2026-04-16T08:04:00',
    order: 0
  },
  {
    id: 'FS1187',
    title: '月次レポート作成',
    zone: 'HOLDING' as ZoneType,
    priority: 'NRM' as const,
    category: 'reporting',
    createdAt: '2026-04-16T08:05:00',
    order: 1
  },
  {
    id: 'FS9924',
    title: 'テスト環境セットアップ',
    zone: 'CLEARED' as ZoneType,
    priority: 'NRM' as const,
    category: 'infrastructure',
    createdAt: '2026-04-15T09:00:00',
    completedAt: '2026-04-15T11:30:00',
    order: 0
  }
]

function App() {
  const { tasks, dispatch, getTasksByZone, getZoneCounts } = useTaskReducer(DEMO_TASKS)

  const handleComplete = useCallback((taskId: string) => {
    dispatch({ type: 'COMPLETE_TASK', payload: { taskId } })
  }, [dispatch])

  const handleMoveTask = useCallback((taskId: string, toZone: ZoneType, toIndex: number) => {
    dispatch({ type: 'MOVE_TASK', payload: { taskId, toZone, toIndex } })
  }, [dispatch])

  return (
    <div className={styles.app}>
      {/* 上部: ステータスバー + 時計 */}
      <header className={styles.header}>
        <StatusBar zoneCounts={getZoneCounts()} />
        <div className={styles.headerRight}>
          <Clock />
        </div>
      </header>

      {/* タイムライン */}
      <Timeline tasks={tasks} />

      {/* メイン: 4ゾーンダッシュボード */}
      <main className={styles.main}>
        <Dashboard
          tasksByZone={getTasksByZone()}
          onComplete={handleComplete}
          onMoveTask={handleMoveTask}
        />
      </main>
    </div>
  )
}

export default App
```

```css
/* src/renderer/App.module.css */
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--bg-primary);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.headerRight {
  display: flex;
  align-items: center;
  padding-right: var(--space-md);
}

.main {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}
```

- [ ] **Step 2: Electronメインプロセスのウィンドウサイズを調整**

`src/main/index.ts` 内の `BrowserWindow` の設定を以下のように更新:

```typescript
// ウィンドウ生成部分を更新
const mainWindow = new BrowserWindow({
  width: 1400,
  height: 900,
  minWidth: 1024,
  minHeight: 700,
  show: false,
  autoHideMenuBar: true,
  backgroundColor: '#0a0e17',
  title: 'Task-Hack',
  // ... 既存のwebPreferences
})
```

- [ ] **Step 3: アプリを起動して動作確認**

```bash
cd /Users/masaki/Documents/Projects/Task_Hack
npm run dev
```

Expected:
- ダークテーマのATCスタイル画面が表示
- 上部にステータスバー（ACT/NXT/HLD/CLR のカウント + URG数）と時計
- タイムラインにスイープライン（緑色の現在時刻線）が表示
- 4ゾーンにフライトストリップカードが配置されている
- カード間のドラッグ＆ドロップが動作する
- ACTIVE ゾーンに2つ目のタスクをドロップしようとしても拒否される
- NEXT ACTION ゾーンに6つ目のタスクをドロップしようとしても拒否される
- 完了ボタン（✓）をクリックするとタスクが CLEARED に移動する

- [ ] **Step 4: 全テストがパスすることを確認**

```bash
cd /Users/masaki/Documents/Projects/Task_Hack
npx vitest run
```

Expected: All tests pass

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: integrate all F1 components into App — ATC Dashboard complete

- F1.1: 4-zone display (ACTIVE, NEXT ACTION, HOLDING, CLEARED)
- F1.2: Flight strip cards with ID, title, time, priority, category, complete button
- F1.3: Drag & drop between zones with limit enforcement (ACTIVE: 1, NEXT: 5)
- F1.4: Timeline with sweep line and scheduled task blocks
- F1.5: Status bar with zone counts and urgent indicator
- F1.6: Real-time digital clock"
```

---

## Self-Review Checklist

### 1. Spec Coverage

| 要件ID | 要件 | 対応Task | ✅ |
|--------|------|----------|---|
| F1.1 | 4ゾーン表示 | Task 8 (Zone + Dashboard) | ✅ |
| F1.2 | フライトストリップカード | Task 7 (FlightStrip) | ✅ |
| F1.3 | ドラッグ＆ドロップ（上限チェック付き） | Task 4 (useTaskReducer) + Task 8 (Dashboard) | ✅ |
| F1.4 | タイムライン表示 | Task 9 (Timeline) | ✅ |
| F1.5 | ステータスバー | Task 6 (StatusBar) | ✅ |
| F1.6 | リアルタイム時計 | Task 5 (Clock) | ✅ |
| — | フライトID自動採番（F2.5） | Task 3 (flightId) | ✅ (F1依存) |

### 2. Placeholder Scan — None found.

### 3. Type Consistency

- `Task`, `ZoneType`, `Priority` — 全タスクで `@renderer/types/task` から統一的にインポート
- `generateFlightId()` — Task 3 で定義し Task 4 で使用、引数の型 `string[]` が一致
- `useTaskReducer` — 戻り値の `getTasksByZone: () => Record<ZoneType, Task[]>` と `getZoneCounts: () => Record<ZoneType, { total: number; urgent: number }>` が StatusBar・Dashboard と一致

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-16-f1-atc-dashboard.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
