import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '../../hooks/useChat'
import { TaskProposal } from './TaskProposal'
import type { Task, TaskInput } from '../../types/task'
import styles from './ChatDrawer.module.css'

const DEFAULT_WIDTH = 320
const MIN_WIDTH = 240
const MAX_WIDTH = 520

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_PIXELS = 1280
const IMAGE_CONSENT_KEY = 'task-hack:image-api-consent'

async function processImageFile(blob: Blob): Promise<string | null> {
  if (blob.size > MAX_IMAGE_BYTES) {
    alert('画像サイズは2MB以下にしてください')
    return null
  }
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_PIXELS / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

export interface ChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  onAddTask: (task: TaskInput) => void
  tasks: Task[]
  onRegisterInjectMessage?: (fn: (text: string) => void) => void
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose, onAddTask, tasks, onRegisterInjectMessage }) => {
  const { messages, sendMessage, isLoading, injectMessage } = useChat(tasks)
  const [input, setInput] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH)
  const isResizing = useRef(false)
  const historyRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // ボディ・ダブリング用: 親からEchoメッセージを注入できるようにする
  useEffect(() => {
    onRegisterInjectMessage?.(injectMessage)
  }, [onRegisterInjectMessage, injectMessage])

  // Ctrl+V / Cmd+V でのクリップボード画像ペースト
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

  // resize logic
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true

    const startX = e.clientX
    const startWidth = sidebarWidth

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return
      const delta = ev.clientX - startX
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta))
      setSidebarWidth(next)
    }

    const onMouseUp = () => {
      isResizing.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth])

  const handleSend = useCallback(() => {
    if ((!input.trim() && !attachedImage) || isLoading) return

    if (attachedImage && !localStorage.getItem(IMAGE_CONSENT_KEY)) {
      const ok = confirm(
        'この画像はOpenAI APIに送信され、タスク生成に使用されます。\n' +
        'タスクデータはローカルにのみ保存されます。よろしいですか？'
      )
      if (!ok) return
      localStorage.setItem(IMAGE_CONSENT_KEY, '1')
    }

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
    <aside
      className={styles.sidebar}
      style={{ width: isOpen ? sidebarWidth : 0 }}
      aria-hidden={!isOpen}
    >
      {/* resize handle — only visible when open */}
      <div className={styles.resizeHandle} onMouseDown={handleResizeMouseDown} />

      <div className={styles.inner}>
        {/* header */}
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.statusIndicator} />
            AI Co-planner
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="チャットを閉じる">
            ✕
          </button>
        </div>

        {/* message history */}
        <div className={styles.history} ref={historyRef}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
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

        {/* input area */}
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
    </aside>
  )
}
