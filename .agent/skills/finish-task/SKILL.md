---
name: finish-task
description: >
  Task-Hack プロジェクトでタスクの実装が完了したときのクローズワークフロー。
  「実装が終わった」「テストを通したい」「PRを出したい」「コミットしたい」「マージしたい」という発言が出たら
  積極的にこのワークフローを使うこと。AGENTS.md の開発ワークフロー Step 5〜6 に対応する。
---

# Finish Task Workflow

Task-Hack プロジェクトで実装が完了したタスクを検証・コミット・PR 作成まで一貫して行うワークフロー。
品質ゲートを通過してから main にマージするためのチェックポイントを提供する。

## 前提条件

- 作業ディレクトリ: `c:\Users\4093215\Documents\だいじなもの\Projects\Task-Hack`
- 実装が完了し、フィーチャーブランチ上で作業していること
- `docs/BRANCHING_STRATEGY.md` の PR ワークフローに準拠

---

## Step 1: 現在の状態を確認する

```powershell
git branch --show-current
git status --short
git diff --stat HEAD
```

- main ブランチのままの場合: フィーチャーブランチで作業するよう促す
- 大量の変更がある場合: ユーザーに内容を確認してから進む

---

## Step 2: 品質ゲートを実行する

以下を順番に実行し、**すべて通過するまで次のステップに進まない**:

### 2-1. TypeScript 型チェック

```powershell
npm run typecheck
```

エラーがある場合は修正してから再実行。

### 2-2. テスト全件実行

```powershell
npm test
```

失敗しているテストがある場合は修正してから再実行。

> **TDD の原則**: テストが通ることを確認してからコミットすること。
> テストを省略したり、failing テストを残したままコミットしてはいけない。

---

## Step 3: IPC 整合性チェック（IPC 変更がある場合）

`git diff --name-only HEAD` で変更ファイルを確認し、IPC 関連の変更があれば以下を必ずチェック:

| チェック項目 | ファイル |
|------------|---------|
| `ipcMain.handle()` の追加・変更 | `src/main/index.ts` |
| `ipcRenderer.invoke()` の追加・変更 | `src/preload/index.ts` |
| `window.api.xxx()` の呼び出し | `src/renderer/` 内の該当ファイル |

**重複登録チェック**: 同じチャンネル名の `handle()` が複数登録されていないか確認する。
（過去に `context:load` の二重登録でバグが発生した教訓）

---

## Step 4: 変更内容をレビューする

```powershell
git diff --stat HEAD
git log --oneline main..HEAD
```

変更内容を確認し、意図しない変更が含まれていないかチェックする。

---

## Step 5: コミットする

### コミットメッセージの形式

```
<type>(<scope>): <説明>
```

**type**: `feat` | `fix` | `refactor` | `test` | `chore` | `docs`

**scope**: `main` | `preload` | `dashboard` | `chat` | `timer` | `timeline` | `settings` | `sweep` | `context` | `dnd` | `deps`

**例**:
```
feat(dashboard): add empty task creation button
fix(main): remove duplicate context:load IPC handler
test(dashboard): add zone limit overflow test
```

コミットを実行:

```powershell
git add .
git commit -m "<type>(<scope>): <説明>"
```

複数の論理的変更がある場合は、適切な粒度で複数コミットに分割することを検討する。

---

## Step 6: ブランチ名を確認・修正する

現在のブランチ名が `ai/` または規約に沿っているか確認:

```powershell
git branch --show-current
```

`claude/<random-name>` 形式の場合は `ai/<目的>` にリネーム:

```powershell
git branch -m claude/dreamy-napier-4f83ed ai/add-empty-task-button
```

---

## Step 7: リモートに push して PR を作成する

```powershell
git push origin <branch-name>
```

PR 作成の案内:

```
GitHub で PR を作成してください:
URL: https://github.com/MasakiEndo44/Task-Hack/compare/<branch-name>

PR タイトル例: feat(dashboard): add empty task creation button

PR 本文には PR テンプレート（.github/pull_request_template.md）が
自動挿入されます。セルフレビューチェックリストを必ず確認してください。
```

---

## Step 8: 完了サマリーをユーザーに報告する

```
✅ タスク完了

ブランチ: <branch-name>
コミット: <commit hash> - <message>
品質ゲート:
  ✅ TypeScript 型チェック
  ✅ テスト全件パス

次のステップ:
- GitHub で PR を作成し、CI が通ることを確認
- CI（typecheck + test + build）が通れば自動マージ
- マージ後にブランチを削除:
    git checkout main
    git pull origin main
    git fetch --prune
    git branch -d <branch-name>
```

---

## 注意事項

- **テストなしでのコミットは禁止**: たとえ小さな変更でも `npm test` を通すこと
- **型エラーのあるコミットは禁止**: `npm run typecheck` を必ず通すこと
- **ブランチの寿命**: 最大 1 週間を目安（コンフリクト地獄の回避）
- **Squash merge**: CI パス後は Squash merge で main に取り込む（1PR = 1コミット）
