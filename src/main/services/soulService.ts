import fs from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'
import { SOUL_TEMPLATE } from '../templates/soulTemplate'
import type { Task } from '../../renderer/types/task'
import { loadProfileSection } from './profileService'

const dataDir = () => join(app.getPath('home'), '.task-hack')
const aiDir = () => join(dataDir(), 'ai')
const soulPath = () => join(aiDir(), 'soul.md')

/** soul.mdを読み込む。存在しない場合はnullを返す */
export async function loadSoul(): Promise<string | null> {
  try {
    return await fs.readFile(soulPath(), 'utf-8')
  } catch (err: any) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

/** soul.mdを保存する（ai/ディレクトリを自動作成） */
export async function saveSoul(content: string): Promise<void> {
  await fs.mkdir(aiDir(), { recursive: true })
  await fs.writeFile(soulPath(), content, 'utf-8')
}

/**
 * soul.mdをテンプレートから初期化する
 * 既存のsoul.mdが存在する場合はそのまま返す
 */
export async function initEcho(userName: string): Promise<string> {
  const existing = await loadSoul()
  if (existing) return existing

  const now = new Date().toISOString()
  const content = SOUL_TEMPLATE
    .replace(/\{\{userName\}\}/g, userName)
    .replace(/\{\{createdAt\}\}/g, now)
  await saveSoul(content)
  return content
}

/**
 * soul.mdのStyle Extensionsセクションを更新する
 * STYLE_SECTION_START / STYLE_SECTION_END タグで囲まれた部分を置換
 */
export async function updateSoulStyle(newStyleContent: string): Promise<void> {
  const current = await loadSoul()
  if (!current) throw new Error('soul.mdが存在しません。先にEchoを初期化してください。')

  const updated = current.replace(
    /(<!-- STYLE_SECTION_START[^>]*-->)([\s\S]*?)(<!-- STYLE_SECTION_END -->)/,
    `$1\n\n${newStyleContent}\n\n$3`
  )
  await saveSoul(updated)
}

export interface LayeredPromptOptions {
  /** Layer2で読み込むプロファイルセクション */
  profileSections?: ('identity' | 'patterns' | 'goals' | 'insights')[]
  /** Layer3タスクコンテキスト */
  taskContext?: Task[]
  /** Layer4の具体的リクエスト文字列 */
  request: string
}

/**
 * 4層構造のシステムプロンプトを構築する
 * Layer 1: soul.md全文（AI人格・行動不変条件）
 * Layer 2: user-profileの指定セクション（ユーザー特性）
 * Layer 3: タスクコンテキスト（CLEAREDタスクJSON等）
 * Layer 4: 具体的なリクエスト（今回の指示）
 */
export async function buildLayeredPrompt(
  options: LayeredPromptOptions,
  loadProfileSectionFn: (section: string) => Promise<string> = loadProfileSection
): Promise<string> {
  const { profileSections = [], taskContext = [], request } = options
  const separator = '\n\n---\n\n'

  // Layer 1: Soul
  const soul = (await loadSoul()) ?? ''

  // Layer 2: User Profile
  const profileParts: string[] = []
  if (loadProfileSectionFn && profileSections.length > 0) {
    for (const section of profileSections) {
      const content = await loadProfileSectionFn(section)
      if (content) profileParts.push(`### ${section}.md\n${content}`)
    }
  }
  const profile = profileParts.length > 0
    ? `## ユーザープロファイル\n${profileParts.join('\n\n')}`
    : ''

  // Layer 3: Task Context
  const context = taskContext.length > 0
    ? `## タスクコンテキスト\n\`\`\`json\n${JSON.stringify(taskContext, null, 2)}\n\`\`\``
    : ''

  // Layer 4: Request
  const layers = [soul, profile, context, request].filter(Boolean)
  return layers.join(separator)
}
