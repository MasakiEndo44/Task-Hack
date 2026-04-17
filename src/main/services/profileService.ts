import fs from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

export type ProfileSection = 'identity' | 'patterns' | 'goals' | 'insights'

const profileDir = () => join(app.getPath('home'), '.task-hack', 'profile')

const INITIAL_CONTENT: Record<ProfileSection, (userName: string, now: string) => string> = {
  identity: (u, d) => `# ユーザープロファイル: アイデンティティ\n\n## 基本情報\n名前: ${u}\n作成日: ${d}\n\n## 特性メモ\n（AIが観察から自動更新します）\n`,
  patterns: (_, d) => `# 行動パターン分析\n\n最終更新: ${d}\n\n## タスク完了パターン\n（スイープ実行時にAIが自動更新します）\n\n## 時間帯別傾向\n（観察中）\n`,
  goals: () => `# 目標と優先事項\n\n## 現在の目標\n（手動で入力するか、AIとの会話で設定します）\n`,
  insights: (_, d) => `# インサイトと学習\n\n最終更新: ${d}\n\n## 観察記録\n（スイープ実行時にAIが自動更新します）\n`,
}

export async function loadProfileSection(section: ProfileSection): Promise<string> {
  try {
    return await fs.readFile(join(profileDir(), `${section}.md`), 'utf-8')
  } catch (err: any) {
    if (err.code === 'ENOENT') return ''
    throw err
  }
}

export async function saveProfileSection(section: ProfileSection, content: string): Promise<void> {
  await fs.mkdir(profileDir(), { recursive: true })
  await fs.writeFile(join(profileDir(), `${section}.md`), content, 'utf-8')
}

export async function loadAllProfile(): Promise<Record<ProfileSection, string>> {
  const sections: ProfileSection[] = ['identity', 'patterns', 'goals', 'insights']
  const entries = await Promise.all(sections.map(async s => [s, await loadProfileSection(s)] as const))
  return Object.fromEntries(entries) as Record<ProfileSection, string>
}

export async function initProfileIfNeeded(userName: string): Promise<void> {
  const now = new Date().toISOString()
  await fs.mkdir(profileDir(), { recursive: true })
  for (const section of Object.keys(INITIAL_CONTENT) as ProfileSection[]) {
    const filePath = join(profileDir(), `${section}.md`)
    try {
      await fs.access(filePath)
    } catch {
      await fs.writeFile(filePath, INITIAL_CONTENT[section](userName, now), 'utf-8')
    }
  }
}
