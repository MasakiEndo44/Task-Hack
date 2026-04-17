# Phase 3: AI Chat Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the F4 AI Chat Agent, an interactive bottom drawer to chat with an AI assistant that can propose tasks and break them down into subtasks using the OpenAI API.

**Architecture:** Add IPC handlers in the Electron main process to securely manage OpenAI API calls (using the `openai` npm package). The React frontend will feature a `ChatDrawer` component, animated smoothly from the bottom, to prevent screen transitions. A `useChat` custom hook will manage chat history. When the AI proposes a task, it outputs a structured block that the UI parses into an interactive Task Proposal Card. The user can review the AI-proposed task (and its subtasks) and click "Approve" to insert it into their `NEXT_ACTION` zone.

**Tech Stack:** React, CSS Modules, Electron IPC, OpenAI SDK (`openai`), TypeScript

---

### Task 1: Setup OpenAi Backend and Settings

**Files:**
- Modify: `/Users/masaki/Documents/Projects/Task_Hack/package.json`
- Modify: `/Users/masaki/Documents/Projects/Task_Hack/src/main/index.ts:1-200`
- Modify: `/Users/masaki/Documents/Projects/Task_Hack/src/preload/index.ts:1-30`

- [ ] **Step 1: Install openai dependency**

Run: `npm install openai`
Expected: Installation completes successfully.

- [ ] **Step 2: Add API IPC handlers to main process**

Modify `src/main/index.ts` to add OpenAI integration. Require `electron-store` if needed or simple file storage for settings (for now we will use a simple settings file next to `tasks.json`):

```typescript
import OpenAI from 'openai'
// Inside app.whenReady().then(...)
const settingsFile = join(dataDir, 'settings.json')

ipcMain.handle('loadSettings', async () => {
  try {
    const data = await fs.readFile(settingsFile, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    return { openAiApiKey: '' }
  }
})

ipcMain.handle('saveSettings', async (_, settings) => {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf-8')
})

ipcMain.handle('chatCompletion', async (_, messages, apiKey) => {
  if (!apiKey) throw new Error('API Key missing')
  const openai = new OpenAI({ apiKey })
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are Task-Hack AI, an ATC assistant. When proposing a task to the user, strictly output JSON wrapped in ```json ... ``` blocks.' },
      ...messages
    ]
  })
  return completion.choices[0].message.content
})
```

- [ ] **Step 3: Update Preload and Types**

Modify `src/preload/index.ts` to expose the new APIs:

```typescript
const api = {
  loadTasks: () => ipcRenderer.invoke('loadTasks'),
  saveTasks: (tasks: any) => ipcRenderer.invoke('saveTasks', tasks),
  loadSettings: () => ipcRenderer.invoke('loadSettings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('saveSettings', settings),
  chatCompletion: (messages: any, apiKey: string) => ipcRenderer.invoke('chatCompletion', messages, apiKey)
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/main/index.ts src/preload/index.ts
git commit -m "feat: add openai backend and settings ipc for chat"
```

---

### Task 2: Create Settings Drawer for API Key

**Files:**
- Create: `/Users/masaki/Documents/Projects/Task_Hack/src/renderer/components/Settings/SettingsDrawer.tsx`
- Create: `/Users/masaki/Documents/Projects/Task_Hack/src/renderer/components/Settings/SettingsDrawer.module.css`
- Modify: `/Users/masaki/Documents/Projects/Task_Hack/src/renderer/App.tsx:1-200`

- [ ] **Step 1: Write SettingsDrawer.module.css**

```css
.overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.modal {
  background: var(--bg-primary);
  padding: 24px;
  border-radius: 8px;
  width: 400px;
  border: 1px solid var(--border-color);
}
.input {
  width: 100%;
  padding: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  font-family: var(--font-mono);
  margin-top: 8px;
  margin-bottom: 16px;
}
```

- [ ] **Step 2: Write SettingsDrawer component**

```tsx
import React, { useState, useEffect } from 'react'
import styles from './SettingsDrawer.module.css'

export const SettingsDrawer = ({ onClose }: { onClose: () => void }) => {
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    window.api.loadSettings().then(s => setApiKey(s.openAiApiKey || ''))
  }, [])

  const handleSave = () => {
    window.api.saveSettings({ openAiApiKey: apiKey }).then(onClose)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2>Settings</h2>
        <label>OpenAI API Key</label>
        <input 
          type="password" 
          className={styles.input} 
          value={apiKey} 
          onChange={e => setApiKey(e.target.value)} 
          placeholder="sk-..." 
        />
        <button onClick={handleSave}>Save</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Integrate Settings in App**

Modify `App.tsx` to conditionally show `SettingsDrawer` (e.g. by adding a settings gear icon in StatusBar).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/Settings src/renderer/App.tsx
git commit -m "feat: add settings modal for openai api key"
```

---

### Task 3: ChatDrawer UI and useChat Hook

**Files:**
- Create: `/Users/masaki/Documents/Projects/Task_Hack/src/renderer/hooks/useChat.ts`
- Create: `/Users/masaki/Documents/Projects/Task_Hack/src/renderer/components/Chat/ChatDrawer.tsx`
- Create: `/Users/masaki/Documents/Projects/Task_Hack/src/renderer/components/Chat/ChatDrawer.module.css`

- [ ] **Step 1: Write useChat hook**

```typescript
import { useState, useCallback } from 'react'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (content: string) => {
    setMessages(prev => [...prev, { role: 'user', content }])
    setIsLoading(true)
    try {
      const settings = await window.api.loadSettings()
      if (!settings.openAiApiKey) throw new Error("No API Key")
      const reply = await window.api.chatCompletion([...messages, { role: 'user', content }], settings.openAiApiKey)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  return { messages, sendMessage, isLoading }
}
```

- [ ] **Step 2: Write ChatDrawer CSS**

```css
.drawer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 50vh;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  transform: translateY(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}
.drawerOpen {
  transform: translateY(0);
}
.history {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.inputArea {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 8px;
}
.input {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 12px;
}
```

- [ ] **Step 3: Write ChatDrawer component**

```tsx
import React, { useState } from 'react'
import { useChat } from '../../hooks/useChat'
import styles from './ChatDrawer.module.css'

export const ChatDrawer = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { messages, sendMessage, isLoading } = useChat()
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  return (
    <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
      <button onClick={onClose}>Close</button>
      <div className={styles.history}>
        {messages.map((m, i) => <div key={i}><strong>{m.role}:</strong> {m.content}</div>)}
        {isLoading && <div>Loading...</div>}
      </div>
      <div className={styles.inputArea}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          className={styles.input}
          placeholder="I have a presentation next week..."
        />
        <button onClick={handleSend} disabled={isLoading}>Send</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/hooks/useChat.ts src/renderer/components/Chat
git commit -m "feat: add bottom chat drawer and useChat hook"
```

---

### Task 4: Interactive Task Generation from AI responses

**Files:**
- Modify: `/Users/masaki/Documents/Projects/Task_Hack/src/renderer/components/Chat/ChatDrawer.tsx`
- Create: `/Users/masaki/Documents/Projects/Task_Hack/src/renderer/components/Chat/TaskProposal.tsx`

- [ ] **Step 1: Write TaskProposal**

If the AI outputs a JSON block, parse it and display a card with an `Approve` button that uses `useTaskReducer` to `ADD_TASK`.

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/Chat
git commit -m "feat: interactive task proposal approval"
```
