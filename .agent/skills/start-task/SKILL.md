---
name: start-task
description: >
  Task-Hack プロジェクトで新しいタスク（機能開発・バグ修正・リファクタリング等）を開始するワークフロー。
  「〇〇を実装したい」「このバグを直したい」「新しいタスクを始めたい」「ブランチを作りたい」という発言が出たら
  積極的にこのワークフローを使うこと。AGENTS.md の開発ワークフロー Step 1〜2 に対応する。
---

# Start Task Workflow

Task-Hack プロジェクトで新しいタスクの開発を開始するワークフロー。
ブランチ作成から実装計画書の雛形生成までを一貫して行う。

## 前提条件

- 作業ディレクトリ: `c:\Users\4093215\Documents\だいじなもの\Projects\Task-Hack`
- ブランチ戦略: `docs/BRANCHING_STRATEGY.md` 参照（GitHub Flow）
- 設計原則: `AGENTS.md` の7原則を常に念頭に置くこと

---

## Step 1: タスクの内容を把握する

ユーザーが着手したいタスクの内容を確認する。以下を明確にする：

1. **タスクの種別**: 機能追加（feat）・バグ修正（fix）・リファクタリング（refactor）・その他
2. **対象スコープ**: `dashboard`, `chat`, `timer`, `timeline`, `settings`, `sweep`, `context`, `dnd`, `deps`, `main`, `preload` のいずれか（複数可）
3. **短い説明**: ブランチ名に使用する kebab-case の説明（例: `add-empty-task-button`）

不明な点はユーザーに確認する。

---

## Step 2: 現在の git 状態を確認する

```powershell
git status --short
git branch --show-current
git log --oneline -5
```

- **未コミットの変更がある場合**: ユーザーに確認してから進む（stash するか先にコミットするか）
- **現在のブランチが main でない場合**: 一度 main に戻るべきか確認する

---

## Step 3: main を最新化してブランチを作成する

```powershell
git checkout main
git pull origin main
git checkout -b <type>/<short-description>
```

**ブランチ命名規約**（`docs/BRANCHING_STRATEGY.md` より）:

| Type | 用途 |
|------|------|
| `feat/` | 新機能 |
| `fix/` | バグ修正 |
| `refactor/` | リファクタリング |
| `chore/` | ビルド・設定変更 |
| `docs/` | ドキュメントのみ |
| `ai/` | AI アシスタントが主導する変更 |

> AI が主導して実装する場合は `ai/` プレフィックスを使用すること。

---

## Step 4: 実装計画書の雛形を生成する

`docs/superpowers/plans/` に実装計画書を作成する。

**ファイル名**: `YYYY-MM-DD-<branch-description>.md`（例: `2026-05-07-add-empty-task-button.md`）

**雛形**:

```markdown
# <タスクタイトル>

> 作成日: YYYY-MM-DD
> ブランチ: <branch-name>
> 種別: feat / fix / refactor / chore

## 概要

（何を・なぜ実装するか）

## 設計原則との整合

以下の7原則のうち、この変更が影響する原則を記載：
- 原則①: ...
- 原則⑤: ...

## 実装方針

### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/renderer/components/Xxx/Xxx.tsx` | ... |
| `src/renderer/hooks/useXxx.ts` | ... |

### IPC チャンネル（追加・変更がある場合のみ）

| チャンネル | main | preload | renderer |
|-----------|------|---------|----------|
| `xxx:yyy` | ✅ | ✅ | ✅ |

> ⚠️ IPC を追加・変更する場合は必ず3ファイルを同時に更新すること

## TDD ステップ

1. [ ] テストを書く（Red）
2. [ ] 実装する（Green）
3. [ ] リファクタリング（Refactor）

## 完了条件

- [ ] `npm test` 全件パス
- [ ] `npm run typecheck` エラーなし
- [ ] 動作確認済み
```

---

## Step 5: 開始サマリーをユーザーに報告する

以下の形式で報告する：

```
✅ タスク開始準備完了

ブランチ: <branch-name>
計画書: docs/superpowers/plans/<filename>.md

次のステップ:
1. テストを先に書く（TDD: Red フェーズ）
2. 実装する（Green フェーズ）
3. 完了したら /finish-task を実行
```

---

## 注意事項

- **ADHD設計原則を念頭に**: 変更がユーザーの認知負荷を増やす場合は一度立ち止まって確認する
- **IPC変更時**: `src/main/index.ts`, `src/preload/index.ts`, renderer の3ファイルを必ず同時に更新
- **コンポーネント単位**: 各コンポーネントは `ComponentName/ComponentName.tsx` + `ComponentName.module.css` のディレクトリ単位で管理
