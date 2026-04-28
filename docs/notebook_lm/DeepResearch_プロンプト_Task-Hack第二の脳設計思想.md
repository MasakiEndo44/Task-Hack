# Deep Research プロンプト
## 「AI駆動型タスク管理アプリTask-Hack：ユーザーの第二の脳として機能するための設計思想」

---

## 使用想定ツール

- **ChatGPT Deep Research**（推奨）
- **Perplexity Pro Deep Research**
- **Gemini Deep Research**

---

## プロンプト本文（そのままコピーして使用）

---

**Research Topic:**
"AI-driven task management as an automatic second brain: How task execution context can replace the motivation gap in personal knowledge management for ADHD-tendency users"

---

**Background & Problem Statement:**

Most personal knowledge management (PKM) systems — daily notes, Zettelkasten, Building a Second Brain (BASB), etc. — share a common failure mode for users with ADHD tendencies: they require **self-initiated, motivation-dependent behavior** to capture information. Daily journaling, tagging notes, writing reflections — all of these demand that the user actively decide to record, then sustain effort to do so.

For ADHD-tendency users, this creates a fundamental paradox:
- They need external memory systems MORE than neurotypical users (due to weaker working memory and poor autobiographical recall)
- Yet they are LEAST able to maintain the consistent, self-driven behavior that such systems require

The app I am building — "Task-Hack" — is designed to resolve this paradox through a different architectural approach:

**Core Hypothesis:** Rather than asking users to manually record their daily activities and thoughts (top-down capture), Task-Hack generates a **continuous stream of task context automatically from the bottom-up** — specifically, from the cycle of:
1. Task creation (via natural language AI chat, zero-friction input)
2. Task execution (Pomodoro-based, with timing and focus data)
3. Task completion (automatic archival to Obsidian Vault as Markdown)
4. AI synthesis (weekly sweep: pattern extraction, personal profile update, growth report)

The key insight: **a completed task is a unit of autobiographical data**. When aggregated and AI-synthesized over weeks and months, these task completion records become a rich, accurate, effortless personal knowledge base — a "second brain" that grew without the user ever intentionally "taking notes."

---

**Research Questions to Investigate:**

**1. Theoretical Foundation: Second Brain & PKM Systems**
- What does the research say about the limitations of voluntarist PKM approaches (GTD, BASB, Zettelkasten) for users with executive function deficits?
- How does "passive capture" or "ambient capture" differ from intentional note-taking in terms of cognitive load and adherence rates?
- Are there existing frameworks that treat task completion data as a form of personal knowledge capture?

