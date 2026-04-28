# AGENTS.md — Task-Hack Development Guidelines

> **Task-Hack**: ADHDにとって最も使いやすいタスクアプリ。  
> 航空管制(ATC)メタファーとAI秘書の融合による、「余白のある机上」の実現。

---

## プロジェクト概要

Task-Hack は ADHD 当事者向けのデスクトップタスク管理アプリケーションです。航空管制 (ATC) システムの「フライトストリップ」メタファーを採用し、タスクの数を物理的に制限することで認知負荷を最小化します。

### 技術スタック

| レイヤー | 技術 |
|---------|------|
| デスクトップ基盤 | Electron |
| ビルドツール | Vite (`electron-vite`) |
| UIフレームワーク | React + TypeScript |
| スタイリング | Vanilla CSS (CSS Modules) |
| ドラッグ＆ドロップ | @dnd-kit/core, @dnd-kit/sortable |
| テスト | Vitest + @testing-library/react + jsdom |
| AI連携 (Phase 3) | OpenAI API (GPT-4o) |
| データ保存 (Phase 2) | ローカル JSON |

---

## 設計原則（7原則）

すべてのコード変更・UI 設計は、以下の 7 原則に準拠しなければなりません。

| # | 原則 | 解決する課題 |
|---|------|-------------|
| ① | 画面に存在するタスクの総量を、常に「安心できる量」に制限する | タスク回避行動・恥の累積 |
| ② | CLEAREDタスクは画面から「離陸」させ、ナレッジベースに「着陸」させる | ノイズの排除 |
| ③ | 「片付け」はユーザーの仕事ではない。AIが担う | 二次的タスクの排除 |
| ④ | タスクの入力は「対話」で行う。構造化はAIの責務 | 構造化入力の困難さ |
| ⑤ | すべての操作は1画面内で完結する。画面遷移は文脈記憶の破壊 | コンテキスト消失 |
| ⑥ | 時間は「管理するもの」ではなく「感じるもの」として設計する | 時間盲 |
| ⑦ | AI秘書はユーザーの「外部自伝メモリ」として成長する | 自己理解 |

> **判断に迷ったら**: 「この変更は ADHD 当事者の認知負荷を増やすか？」と問う。増やすなら却下する。

---

## プロジェクト構造

```
Task_Hack/
├── src/
│   ├── main/               # Electron メインプロセス
│   │   └── index.ts
│   ├── preload/             # プリロードスクリプト
│   │   └── index.ts
│   └── renderer/            # React レンダラープロセス
│       ├── components/      # UIコンポーネント（各コンポーネントはディレクトリ単位）
│       │   ├── Clock/       # リアルタイム時計
│       │   ├── Dashboard/   # 4ゾーン統括レイアウト + DnD Context
│       │   ├── FlightStrip/ # ATCフライトストリップカード
│       │   ├── StatusBar/   # ステータスバー（ゾーン数 + URG表示）
│       │   ├── Timeline/    # 横軸タイムライン + スイープライン
│       │   └── Zone/        # ゾーンコンテナ（Droppable + Sortable）
│       ├── hooks/           # カスタムフック
│       │   ├── useClock.ts  # リアルタイム時計
│       │   └── useTaskReducer.ts  # タスク状態管理
│       ├── styles/          # グローバルCSS + デザイントークン
│       │   ├── fonts.css
│       │   └── global.css
│       ├── types/           # 型定義
│       │   └── task.ts      # Task, ZoneType, Priority, ZONE_LIMITS
│       ├── utils/           # ユーティリティ
│       │   └── flightId.ts  # フライトID生成
│       ├── App.tsx          # ルートコンポーネント
│       └── main.tsx         # Reactエントリポイント
├── tests/                   # テストファイル（src配下をミラーリング）
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── docs/
│   ├── output/              # 要件定義書
│   └── superpowers/plans/   # 実装計画書
├── electron.vite.config.ts
├── vitest.config.ts
├── tsconfig.json            # プロジェクト参照（node + web）
├── tsconfig.node.json       # Electron main/preload用
└── tsconfig.web.json        # Renderer用（@renderer エイリアス）
```

