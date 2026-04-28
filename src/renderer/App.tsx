import { useCallback, useEffect, useRef, useState } from 'react'
import { useTaskReducer } from './hooks/useTaskReducer'
import type { Task, ZoneType, TaskInput } from './types/task'
import type { AppTag } from './types/tag'
import type { SweepStatus } from './types/sweep'
import { Clock } from './components/Clock/Clock'
import { StatusBar } from './components/StatusBar/StatusBar'
import { Timeline } from './components/Timeline/Timeline'
import { Dashboard } from './components/Dashboard/Dashboard'
import { Drawer } from './components/Drawer/Drawer'
import { TaskDetail } from './components/TaskDetail/TaskDetail'
import { SettingsModal } from './components/SettingsModal/SettingsModal'
import { ChatDrawer } from './components/ChatDrawer/ChatDrawer'
import styles from './App.module.css'

// デモ用サンプルタスク（開発時の動作確認用）
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

function App(): React.JSX.Element {
  const { tasks, dispatch, getTasksByZone, getZoneCounts } = useTaskReducer(DEMO_TASKS)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [defaultTimer, setDefaultTimer] = useState(25)
  const [sweepStatus, setSweepStatus] = useState<SweepStatus | null>(null)
  const [pendingReport, setPendingReport] = useState<{ weekLabel: string; taskCount: number; reportMd: string } | null>(null)
  const setTimelineTabRef = useRef<((tab: 'today' | 'history') => void) | null>(null)
  const [tags, setTags] = useState<AppTag[]>([])
  const injectEchoMessageRef = useRef<((text: string) => void) | null>(null)
  const startClarificationRef = useRef<((task: Task) => void) | null>(null)

  useEffect(() => {
    window.api?.loadTags?.().then(loaded => { if (loaded) setTags(loaded) })
  }, [])

  const handleTagsChange = useCallback((newTags: AppTag[]) => {
    setTags(newTags)
    window.api?.saveTags?.(newTags)
  }, [])

  useEffect(() => {
    window.api?.getPendingReport?.().then(report => {
      if (report) setPendingReport(report)
    })
  }, [])

  useEffect(() => {
    if (window.api?.onSweepProgress) {
      window.api.onSweepProgress(async (status) => {
        setSweepStatus(status)
        if (status.phase === 'done') {
          if (window.api?.loadTasks) {
            const fresh = await window.api.loadTasks().catch(() => null)
            if (fresh) dispatch({ type: 'INIT_TASKS', payload: { tasks: fresh } })
          }
          setTimeout(() => setSweepStatus(null), 4000)
        }
      })
    }
    return () => { window.api?.offSweepListeners?.() }
  }, [dispatch])

  const handleComplete = useCallback(async (taskId: string) => {
    dispatch({ type: 'COMPLETE_TASK', payload: { taskId } })
    if (window.api?.checkRecurringTasks) {
      const result = await window.api.checkRecurringTasks(tasks)
      if (result.generated.length > 0) {
        result.generated.forEach((task: Task) => {
          dispatch({ type: 'ADD_TASK', payload: { ...task } })
        })
        result.updatedTemplates.forEach((updated: Task) => {
          dispatch({ type: 'UPDATE_TASK', payload: { taskId: updated.id, updates: updated } })
        })
      }
    }
  }, [dispatch, tasks])

  const handleUndoComplete = useCallback((taskId: string) => {
    dispatch({ type: 'UNDO_COMPLETE', payload: { taskId } })
  }, [dispatch])

  const handleMoveTask = useCallback((taskId: string, toZone: ZoneType, toIndex: number) => {
    dispatch({ type: 'MOVE_TASK', payload: { taskId, toZone, toIndex } })
  }, [dispatch])

  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', payload: { taskId, updates } })
  }, [dispatch])

  const handleDeleteTask = useCallback((taskId: string) => {
    dispatch({ type: 'DELETE_TASK', payload: { taskId } })
    setSelectedTaskId(null)
  }, [dispatch])

  const handleAddTask = useCallback(async (payload: TaskInput): Promise<string | undefined> => {
    if (window.api?.loadSettings && window.api?.saveSettings) {
      try {
        const settings = await window.api.loadSettings()
        const next = (settings.lastFlightId ?? 0) + 1
        const id = `FS${String(next).padStart(4, '0')}`
        await window.api.saveSettings({ ...settings, lastFlightId: next })
        dispatch({ type: 'ADD_TASK', payload: { ...payload, id } })
        return id
      } catch { /* フォールバック: ランダムIDで生成 */ }
    }
    dispatch({ type: 'ADD_TASK', payload })
    return undefined
  }, [dispatch])

  const handleAddEmptyTask = useCallback(async (zone: ZoneType) => {
    const id = await handleAddTask({ title: '', zone, priority: 'NRM' })
    if (id) {
      setSelectedTaskId(id)
    }
  }, [handleAddTask])

  const handleRegisterInjectMessage = useCallback((fn: (text: string) => void) => {
    injectEchoMessageRef.current = fn
  }, [])

  const handleRegisterStartClarification = useCallback((fn: (task: Task) => void) => {
    startClarificationRef.current = fn
  }, [])

  const handleStartClarification = useCallback((task: Task) => {
    startClarificationRef.current?.(task)
    setIsChatOpen(true)
  }, [])

  // ボディ・ダブリング: タイマーイベントをChatDrawerに転送
  const handleTimerEvent = useCallback((
    event: 'start' | 'wrapup' | 'complete',
    taskTitle: string,
    remainingMin?: number
  ) => {
    const messages: Record<string, string> = {
      start: `「${taskTitle}」、始めましょう。あなたのペースで大丈夫です ✈`,
      wrapup: `残り2分です。仕上げに入りましょうか？`,
      complete: `「${taskTitle}」、お疲れさまでした 🛬 ひと息ついてください。`,
    }
    const text = remainingMin !== undefined
      ? `折り返し点です。あと${remainingMin}分ほど。順調ですか？`
      : messages[event]
    injectEchoMessageRef.current?.(text)
    setIsChatOpen(true)
  }, [])

  // 優先度提案
  const handleSuggestPriority = useCallback(async () => {
    setIsChatOpen(true)
    if (!window.api?.suggestPriority) {
      injectEchoMessageRef.current?.('優先度提案機能はElectron環境でのみ使用できます。')
      return
    }
    injectEchoMessageRef.current?.('優先度を分析中です... しばらくお待ちください ✈')
    try {
      const result = await window.api.suggestPriority(tasks)
      const proposalText = [
        result.summary,
        '',
        ...result.proposals.map((p: { title: string; suggestedZone: string; reason: string }) =>
          `**${p.title}** → ${p.suggestedZone}\n  理由: ${p.reason}`
        ),
        '',
        '適用しますか？ タスクをドラッグで移動するか、「全て適用」とお伝えください。'
      ].join('\n')
      injectEchoMessageRef.current?.(proposalText)
    } catch (e: any) {
      const msg = e?.message ?? '優先度提案に失敗しました'
      injectEchoMessageRef.current?.(`⚠ ${msg}`)
      console.error('Priority suggestion failed:', e)
    }
  }, [tasks])

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null

  return (
    <div className={styles.app}>
      {/* 上部: ステータスバー + 時計 */}
      <header className={styles.header}>
        <StatusBar zoneCounts={getZoneCounts()} sweepStatus={sweepStatus} />
        <div className={styles.headerRight}>
          <button
            className={`${styles.chatButton} ${isChatOpen ? styles.chatButtonActive : ''}`}
            onClick={() => setIsChatOpen(prev => !prev)}
            aria-label="Echo AI を開く"
          >
            AI
          </button>
          <button
            className={styles.settingsButton}
            onClick={() => setIsSettingsOpen(true)}
            aria-label="設定"
          >
            ⚙️
          </button>
          <Clock />
        </div>
      </header>

      {/* サイドバー + コンテンツ横並びラッパー */}
      <div className={styles.body}>
        {/* AIチャットサイドバー */}
        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onAddTask={handleAddTask}
          tasks={tasks}
          onRegisterInjectMessage={handleRegisterInjectMessage}
          onUpdateTask={handleUpdateTask}
          onRegisterStartClarification={handleRegisterStartClarification}
        />

        {/* タイムライン + ダッシュボード */}
        <main className={styles.main}>
          <Timeline tasks={tasks} onRegisterTabSetter={(fn) => { setTimelineTabRef.current = fn }} />
          <Dashboard
            tasksByZone={getTasksByZone()}
            allTasks={tasks}
            onComplete={handleComplete}
            onUndoComplete={handleUndoComplete}
            onMoveTask={handleMoveTask}
            onClickTask={setSelectedTaskId}
            defaultTimer={defaultTimer}
            onTimerEvent={handleTimerEvent}
            onSuggestPriority={handleSuggestPriority}
            onAddEmptyTask={handleAddEmptyTask}
            tags={tags}
          />
        </main>
      </div>

      {/* タスク詳細ドロワー */}
      <Drawer
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        title={selectedTask ? `${selectedTask.id} — ${selectedTask.title}` : ''}
      >
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            allTasks={tasks}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            tags={tags}
            onTagsChange={handleTagsChange}
            onStartClarification={handleStartClarification}
          />
        )}
      </Drawer>

      {/* 設定モーダル */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        defaultTimer={defaultTimer}
        onSaveSettings={(timer) => setDefaultTimer(timer)}
        tags={tags}
        onTagsChange={handleTagsChange}
      />

      {/* 週次レポートオーバーレイ */}
      {pendingReport && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            maxWidth: '600px', width: '90%',
            maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', gap: '1rem',
            color: 'var(--text-primary)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
                🛬 週次レポート — {pendingReport.weekLabel}
              </h2>
              <button
                onClick={() => setPendingReport(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
                aria-label="閉じる"
              >✕</button>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {pendingReport.taskCount}件のタスクが完了しました。
            </p>
            <div style={{
              flex: 1, overflowY: 'auto',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              fontSize: '0.88rem', lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              color: 'var(--text-secondary)',
            }}>
              {pendingReport.reportMd || '（レポート本文なし）'}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-end' }}>
              <button
                onClick={() => {
                  setPendingReport(null)
                  setTimelineTabRef.current?.('history')
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-hover)',
                  color: 'var(--text-secondary)',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                📋 履歴を見る
              </button>
              <button
                onClick={() => setPendingReport(null)}
                style={{
                  background: 'var(--zone-next)', border: 'none',
                  color: 'var(--bg-primary)', padding: '0.5rem 1.5rem',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
