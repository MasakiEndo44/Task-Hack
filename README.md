# Task-Hack

> ADHDにとって最も使いやすいタスクアプリとは何か？
> 航空管制(ATC)メタファーとAI秘書の融合による、「余白のある机上」の実現

Task-Hack は、ADHD 当事者が直面する「タスク管理の壁」を根本から解決するために設計された、新感覚のタスクマネジメント・アプリケーションです。従来の ToDo アプリが陥りがちな「完了タスクの山による自己嫌悪（恥の累積）」や「巨大なタスクに対する麻痺（Activation Gap）」を解消するため、航空管制（ATC）のUIメタファーと最新のAIを融合させました。

## 🎯 なぜ Task-Hack なのか？

ADHD 脳にとって、タスクの「管理」は目的ではありません。最大の壁は「着手（Activation）」です。
Task-Hack は、以下の7つの設計原則により、脳の実行機能を強力に外部化します。

1. **上限制限（Max Limits）**: 画面に表示されるタスク総量を常に「安心できる量」に制限。
2. **完了タスクの離陸**: 終わったタスクは画面から消去し、自動的に Obsidian のナレッジベースへ記録。
3. **AIによる「片付け」**: 週次のアーカイブ作業はすべてAIが自動で実行。
4. **構造化の外部化**: 自然言語や画像ペーストのやり取りから、AIがタスクを自動生成。
5. **1画面完結**: 画面遷移による文脈記憶の破壊を防止。
6. **時間の視覚化（Visual Scaffolding）**: 大きなタスクはAIが分解し、タイムラインに色付きの足場として配置。
7. **擬似ボディ・ダブリング**: AIがローカルで穏やかな声かけ・報酬を与え、孤独下でのタスク麻痺を防止。

## 🚀 主な機能

* **ATC型ダッシュボード**: ACTIVE（最大1個）、NEXT ACTION（最大5個）、HOLDING、CLEARED の4つのゾーンをD&Dで直感的に操作。
* **フライトストリップ型カード**: 情報過多を防ぐ、必要最小限のタスクカード。
* **AI Co-planner**: チャットで雑に投げた目標を、AIが具体的な最小ステップに分解（着手支援）。
* **可変長タイマー**: 「今日の集中力」に合わせて選べるポモドーロタイマー（ラップアップ通知付き）。
* **Obsidian連携**: 完了したタスク履歴を週次で分析し、自分だけの「取扱説明書」として Obsidian に自動生成。
* **Sensory Control（感覚過負荷の排除）**: 動きや透明度を抑え、認知負荷の低い穏やかなUIデザイン。

## 🛠 技術スタック

* **インフラ**: Electron (Desktop App)
* **ビルド**: Vite (`electron-vite`)
* **フロントエンド**: React 18, TypeScript
* **スタイリング**: Vanilla CSS Modules (Custom Properties & Design Tokens)
* **ドラッグ＆ドロップ**: `@dnd-kit/core`, `@dnd-kit/sortable`
* **AI 連携**: OpenAI API (GPT-4o)
* **テスト**: Vitest, React Testing Library
* **データストレージ**: Local JSON, Obsidian Vault (Markdown)

## 📦 インストールと起動

本プロジェクトは Node.js 環境が必要です（v18以上推奨）。

```bash
# リポジトリのクローン
git clone https://github.com/MasakiEndo44/Task-Hack.git
cd Task-Hack

# パッケージのインストール
npm install

# 開発サーバーの起動（Electronアプリが起動します）
npm run dev
```

## 🧪 テストの実行

```bash
# テストの実行
npm test

# ウォッチモードで実行
npm run test:watch
```

## 📦 Windowsインストーラ（.exe）作成

```bash
# 品質確認
npm test
npm run build

# .exe インストーラ作成
npm run build:win
```

- 出力先: `release/<version>/Task-Hack-Setup-<version>.exe`
- バージョンは `package.json` の `version` を使用

## 📝 1週間FB検証テンプレート

- 運用ガイド: `docs/output/release-and-feedback-guide.md`
- FBチェックリストひな型: `docs/output/fb-checklist-template.md`

## 🗺 開発ロードマップ

* **[Phase 1] MVP Core**: ATC型ダッシュボード、フライトストリップUI、D&D操作（✅ 実装済）
* **[Phase 2] Data & Timer**: ローカルJSON保存、タイマー機能、詳細画面UI、ユーザ設定（✅ 実装済）
* **[Phase 3] AI Chat**: AIチャットUI、自然言語からのタスク自動分解・生成
* **[Phase 4] AI Growth**: Obsidian連携、週次AIスイープ、ユーザープロファイルの自動更新

## 📜 ライセンス

このプロジェクトは個人利用を前提として開発されています。