**2. ADHD Neuroscience & Memory Systems**
- What is the current research on autobiographical memory deficits in ADHD? How does poor episodic memory affect self-understanding and behavior regulation?
- How does "external working memory" (externalization of cognitive functions to tools/systems) function as a compensatory strategy in ADHD?
- What is the evidence for "self-narrative fragmentation" in ADHD — the inability to maintain a coherent story of one's own achievements and patterns?
- Does retrospective achievement visibility (seeing what you've done) meaningfully affect dopamine response, motivation, or self-efficacy in ADHD users?

**3. The Motivation Gap in Daily Notes**
- Why do ADHD users specifically struggle to maintain daily journaling or daily notes practices, even when they believe in their value?
- What role does "activation gap" (initiation difficulty) play in the failure of self-reflection habits?
- Is there research on the psychological cost of "opening a tool that shows your failures" — shame accumulation in productivity tool design?
- Are there any studies on the difference between **effortful self-monitoring** vs. **automated behavioral tracking** for behavior change in ADHD populations?

**4. AI-Augmented Cognition & Context Generation**
- What is the current state of research on AI as "cognitive prosthetics" or "extended mind" tools for ADHD?
- How do tools like AI journal assistants, life-logging apps, or automatic activity trackers perform compared to manual journaling in terms of long-term adherence and insight generation?
- Is there precedent for systems that synthesize behavioral trace data (activity logs, completion records) into meaningful personal narratives using AI? What are the outcomes?
- What does research on "quantified self" movements reveal about the conditions under which automated self-tracking generates useful self-knowledge vs. becomes data noise?

**5. Design Principles for Friction-Minimized PKM**
- What are the design characteristics of PKM or journaling tools that successfully serve ADHD users long-term?
- How does the concept of "progressive summarization" (Tiago Forte) or "evergreen notes" (Andy Matuschak) need to be adapted for users who cannot initiate capture?
- What role does **AI-generated structure from unstructured data** (e.g., extracting themes from chat logs, task titles, completion timestamps) play in reducing the user's cognitive burden in PKM?
- Are there any published case studies or user research reports on AI-assisted personal knowledge management for neurodiverse users?

**6. The Obsidian Ecosystem as External Brain Infrastructure**
- How is Obsidian (local-first, Markdown-based) used within the PKM community as a "second brain" substrate?
- What are the documented barriers to Obsidian adoption for ADHD users, and how have community solutions attempted to address them?
- Is there evidence for the effectiveness of linking task management outputs (completed tasks, project archives) directly into a knowledge graph as a knowledge-building strategy?

---

**Key Concepts to Define and Explore:**

- **Second Brain** (Tiago Forte's BASB framework)
- **Zettelkasten** and atomic note-taking
- **External Autobiographical Memory** (concept of AI as memory prosthetic)
- **Activation Gap / Task Initiation Difficulty** (ADHD executive function)
- **Cognitive Offloading** (transferring cognitive tasks to external tools)
- **Extended Mind Theory** (Andy Clark & David Chalmers, 1998) — applied to ADHD
- **Passive vs. Active Knowledge Capture**
- **Ambient Awareness / Lifelogging**
- **Shame-triggered avoidance** in productivity tool design
- **Dopamine and retrospective achievement** (positive reinforcement loops)

---

**Expected Output Format:**

Please structure your research output as follows:

1. **Executive Summary** (300 words): The central finding — does evidence support the hypothesis that automated task context can serve as a viable substitute for intentional daily note-taking for ADHD-tendency users?

2. **Research Findings by Section** (organized by the 6 research question areas above): For each area, provide:
   - Key findings with citations
   - Relevant studies or expert perspectives
   - Gaps in existing research

3. **Synthesis: Design Implications for Task-Hack**
   - Which evidence most directly supports the core architecture (task completion → AI synthesis → second brain)?
   - What risks or failure modes does the research reveal?
   - What additional design features does the research suggest?

4. **Competitive Landscape**
   - Are there existing apps or tools that attempt a similar "automated second brain from task data" approach? How do they differ from Task-Hack's design?

5. **Open Questions & Future Research**
   - What remains unknown or contested that Task-Hack's development could help answer?

---

**Specific Sources to Prioritize (if available):**

- Barkley, R.A. — ADHD and executive function research
- Tiago Forte — "Building a Second Brain" (2022)
- Andy Matuschak — Evergreen Notes, Spaced Repetition, note-taking research
- Andy Clark & David Chalmers — "The Extended Mind" (1998)
- Brown, T.E. — "Smart but Stuck" (ADHD and working memory)
- Lifelogging / Quantified Self movement research (Gordon Bell, Jim Gemmell — "Total Recall")
- Research on AI journaling tools (e.g., "Replika", AI diaries, automated reflective systems)
- Obsidian community research / ADHD subreddit data on PKM tool adherence
- Any published research on "effortful vs. effortless self-tracking" in behavior change

---

**Language Note:**
Please conduct research in English for academic sources, but if highly relevant Japanese-language research exists (particularly on ADHD support tools or PKM in Japan), please include it as well. The final output should be in English.

---

*Total depth requested: Comprehensive. This research will directly inform the product vision and design decisions for Task-Hack. Depth and citation quality are prioritized over brevity.*

---

## プロンプト使用ガイド

### どのツールを選ぶか

| ツール | 向いているケース |
|---|---|
| **ChatGPT Deep Research** | 学術論文・書籍の精度重視。引用の正確さが必要な場合 |
| **Perplexity Pro** | 最新情報（2024-2025のブログ・コミュニティ動向）も含めたい場合 |
| **Gemini Deep Research** | Google Scholar連携で学術論文のカバレッジを最大化したい場合 |

### 推奨アプローチ

1. **まずChatGPT Deep Researchで実行**（学術的基盤を固める）
2. 結果を受け取ったら、「Section 4: Competitive Landscape」の部分をPerplexityで補完
3. 日本語資料が必要な場合はGeminiに日本語プロンプトで追加検索

### 研究結果の活用方法

Deep Researchで得た知見は以下に活用できます：

- **Task-Hackのビジョンドキュメント**の裏付けとなる参考文献
- **投資家・利用者向けピッチ**での根拠として
- **NotebookLM**に取り込み、Task-Hack説明ドキュメント群と合わせて「知識ベース」を構築
- **機能優先順位の意思決定**（研究が示すADHDユーザーに最も効く設計を特定）

---

## 補足：このリサーチが答えようとしている本質的な問い

**「なぜデイリーノートは続かないのか」**ではなく、**「続けなくていい仕組みはどう作るか」**

Task-Hackが挑戦しているのは、PKMの世界で長らく「ユーザーの意志と習慣の問題」として片付けられてきた課題を、**システム設計の問題として再定義すること**です。

タスクを完了するたびに自動的に文脈が生まれ、AIがそれを週次で合成し、ユーザーは気づいたら「自分のことを深く知っているAI秘書」を持っている——このサイクルが機能するかどうかを、先行研究が支持するかどうかを確認するのが、このDeep Researchの目的です。