---

## コーディング規約

### 言語・フレームワーク

- **TypeScript 厳格モード**: すべてのファイルで型安全性を保証する。`any` の使用は禁止。
- **React 関数コンポーネント**: クラスコンポーネント禁止。フック (`useState`, `useReducer`, `useCallback`, `useEffect`) を使用。
- **CSS Modules**: スタイルは `.module.css` ファイルで管理。インラインスタイルは動的値の場合のみ許可。

### CSS デザインシステム

- スタイルは必ず `global.css` で定義された CSS カスタムプロパティ（`--bg-primary`, `--zone-active` 等）を参照する。ハードコードされたカラー値は禁止。
- フォントは `--font-mono`（JetBrains Mono: データ表示用）と `--font-ui`（Inter: UI全般）の 2 種を使い分ける。

### コンポーネント設計

- 各コンポーネントはディレクトリ単位: `ComponentName/ComponentName.tsx` + `ComponentName.module.css`。
- Props は明示的に `interface` で定義する。
- テスト用に `data-testid` 属性を付与する（例: `data-testid="flight-strip-FS1234"`）。
- アクセシビリティ: `role`, `aria-label` 等を適切に付与する。

### 状態管理

- **useTaskReducer**: タスクの全状態を管理する唯一のソース。直接の `useState` でのタスク管理は禁止。
- アクション種別: `ADD_TASK`, `MOVE_TASK`, `COMPLETE_TASK`, `UNDO_COMPLETE`, `UPDATE_TASK`, `DELETE_TASK`
- ゾーン上限は `ZONE_LIMITS` 定数で管理。reducer 内で自動的に上限チェックを行う。

### ATCメタファーのルール

- タスクIDは `FS` + 4桁数字（例: `FS4219`）。`generateFlightId()` で生成。
- ゾーンは 4 種: `ACTIVE`（max 1）, `NEXT_ACTION`（max 5）, `HOLDING`（∞）, `CLEARED`（∞）
- 時刻表示は 24 時間制。フォントは必ず JetBrains Mono。

---

## テスト方針

- **テストフレームワーク**: Vitest + @testing-library/react
- **テスト配置**: `tests/` ディレクトリに `src/renderer/` の構造をミラーリング
- **最低限のカバレッジ**: 各コンポーネント・フック・ユーティリティに対してテストを書く
- **テスト実行**: `npm test`（単回実行）、`npm run test:watch`（ウォッチモード）

### テストの書き方

```typescript
// テストファイルはこのパターンに従う
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Component } from '@renderer/components/Component/Component'

describe('Component', () => {
  it('should render expected content', () => {
    render(<Component {...props} />)
    expect(screen.getByText('expected')).toBeInTheDocument()
  })
})
```

---

## 開発ワークフロー

1. **計画**: `docs/superpowers/plans/` に実装計画書を作成
2. **TDD**: テスト → 実装 → リファクタリングの Red-Green-Refactor サイクル
3. **コミット**: タスク単位でこまめにコミット。プレフィックス規約:
   - `feat:` 新機能
   - `fix:` バグ修正
   - `chore:` ビルド・設定変更
   - `docs:` ドキュメント
   - `refactor:` リファクタリング
4. **検証**: `npm test` で全テストが通ることを確認してからコミット

---

## 開発ロードマップ

| Phase | 内容 | ステータス |
|-------|------|-----------|
| Phase 1 | ATC型ダッシュボード（F1） | ✅ 完了 |
| Phase 2 | タイマー・保存・詳細画面（F2, F3, F5, F7） | ✅ 完了 |
| Phase 3 | AIチャット統合（F4） | ✅ 完了 |
| Phase 4 | ナレッジ蓄積と AI秘書（F6, F7） | ✅ 完了 |

---

## 参照ドキュメント

- [システム要件定義書](docs/output/task-hack-system-requirements.md) — 7原則、機能要件(F1-F7)、非機能要件
- [F1 実装計画書](docs/superpowers/plans/2026-04-16-f1-atc-dashboard.md) — タスク分解、TDD ステップ
