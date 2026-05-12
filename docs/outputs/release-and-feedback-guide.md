# Task-Hack 配布・検証ガイド（個人運用）

## 目的
- 自分用に配布可能な Windows インストーラ（`.exe`）を生成する。
- バージョン管理を前提に 1 週間の検証を回し、仕様改善につなげる。

## バージョン運用ルール
- バージョンは `package.json` の `version` を単一ソースとする。
- 更新時は `npm version patch` を基本とする。
  - 小修正: `patch`（例: 0.1.0 -> 0.1.1）
  - 後方互換あり機能追加: `minor`
  - 破壊的変更: `major`
- リリース成果物は `release/<version>/` に出力する。
- FB チェックリストはバージョンごとに複製して保存する（例: `fb-checklist-v0.1.1.md`）。

## インストーラ作成手順（Windows）
1. 依存関係の準備
   - `npm install`
2. 品質確認
   - `npm test`
   - `npm run build`
3. インストーラ生成
   - `npm run build:win`
4. 生成物確認
   - `release/<version>/Task-Hack-Setup-<version>.exe`

## 1週間の検証フロー
1. Day 0: `npm version patch` でテスト版を固定し、`.exe` を作成
2. Day 1-7: `docs/output/fb-checklist-template.md` を毎日更新
3. Day 7: 重要度順に改善項目を整理し、次バージョン要件を確定
4. 改善実装後、再度 `patch` を上げて同じ手順で再配布

## 仕様修正への反映ルール
- 優先度 `P0`（クラッシュ/データ消失）を最優先で次バージョンへ反映
- `P1`（主要導線の不便）は 1 スプリント以内に反映
- `P2`（改善提案）は 2 回以上再発/再要望で採用検討
- 修正内容は「原因 -> 対応 -> 検証結果」を 1 行で記録
