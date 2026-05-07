# Task-Hack ブランチ管理 & PR ワークフロー

> Task-Hack 開発における Git ブランチ戦略、コミット規約、PR 運用ルールをまとめたドキュメントです。

---

## ブランチ戦略: GitHub Flow

```
main ─────●────●────●────●──── (常にデプロイ可能)
           \  /  \  /  \  /
           feat/  fix/  ai/
```

- **`main`** は常にビルド可能・テスト通過の状態を維持
- すべての変更はフィーチャーブランチ → PR → main
- **ブランチの寿命は最大 1 週間** を目安（コンフリクト地獄の回避）
- マージ戦略: **Squash merge**（main の履歴を1PR=1コミットに保つ）

---

## ブランチ命名規約

```
<type>/<短い説明（kebab-case）>
```

| Type | 用途 | 例 |
|------|------|----|
| `feat/` | 新機能 | `feat/onboarding-wizard` |
| `fix/` | バグ修正 | `fix/ipc-handler-duplicate` |
| `refactor/` | リファクタリング | `refactor/extract-timer-hook` |
| `chore/` | ビルド・設定・依存関係 | `chore/update-electron-v35` |
| `docs/` | ドキュメントのみ | `docs/update-readme` |
| `ai/` | AI アシスタント作成のブランチ | `ai/add-tag-filter-ui` |

### AI 生成ブランチの扱い

Claude Code 等が自動生成する `claude/<random-name>` 形式のブランチは、**PR 作成前に `ai/<目的>` へリネーム**する。

```bash
# リネーム例
git branch -m claude/dreamy-napier-4f83ed ai/add-tag-filter-ui
```

---

## コミットメッセージ規約

```
<type>(<scope>): <説明>
```

### Type

| type | 意味 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング |
| `test` | テスト追加・修正 |
| `chore` | ビルド・設定 |
| `docs` | ドキュメント |

### Scope（任意）

| scope | 対象 |
|-------|------|
| `main` | Electron メインプロセス |
| `preload` | プリロードスクリプト |
| `dashboard` | Dashboard / Zone / FlightStrip |
| `chat` | ChatDrawer / useChat |
| `timer` | タイマー関連 |
| `timeline` | Timeline / タイムライン |
| `settings` | SettingsModal / 設定 |
| `sweep` | 週次スイープ / レポート |
| `context` | ユーザーコンテキスト / Soul |
| `dnd` | ドラッグ＆ドロップ |
| `deps` | 依存関係 |

### 例

```
feat(chat): add image paste preview before sending
fix(main): remove duplicate context:load IPC handler
test(dashboard): add zone limit overflow test
chore(deps): bump electron to v35.1.0
```

---

## PR ワークフロー

### 1. ブランチ作成

```bash
git checkout main
git pull origin main
git checkout -b feat/my-feature
```

### 2. 開発 → コミット

```bash
git add .
git commit -m "feat(dashboard): add task sorting by priority"
```

### 3. PR 作成

```bash
git push origin feat/my-feature
# GitHub で PR を作成（テンプレートが自動挿入される）
```

### 4. CI パス → オートマージ

- CI（テスト + 型チェック + ビルド）が通れば自動的にマージされる
- PR テンプレートのセルフレビュー・チェックリストを確認してから push すること

### 5. ブランチ削除

- GitHub 側: **Settings → General → "Automatically delete head branches"** を有効化
- ローカル:

```bash
git checkout main
git pull origin main
git fetch --prune
git branch -d feat/my-feature
```

---

## CI パイプライン

PR と main push 時に自動実行:

| Step | コマンド | 目的 |
|------|---------|------|
| TypeScript 型チェック | `npm run typecheck` | 型エラーの検出 |
| テスト | `npm test` | ユニットテスト全件パス |
| ビルド | `npm run build` | Electron ビルド成功 |

---

## IPC 整合性チェック（Task-Hack 固有）

IPC チャンネルを追加・変更する際は、**必ず以下の 3 ファイルを同時に更新**すること:

| ファイル | 役割 |
|---------|------|
| `src/main/index.ts` | `ipcMain.handle('channel:name', ...)` |
| `src/preload/index.ts` | `ipcRenderer.invoke('channel:name', ...)` |
| `src/renderer/` 内の呼び出し元 | `window.api.methodName(...)` |

> ⚠️ **過去の教訓**: マージコンフリクト解消時に IPC ハンドラーの重複登録が残り、後続のハンドラー登録が失敗するバグが発生した（`context:load` 二重登録事件）。コンフリクト解消後は `handleAddEmptyTask` のような重複宣言がないか必ず確認すること。

---

## マージ済みブランチの掃除

### 定期掃除コマンド

```bash
# リモートで削除済みのブランチ参照をローカルから除去
git fetch --prune

# マージ済みローカルブランチを一覧
git branch --merged main | findstr /V "main"

# マージ済みローカルブランチを削除
git branch --merged main | findstr /V "main" | ForEach-Object { git branch -d $_.Trim() }
```
