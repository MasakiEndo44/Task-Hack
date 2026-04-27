import { useEffect, useState } from 'react'
import { StaffCreditsModal } from '../StaffCreditsModal/StaffCreditsModal'
import styles from './SettingsModal.module.css'

type SettingsTab = 'general' | 'ai-secretary'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTimer?: number
  onSaveSettings?: (timer: number) => void
}

export function SettingsModal({ isOpen, onClose, defaultTimer: propDefaultTimer = 25, onSaveSettings }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [obsidianPath, setObsidianPath] = useState('~/Documents/Obsidian/kecku_knowledge_brain/Task-Hack/')
  const [sweepSchedule, setSweepSchedule] = useState('0 22 * * 0')
  const [defaultTimer, setDefaultTimer] = useState(propDefaultTimer)
  const [apiKey, setApiKey] = useState('')
  const [userName, setUserName] = useState('')
  const [soulContent, setSoulContent] = useState('')
  const [pathValidation, setPathValidation] = useState<{ valid: boolean; error?: string } | null>(null)
  const [isSweepRunning, setIsSweepRunning] = useState(false)
  const [sweepMessage, setSweepMessage] = useState('')
  const [connectionTest, setConnectionTest] = useState<{ ok: boolean; error?: string } | null>(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [contextInput, setContextInput] = useState('')
  const [isInjecting, setIsInjecting] = useState(false)
  const [injectionSummary, setInjectionSummary] = useState('')
  const [showCredits, setShowCredits] = useState(false)

  useEffect(() => {
    setDefaultTimer(propDefaultTimer)
  }, [propDefaultTimer, isOpen])

  useEffect(() => {
    if (isOpen) {
      window.api.loadSettings().then((s: any) => {
        if (s.openAiApiKey) setApiKey(s.openAiApiKey)
        if (s.timerDefault) setDefaultTimer(s.timerDefault)
        if (s.obsidianVaultPath) setObsidianPath(s.obsidianVaultPath)
        if (s.sweepSchedule) setSweepSchedule(s.sweepSchedule)
        if (s.userName) setUserName(s.userName)
      })
      window.api.loadSoul().then((soul: string | null) => {
        if (soul) setSoulContent(soul)
      })
    }
  }, [isOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    setConnectionTest(null)
    const result = await window.api.testChatConnection(apiKey)
    setConnectionTest(result)
    setIsTestingConnection(false)
  }

  const handleSave = () => {
    window.api.saveSettings({
      openAiApiKey: apiKey,
      timerDefault: defaultTimer,
      obsidianVaultPath: obsidianPath,
      sweepSchedule,
      userName: userName || undefined,
    }).then(() => {
      if (onSaveSettings) onSaveSettings(defaultTimer)
      onClose()
    })
  }

  const handleSelectFolder = async () => {
    const selected = await window.api.selectVaultFolder()
    if (selected) {
      setObsidianPath(selected)
      setPathValidation(null)
    }
  }

  const handleValidateVault = async () => {
    const result = await window.api.validateVaultPath(obsidianPath)
    setPathValidation(result)
  }

  const handleInitEcho = async () => {
    if (!userName.trim()) return
    const soul = await window.api.initEcho(userName)
    setSoulContent(soul)
  }

  const handleSaveSoulStyle = async () => {
    await window.api.updateSoulStyle(soulContent)
  }

  const handleManualSweep = async () => {
    setIsSweepRunning(true)
    setSweepMessage('スイープを開始しています...')
    window.api.onSweepProgress((status) => {
      setSweepMessage(status.message)
      if (status.phase === 'done' || status.phase === 'error') {
        setIsSweepRunning(false)
        window.api.offSweepListeners()
      }
    })
    await window.api.runSweep()
  }

  const handleInjectContext = async () => {
    if (!contextInput.trim()) return
    setIsInjecting(true)
    setInjectionSummary('')
    try {
      const result = await (window as any).api.injectUserContext(contextInput)
      setInjectionSummary(result.summary)
      setContextInput('')
    } catch (e: any) {
      setInjectionSummary(`エラー: ${e.message}`)
    } finally {
      setIsInjecting(false)
    }
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text) {
        setContextInput(prev => prev + (prev ? '\n' : '') + text)
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Settings</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'general' ? styles.active : ''}`}
            onClick={() => setActiveTab('general')}
          >
            一般
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'ai-secretary' ? styles.active : ''}`}
            onClick={() => setActiveTab('ai-secretary')}
          >
            AI秘書 (Echo)
          </button>
        </div>

        {activeTab === 'general' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <label>OpenAI API Key</label>
              <div className={styles.inputRow}>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setConnectionTest(null) }}
                  className={styles.input}
                  placeholder="sk-..."
                />
                <button
                  className={styles.iconButton}
                  onClick={handleTestConnection}
                  disabled={!apiKey.trim() || isTestingConnection}
                >
                  {isTestingConnection ? '確認中...' : '接続テスト'}
                </button>
              </div>
              {connectionTest && (
                <div className={`${styles.pathValidation} ${connectionTest.ok ? styles.valid : styles.invalid}`}>
                  {connectionTest.ok ? '✓ 接続OK' : `⚠ ${connectionTest.error}`}
                </div>
              )}
              <span className={styles.help}>AIチャット・週次スイープに使用するAPIキーです。</span>
            </div>

            <div className={styles.section}>
              <label>Obsidian Vault パス</label>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  value={obsidianPath}
                  onChange={e => { setObsidianPath(e.target.value); setPathValidation(null) }}
                  placeholder="~/Documents/Obsidian/..."
                  className={styles.input}
                />
                <button className={styles.iconButton} onClick={handleSelectFolder}>📁 選択</button>
                <button className={styles.iconButton} onClick={handleValidateVault}>✓ 確認</button>
              </div>
              {pathValidation && (
                <div className={`${styles.pathValidation} ${pathValidation.valid ? styles.valid : styles.invalid}`}>
                  {pathValidation.valid ? '✓ フォルダを確認しました' : `⚠ ${pathValidation.error}`}
                </div>
              )}
              <span className={styles.help}>週次レポートの出力先Obsidian Vaultフォルダです。</span>
            </div>

            <div className={styles.section}>
              <label>スイープスケジュール (cron書式)</label>
              <input
                type="text"
                value={sweepSchedule}
                onChange={e => setSweepSchedule(e.target.value)}
                className={styles.input}
                placeholder="0 22 * * 0"
              />
              <span className={styles.help}>例: "0 22 * * 0" = 毎週日曜22時</span>
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

            <div className={styles.creditsButtonContainer}>
              <button className={styles.creditsButton} onClick={() => setShowCredits(true)}>
                Staff Credits
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ai-secretary' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <label>Echoの初期化</label>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="あなたの名前（例: みさき）"
                  className={styles.input}
                />
                <button className={styles.iconButton} onClick={handleInitEcho} disabled={!userName.trim()}>
                  Echoを初期化
                </button>
              </div>
              <span className={styles.help}>初回のみ必要です。soul.mdが生成されます。</span>
            </div>

            {soulContent && (
              <div className={styles.section}>
                <label>EchoのSoul (soul.md)</label>
                <textarea
                  value={soulContent}
                  onChange={e => setSoulContent(e.target.value)}
                  className={styles.textarea}
                  rows={8}
                />
                <div className={styles.inputRow} style={{ justifyContent: 'flex-end' }}>
                  <button className={styles.iconButton} onClick={handleSaveSoulStyle}>
                    スタイルを保存
                  </button>
                </div>
                <span className={styles.help}>Style Extensionsセクション（ユーザーカスタマイズ部分）が保存されます。</span>
              </div>
            )}

            <div className={styles.section}>
              <label>ユーザーコンテキスト注入</label>
              <div className={styles.inputRow}>
                <textarea
                  value={contextInput}
                  onChange={e => setContextInput(e.target.value)}
                  placeholder="追加したいプロファイル情報や最近の出来事を入力..."
                  className={styles.textarea}
                  rows={3}
                />
              </div>
              <div className={styles.inputRow} style={{ justifyContent: 'space-between', marginTop: '8px' }}>
                <div>
                  <input type="file" id="context-file" accept=".txt,.md" style={{ display: 'none' }} onChange={handleFileImport} />
                  <button className={styles.iconButton} onClick={() => document.getElementById('context-file')?.click()}>
                    📁 ファイル読込
                  </button>
                </div>
                <button
                  className={styles.iconButton}
                  onClick={handleInjectContext}
                  disabled={!contextInput.trim() || isInjecting || !apiKey}
                >
                  {isInjecting ? '注入中...' : 'コンテキストを注入'}
                </button>
              </div>
              {injectionSummary && (
                <div className={styles.contextSummary}>
                  <h4>📋 更新サマリー</h4>
                  <pre>{injectionSummary}</pre>
                </div>
              )}
              <span className={styles.help}>入力された情報はAIが分析し、user-context.mdの適切なセクションにマージされます。</span>
            </div>

            <div className={styles.section}>
              <label>週次スイープ</label>
              <button
                className={styles.sweepButton}
                onClick={handleManualSweep}
                disabled={isSweepRunning}
              >
                {isSweepRunning ? '実行中...' : '今すぐスイープを実行 🛬'}
              </button>
              {sweepMessage && (
                <div className={styles.sweepMessage}>{sweepMessage}</div>
              )}
              <span className={styles.help}>CLEAREDタスクを集計・アーカイブし、週次レポートを生成します。</span>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>キャンセル</button>
          <button className={styles.saveButton} onClick={handleSave}>保存</button>
        </div>
      </div>

      <StaffCreditsModal isOpen={showCredits} onClose={() => setShowCredits(false)} />
    </>
  )
}
