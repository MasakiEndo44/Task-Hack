import fs from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'
import OpenAI from 'openai'
import { CONTEXT_TEMPLATE } from '../templates/contextTemplate'

const dataDir = () => join(app.getPath('home'), '.task-hack')
const aiDir = () => join(dataDir(), 'ai')
const contextPath = () => join(aiDir(), 'user-context.md')

export async function loadUserContext(): Promise<string | null> {
  try {
    return await fs.readFile(contextPath(), 'utf-8')
  } catch (err: any) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

export async function saveUserContext(content: string): Promise<void> {
  await fs.mkdir(aiDir(), { recursive: true })
  await fs.writeFile(contextPath(), content, 'utf-8')
}

export async function initUserContextIfNeeded(userName: string): Promise<void> {
  const existing = await loadUserContext()
  if (existing) return

  const now = new Date().toISOString()
  let content = CONTEXT_TEMPLATE
    .replace(/\{\{userName\}\}/g, userName || 'User')
    .replace(/\{\{createdAt\}\}/g, now)

  // Migration from old profile
  try {
    const profileDir = join(dataDir(), 'profile')
    const stats = await fs.stat(profileDir).catch(() => null)
    if (stats && stats.isDirectory()) {
      const identity = await fs.readFile(join(profileDir, 'identity.md'), 'utf-8').catch(() => '')
      const patterns = await fs.readFile(join(profileDir, 'patterns.md'), 'utf-8').catch(() => '')
      const goals = await fs.readFile(join(profileDir, 'goals.md'), 'utf-8').catch(() => '')
      const insights = await fs.readFile(join(profileDir, 'insights.md'), 'utf-8').catch(() => '')

      const migrationNote = `\n\n> ⚠️ 過去のプロファイルからの移行データ\n`
      
      if (identity || patterns || goals || insights) {
         content += migrationNote
         if (identity) content += `\n## 移行: Identity\n${identity}`
         if (patterns) content += `\n## 移行: Patterns\n${patterns}`
         if (goals) content += `\n## 移行: Goals\n${goals}`
         if (insights) content += `\n## 移行: Insights\n${insights}`
      }
    }
  } catch (e) {
    console.error('Migration failed', e)
  }

  await saveUserContext(content)
}

export interface ContextInjectionResult {
  summary: string
}

export async function injectContext(apiKey: string, input: string): Promise<ContextInjectionResult> {
  let existingContext = await loadUserContext()
  if (!existingContext) {
    await initUserContextIfNeeded('User')
    existingContext = await loadUserContext()
    if (!existingContext) throw new Error('user-context.mdが初期化されていません。')
  }

  const openai = new OpenAI({ apiKey })

  const systemPrompt = `あなたはユーザーのコンテキスト（user-context.md）を管理するAIアシスタントです。
ユーザーからの新しい入力情報を解析し、既存のコンテキストファイルに適切にマージしてください。

【既存のコンテキスト】
\`\`\`markdown
${existingContext}
\`\`\`

【指示】
1. ユーザーの入力から、コンテキストとして記録すべき情報を抽出してください。
2. 既存のコンテキストの適切なセクション（Identity, Environment, Goals, Patterns, Insightsのいずれか）に追記または修正してください。
3. frontmatter（---で囲まれた部分）の \`lastUpdated\` を現在時刻に、\`updateCount\` を+1してください。
4. 変更箇所の短いサマリー（箇条書き、最大5行）を作成してください。

出力は以下のJSON形式のみとしてください（Markdownのコードブロックは不要です）:
{
  "updatedContext": "（更新後のuser-context.mdの全文）",
  "summary": "（変更箇所のサマリーテキスト）"
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `【新しい入力】\n${input}` }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  })

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}')
    if (parsed.updatedContext) {
      await saveUserContext(parsed.updatedContext)
    }
    return {
      summary: parsed.summary ?? 'コンテキストを更新しました。'
    }
  } catch (err) {
    throw new Error('AIの応答のパースに失敗しました。')
  }
}
