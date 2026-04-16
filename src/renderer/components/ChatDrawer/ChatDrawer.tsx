import React, { useState, useRef, useEffect } from 'react'
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
  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
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
                  if (j % 2 === 1) { // json block
                    return <TaskProposal key={j} taskStr={p} onApprove={onAddTask} />
                  }
                  return p ? <div key={j}>{p}</div> : null
                })}
              </div>
            )
          }

          return (
            <div 
              key={i} 
              className={`${styles.message} ${styles.messageUser}`}
            >
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
        <textarea 
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="来週のプレゼンの準備をしなきゃ..."
          disabled={isLoading}
        />
        <button 
          className={styles.sendButton} 
          onClick={handleSend} 
          disabled={!input.trim() || isLoading}
        >
          Send
        </button>
      </div>
    </div>
  )
}
