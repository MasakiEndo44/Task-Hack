import { useEffect } from 'react'
import styles from './StaffCreditsModal.module.css'

interface StaffCreditsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function StaffCreditsModal({ isOpen, onClose }: StaffCreditsModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>✕</button>

        <div className={styles.header}>
          <h2 className={styles.title}>Task-Hack</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>製作者</h3>
            <p className={styles.text}>えんまさ (Enmasa)</p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>設計思想</h3>
            <p className={styles.text}>
              航空管制(ATC)メタファーとAI秘書の融合による、「余白のある机上」の実現。
              画面に存在するタスクの総量を常に「安心できる量」に制限し、ADHDの認知負荷を最小化します。
            </p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>主な機能</h3>
            <ul className={styles.list}>
              <li>フライトストリップによるタスクの視覚化</li>
              <li>AIによるコンテキスト把握と自動整理</li>
              <li>過去の完了タスクに基づく成長する自伝的メモリ</li>
            </ul>
          </div>

          <div className={styles.messageBox}>
            <p className={styles.message}>
              認知負荷を乗りこなし、<br />
              人生というフライトを素晴らしいものにしましょう！
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
