import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '../../hooks/useChat'
import { TaskProposal } from './TaskProposal'
import type { TaskInput } from '../../types/task'
import styles from './ChatDrawer.module.css'

export interface ChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  onAddTask: (task: TaskInput) => void
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose, onAddTask }) => {
  const { messages, sendMessage, isLoading } = useChat()
  const [input, setInput] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = useCallback(() => {
    if ((!input.trim() && !attachedImage) || isLoading) return
    sendMessage(input.trim(), attachedImage ?? undefined)
    setInput('')
    setAttachedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [input, attachedImage, isLoading, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing && !(e.nativeEvent as any).isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setAttachedImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`} aria-hidden={!isOpen}>
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.statusIndicator} />
          AI Co-planner
        </div>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close Chat">
          ✕
        </button>
      </div>

      <div className={styles.history} ref={historyRef}>
        {messages.length === 0 && (
          <div className={styles.message} style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>
            タスクについて気軽に相談してください...
          </div>
        )}
        {messages.map((m, i) => {
          if (m.role === 'assistant') {
            const parts = m.content.split(/```(?:json)?\n([\s\S]*?)\n```/g)
            return (
              <div key={i} className={`${styles.message} ${styles.messageAssistant}`}>
                {parts.map((p, j) => {
                  if (j % 2 === 1) {
                    return <TaskProposal key={j} taskStr={p} onApprove={onAddTask} />
                  }
                  return p ? <div key={j}>{p}</div> : null
                })}
              </div>
            )
          }

          return (
            <div key={i} className={`${styles.message} ${styles.messageUser}`}>
              {m.imageBase64 && (
                <img src={m.imageBase64} alt="添付画像" className={styles.messageImage} />
              )}
              {m.content}
            </div>
          )
        })}
        {isLoading && (
          <div className={styles.loading}>
            <span className={styles.dot}>.</span>
            <span className={styles.dot}>.</span>
            <span className={styles.dot}>.</span>
          </div>
        )}
      </div>

      <div className={styles.inputArea}>
        {attachedImage && (
          <div className={styles.imagePreview}>
            <img src={attachedImage} alt="添付プレビュー" className={styles.previewImage} />
            <button
              className={styles.removeImageBtn}
              onClick={() => {
                setAttachedImage(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              aria-label="画像を削除"
            >
              ×
            </button>
          </div>
        )}
        <div className={styles.inputRow}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg,image/gif,image/webp"
            style={{ display: 'none' }}
          />
          <button
            className={styles.attachButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label="画像を添付"
            title="画像を添付"
          >
            📎
          </button>
          <textarea
            className={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onBlur={() => setIsComposing(false)}
            placeholder="来週のプレゼンの準備をしなきゃ..."
            disabled={isLoading}
          />
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={(!input.trim() && !attachedImage) || isLoading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
