import fs from 'fs/promises'
import { join, resolve } from 'path'
import { homedir } from 'os'
import type { Task } from '../../renderer/types/task'

export function resolveVaultPath(vaultPath: string): string {
  if (vaultPath.startsWith('~/')) return join(homedir(), vaultPath.slice(2))
  return resolve(vaultPath)
}

export async function validateVaultPath(
  vaultPath: string
): Promise<{ valid: boolean; error?: string }> {
  if (!vaultPath.trim()) return { valid: false, error: 'パスが入力されていません' }
  const absPath = resolveVaultPath(vaultPath)
  try {
    const stat = await fs.stat(absPath)
    if (!stat.isDirectory()) return { valid: false, error: 'ファイルではなくフォルダを指定してください' }
    await fs.access(absPath, fs.constants.W_OK)
    return { valid: true }
  } catch (err: any) {
    if (err.code === 'ENOENT') return { valid: false, error: 'フォルダが存在しません' }
    if (err.code === 'EACCES') return { valid: false, error: '書き込み権限がありません' }
    return { valid: false, error: err.message }
  }
}

/**
 * ISO 8601週番号ラベルを生成する
 * 例: new Date('2026-04-17') → "2026-W16"
 */
export function getWeekLabel(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export async function writeWeeklyReport(
  vaultPath: string,
  weekLabel: string,
  content: string
): Promise<string> {
  const dir = join(resolveVaultPath(vaultPath), 'weekly-reports')
  await fs.mkdir(dir, { recursive: true })
  const filePath = join(dir, `${weekLabel}.md`)
  await fs.writeFile(filePath, content, 'utf-8')
  return filePath
}

export async function writeArchiveMd(
  vaultPath: string,
  weekLabel: string,
  content: string
): Promise<string> {
  const dir = join(resolveVaultPath(vaultPath), 'archive')
  await fs.mkdir(dir, { recursive: true })
  const filePath = join(dir, `${weekLabel}_tasks.md`)
  await fs.writeFile(filePath, content, 'utf-8')
  return filePath
}

export async function writeUserProfileSection(
  vaultPath: string,
  section: string,
  content: string
): Promise<void> {
  const dir = join(resolveVaultPath(vaultPath), 'user-profile')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(join(dir, `${section}.md`), content, 'utf-8')
}

export async function syncSoulToVault(vaultPath: string, soulContent: string): Promise<void> {
  const dir = join(resolveVaultPath(vaultPath), 'ai')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(join(dir, 'soul.md'), soulContent, 'utf-8')
}

export async function writeLocalArchive(
  dataDir: string,
  weekLabel: string,
  tasks: Task[]
): Promise<string> {
  const dir = join(dataDir, 'archive')
  await fs.mkdir(dir, { recursive: true })
  const filePath = join(dir, `${weekLabel}.json`)
  await fs.writeFile(filePath, JSON.stringify(tasks, null, 2), 'utf-8')
  return filePath
}
