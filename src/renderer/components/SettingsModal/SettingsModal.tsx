import { useEffect, useState } from 'react'
import styles from './SettingsModal.module.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTimer?: number
  onSaveSettings?: (timer: number) => void
}

export function SettingsModal({ isOpen, onClose, defaultTimer: propDefaultTimer = 25, onSaveSettings }: SettingsModalProps) {
  const [obsidianPath, setObsidianPath] = useState('~/Documents/Obsidian/kecku_knowledge_brain/Task-Hack/')
  const [defaultTimer, setDefaultTimer] = useState(propDefaultTimer)

  useEffect(() => {
    setDefaultTimer(propDefaultTimer)
  }, [propDefaultTimer, isOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSave = () => {
    if (onSaveSettings) {
      onSaveSettings(defaultTimer)
    }
    onClose()
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Settings</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        
        <div className={styles.body}>
          <div className={styles.section}>
            <label>Obsidian Vault パス</label>
            <input 
              type="text" 
              value={obsidianPath} 
              onChange={e => setObsidianPath(e.target.value)}
              className={styles.input}
              placeholder="/Users/.../Obsidian/..."
            />
            <span className={styles.help}>週次レポート(Phase 4)の出力先です。</span>
          </div>

          <div className={styles.section}>
            <label>デフォルトタイマー (分)</label>
            <input 
              type="number" 
              value={defaultTimer} 
              onChange={e => setDefaultTimer(Number(e.target.value))}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>キャンセル</button>
          <button className={styles.saveButton} onClick={handleSave}>保存</button>
        </div>
      </div>
    </>
  )
}
