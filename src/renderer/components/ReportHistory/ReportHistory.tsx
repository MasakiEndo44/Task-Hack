import { useState, useEffect } from 'react'
import styles from './ReportHistory.module.css'

interface ReportSummary {
  weekLabel: string
  taskCount: number
  titles: string[]
}

function echoComment(reports: ReportSummary[], index: number): string {
  const curr = reports[index]
  if (index < reports.length - 1) {
    const prev = reports[index + 1]
    const diff = curr.taskCount - prev.taskCount
    if (diff > 0) return `先週より${diff}件多く完了しました ✈`
    if (diff < 0) return `先週より${Math.abs(diff)}件少なめでした。次週に期待です ✈`
    return `先週と同じ${curr.taskCount}件でした ✈`
  }
  return `${curr.taskCount}件のタスクを完了しました ✈`
}

function formatWeekLabel(weekLabel: string): string {
  const m = weekLabel.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return weekLabel
  return `${m[1]}年 第${parseInt(m[2], 10)}週`
}

export function ReportHistory() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!window.api?.listReports) {
      setIsLoading(false)
      return
    }
    window.api.listReports().then(data => {
      setReports(data ?? [])
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <span>読み込み中...</span>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📋</div>
        <p className={styles.emptyText}>まだレポートはありません。</p>
        <p className={styles.emptyHint}>スイープを実行すると、完了タスクが週次レポートとして記録されます ✈</p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {reports.map((report, index) => (
        <div key={report.weekLabel} className={styles.card}>
          <button
            className={styles.cardHeader}
            onClick={() => setExpanded(prev => prev === report.weekLabel ? null : report.weekLabel)}
          >
            <div className={styles.cardLeft}>
              <span className={styles.weekLabel}>{formatWeekLabel(report.weekLabel)}</span>
              <span className={styles.taskCount}>{report.taskCount}件完了</span>
            </div>
            <span className={styles.chevron}>{expanded === report.weekLabel ? '▲' : '▼'}</span>
          </button>

          <div className={styles.echoComment}>
            <span className={styles.echoDot} />
            {echoComment(reports, index)}
          </div>

          {expanded === report.weekLabel && (
            <div className={styles.taskList}>
              {report.titles.length > 0
                ? report.titles.map((title, i) => (
                  <div key={i} className={styles.taskItem}>
                    <span className={styles.taskDone}>✓</span>
                    <span>{title}</span>
                  </div>
                ))
                : <div className={styles.noTitles}>タスク情報なし</div>
              }
              {report.taskCount > report.titles.length && (
                <div className={styles.moreTasks}>
                  他 {report.taskCount - report.titles.length} 件
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
