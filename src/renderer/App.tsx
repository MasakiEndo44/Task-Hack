import { useCallback, useState } from 'react'
import { useTaskReducer } from './hooks/useTaskReducer'
import type { ZoneType } from './types/task'
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

  const handleComplete = useCallback((taskId: string) => {
    dispatch({ type: 'COMPLETE_TASK', payload: { taskId } })
  }, [dispatch])

  const handleUndoComplete = useCallback((taskId: string) => {
    dispatch({ type: 'UNDO_COMPLETE', payload: { taskId } })
  }, [dispatch])

  const handleMoveTask = useCallback((taskId: string, toZone: ZoneType, toIndex: number) => {
    dispatch({ type: 'MOVE_TASK', payload: { taskId, toZone, toIndex } })
  }, [dispatch])

  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', payload: { taskId, updates } })
  }, [dispatch])

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null

  return (
    <div className={styles.app}>
      {/* 上部: ステータスバー + 時計 */}
      <header className={styles.header}>
        <StatusBar zoneCounts={getZoneCounts()} />
        <div className={styles.headerRight}>
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

      {/* タイムライン */}
      <Timeline tasks={tasks} />

      {/* メイン: 4ゾーンダッシュボード */}
      <main className={styles.main}>
        <Dashboard
          tasksByZone={getTasksByZone()}
          onComplete={handleComplete}
          onUndoComplete={handleUndoComplete}
          onMoveTask={handleMoveTask}
          onClickTask={setSelectedTaskId}
          defaultTimer={defaultTimer}
        />
      </main>

      {/* タスク詳細ドロワー */}
      <Drawer
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        title={selectedTask ? `Task Details: ${selectedTask.id}` : ''}
      >
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            onUpdate={handleUpdateTask}
          />
        )}
      </Drawer>

      {/* 設定モーダル */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        defaultTimer={defaultTimer}
        onSaveSettings={(timer) => setDefaultTimer(timer)}
      />

      {/* AIチャットドロワー */}
      <ChatDrawer 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        onAddTask={(payload) => dispatch({ type: 'ADD_TASK', payload })}
      />
      
      {/* AIチャット起動ボタン */}
      {!isChatOpen && (
        <button 
          className={styles.chatFab}
          onClick={() => setIsChatOpen(true)}
          aria-label="Open AI Co-planner"
        >
          AI
        </button>
      )}
    </div>
  )
}

export default App
