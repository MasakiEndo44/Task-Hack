# Phase 3 完了レポート：F4 AIチャット統合

> 作成日: 2026-04-17

---

## 概要

Phase 3「AIチャット統合」の全実装が完了した。目標である「入力のハードルゼロ」「着手の壁の破壊」を実現するAI秘書のコア能力が動作状態に達している。

---

## 実装済み機能一覧（F4要件対応）

| 要件ID | 要件名 | 状態 | 備考 |
|--------|--------|------|------|
| F4.1 | チャットUI（下部ドロワー） | ✅ 完了 | 画面遷移なし、スライドアップ実装済み |
| F4.2 | 自然言語からのタスク分解・生成 | ✅ 完了 | MECE分解ルール + 2H/タスク上限 |
| F4.3 | 画像ペーストからのタスク生成 | ✅ 完了 | base64変換→Vision API対応 |
| F4.4 | インタラクティブ・フィードバック | ✅ 部分完了 | 受動型（話しかけ時のみ）で実装 |
| F4.5 | タスク確認フロー | ✅ 完了 | 個別追加 + 全件追加の2段階承認 |
| F4.6 | タスク優先度提案 | ✅ 完了 | system prompt内でURG/NRM判断を指示 |
| F4.7 | コンテキスト維持 | ✅ 完了 | セッション内チャット履歴 + ボード状態注入 |

---

## 実装の詳細

### 1. ストリーミングレスポンス

**変更前**: `openai.chat.completions.create()` で全文生成後に一括返答（体感5〜10秒の沈黙）

**変更後**: `openai.chat.completions.stream()` → `webContents.send('chat-chunk')` でトークン単位にRendererへプッシュ

- 初回トークン表示: 約0.5〜1秒（非機能要件「2秒以内」を達成）
- `ipcMain.handle('startChatStream')` + `ipcRenderer.on('chat-chunk/done/error')` の双方向ブリッジ

### 2. 動的 system prompt（ボードコンテキスト注入）

毎回の送信時にリアルタイムで以下を注入：

```
## 現在の状況
- 日時: 2026年4月17日（金）09:21
- ACTIVE（進行中）: プレゼン資料の最終確認【緊急】
- NEXT（次のアクション）: 3件 — メールチェック、API設計レビュー、ドキュメント更新
- HOLDING（待機中）: 2件
```

これによりAIが「今のボード状態を踏まえた提案」が可能になった。

### 3. MECEタスク分解

**問題**: 「チャット履歴を抽出して、エクセルにまとめて、資料化する」→ AIが1件しか提案しなかった

**対処**: system promptに以下を明文化

```
【MECE分解ルール（最重要）】
- 複数の作業が含まれる場合、必ずすべてを個別タスクとして列挙する
- 一部だけ提案して残りを省略することは禁止
- 例：「抽出して、まとめて、資料化する」→ 3つのタスクとして提案
```

**判断基準の分岐も追加**:
- 期限・内容が明示されている → 即座に全タスク提案
- 不明な場合 → 1つだけ確認してから提案

### 4. タスク提案カード（UIリデザイン）

**新JSONスキーマ**:
```json
{
  "tasks": [
    {
      "title": "チャット履歴の抽出",
      "estimatedMinutes": 60,
      "priority": "NRM",
      "scheduledStart": "2026-04-18T10:00:00",
      "subtasks": [
        {"title": "対象チャットツールを確認"},
        {"title": "エクスポート方法を調べる"}
      ],
      "notes": "Slackのエクスポート権限を事前確認"
    }
  ]
}
```

**カード表示の変更点**:
- 各タスクに着手日（`📅 4/18(金) 10:00 着手`）を表示
- サブタスク最大3件（着手の足がかり）を表示
- メモ欄を表示
- 「+ 追加」ボタンを**白背景・白ボーダー**で視認性改善
- 複数タスク時は「全N件を追加」ボタンで一括承認

### 5. 日本語IME対応 + 画像添付

- `onCompositionStart/End` + `e.nativeEvent.isComposing` でIME変換中Enterの誤送信を修正
- 📎ボタン → FileReader.readAsDataURL → OpenAI Vision API形式（`image_url` content type）

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|----------|
| `src/main/index.ts` | ストリーミングIPC handler（`startChatStream`） |
| `src/preload/index.ts` | streaming bridge（`onChatChunk/Done/Error`, `offChatListeners`） |
| `src/preload/index.d.ts` | 型定義を全API対応に更新 |
| `src/renderer/hooks/useChat.ts` | 動的system prompt生成 + ストリーミング受信 + ボードコンテキスト |
| `src/renderer/components/ChatDrawer/ChatDrawer.tsx` | IME対応 + 画像添付UI + tasks prop |
| `src/renderer/components/ChatDrawer/ChatDrawer.module.css` | 📎ボタン・プレビュー・inputRowスタイル |
| `src/renderer/components/ChatDrawer/TaskProposal.tsx` | 新スキーマ対応 + 詳細表示 + 個別/一括承認 |
| `src/renderer/components/ChatDrawer/TaskProposal.module.css` | 白ボタン + 詳細セクションスタイル |
| `src/renderer/App.tsx` | tasks→ChatDrawerに渡す |

---

## 動作確認済み項目

- [x] 日本語IME変換中のEnterで送信されないこと
- [x] Shift+Enterで改行されること
- [x] 📎ボタンからPNG/JPGを選択→プレビュー表示
- [x] ×ボタンで添付画像を削除
- [x] 画像+テキスト送信→AIが画像内容を認識した返答
- [x] チャット返答が文字ごとにストリーミング表示
- [x] 「プレゼンの準備しなきゃ」→AIが期限を質問
- [x] 期限・作業内容を明示→AIが即座に全件タスク提案
- [x] タスク提案カードに着手日・サブタスク・メモが表示
- [x] 「+ 追加」ボタンが白で視認性高い
- [x] 個別追加・全件追加ともにNEXT_ACTIONゾーンに反映

---

## 未実装・次フェーズ以降

| 項目 | 理由 | 対応フェーズ |
|------|------|------------|
| AI秘書の成長（ユーザープロファイル参照） | F6（週次スイープ）が前提 | Phase 4 |
| 能動型ボディ・ダブリング（AIからの声かけ） | タイマーイベント連携が必要 | Phase 4 |
| チャット履歴の永続化（セッションまたぎ） | F5.3要件。現状はセッション内のみ | Phase 4 |
| APIキーのOS Keychain暗号化保存 | 現状はプレーンJSONファイル | Phase 4 |

---

## コミット履歴

```
12b68f0 feat: streaming AI chat with MECE decomposition and rich task proposals
4c46925 fix: Japanese IME support and image attachment for AI chat
b43dcd2 feat: interactive task proposal approval
626ff11 feat: add bottom chat drawer and useChat hook
5b535c1 feat: add openai api key into settings modal
0e2ecf2 feat: add openai backend and settings ipc for chat
```
