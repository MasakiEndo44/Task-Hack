# FB-005 修正計画 — Echo モード切替 + 手動スイープ後オーバーレイ

> 作成日: 2026-05-12
> ブランチ: `fix/echo-mode-and-sweep-overlay`
> 種別: fix
> 対応 FB: FB-005（項目6 + 項目7）

## 概要

FB-005 で報告された 2 件の不具合を修正する。

| # | 不具合 | 優先度 |
|---|---|---|
| 7 | 「Echoに詳細を聞いてもらう」ボタン押下後、タスク更新ではなく新タスクが生成される | P0 |
| 6 | 手動で週次スイープを実行した後、スイープレポートのオーバーレイが表示されない | P0 |

## 設計原則との整合

- 原則①: Echoの誤挙動が引き起こす混乱を除去し認知負荷を減らす
- 原則②: CLEAREDタスクの「離陸」をオーバーレイで視覚化し達成感を提供
- 原則③: スイープ後レポートは「AIが自動で届ける」体験にする

## 実装方針

### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/renderer/types/sweep.ts` | `SweepStatus` に `reportMd?: string`, `weekLabel?: string` を追加 |
| `src/main/services/sweepService.ts` | `sendProgress` の `done` フェーズに `reportMd`, `weekLabel` を含める |
| `src/renderer/App.tsx` | `onSweepProgress` の `done` 受信時に `setPendingReport` を呼ぶ |
| `src/renderer/components/ChatDrawer/ChatDrawer.tsx` | `keepMounted` 対応（調査結果による） |

## TDD ステップ

1. [ ] テストを書く（Red）
2. [ ] 実装する（Green）
3. [ ] リファクタリング（Refactor）

## 完了条件

- [ ] `npm test` 全件パス
- [ ] `npm run typecheck` エラーなし
- [ ] 動作確認済み
