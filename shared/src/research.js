const JVIT_SERVICES = `# JV-IT提案サービス一覧

## 提案できる業務
- IT業務改善
- 業務システム開発
- Webシステム開発
- 既存システム改修
- Google Workspace活用支援
- Slack連携、業務自動化
- AI活用支援
- データ整理、レポート自動化
- ソフトウェア開発のラボ体制

## 得意な相談
- 手作業を減らしたい
- スプレッドシート運用を整理したい
- 社内システムを作りたい
- 既存業務をAIで効率化したい
- 営業やバックオフィスの定型作業を自動化したい

## 提案時の注意
- 相手企業の公開情報だけで断定しない
- 初回は課題確認を中心にする
- 押し売りではなく、業務整理の相談として提案する`;

export function parseJsonLoose(text) {
  const cleaned = String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

export function buildResearchPrompt(card, { enableGoogleSearch = true } = {}) {
  const researchInstruction = enableGoogleSearch
    ? "Google検索で会社の公式サイト、gBizINFO等の公的情報、信頼できるニュースを確認し、"
    : "Google検索は利用できません。モデルが確実に把握している情報と名刺OCR情報だけを使い、";

  return `あなたは日本企業向けB2B営業リサーチの専門家です。
${researchInstruction}
名刺の会社を特定してJV-ITの提案仮説と商談メール下書きを作成してください。

## 名刺OCR情報
- 氏名: ${card.name || ""}
- 会社名: ${card.company || ""}
- 部署: ${card.department || ""}
- 役職: ${card.title || ""}
- メール: ${card.email || ""}
- 名刺記載URL: ${card.companyUrl || ""}

## JV-ITのサービス
${JVIT_SERVICES}

## 厳守事項
- 公開情報だけで断定しない。事実と仮説を明確に分ける。
- 検索できない場合、最新性を確認できない情報は空文字にし、調査メモに「Web検索未実施」と書く。
- 公式サイト・公的DBを優先し、値ごとに出典URLを付ける。
- 確認できない値は空文字にする。推測値を会社情報の事実として書かない。
- 提案仮説はJV-ITサービス一覧にある内容だけを根拠にする。
- メールは押し売りにせず、課題確認と情報交換を目的にする。
- JSON以外は一切出力しない。

次のJSON構造のみを返してください:
{
  "companyIdentificationConfidence": "高|中|低",
  "companyInfo": {
    "調査日": "",
    "会社特定信頼度": "高|中|低",
    "名刺記載会社名": "",
    "正式会社名": "",
    "会社名カナ・英字名": "",
    "法人番号": "",
    "公式サイトURL": "",
    "問い合わせURL": "",
    "メールドメイン": "",
    "本社所在地": "",
    "拠点・支店": "",
    "代表者": "",
    "設立・創業": "",
    "資本金": "",
    "従業員数": "",
    "業種": "",
    "事業概要": "",
    "主なサービス・製品": "",
    "主な顧客・対象市場": "",
    "会社の特徴・強み": "",
    "最近のニュース・トピック": "",
    "IT・DX関連の公開情報": "",
    "名刺人物との接点": ""
  },
  "companyInfoEvidence": {
    "正式会社名": {"sourceUrl": "", "confidence": "高|中|低", "memo": ""}
  },
  "researchNotes": [""],
  "proposal": {
    "会社の特徴": "",
    "想定課題（仮説・未確認）": "",
    "JV-ITが提案できそうな内容": "",
    "提案理由": "",
    "初回商談で確認する質問": "",
    "優先度": ""
  },
  "emailDraft": {
    "subject": "",
    "body": "",
    "preSendChecks": [""]
  },
  "sources": [
    {"title": "", "url": "", "memo": ""}
  ]
}`;
}

export function extractGroundingSources(response) {
  const chunks =
    response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  const sources = [];

  for (const chunk of chunks) {
    const url = chunk?.web?.uri;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({
      title: chunk.web.title || url,
      url,
    });
  }

  return sources;
}

export function mergeGroundingSources(research, groundingSources) {
  const existing = Array.isArray(research.sources) ? research.sources : [];
  const byUrl = new Map();

  for (const source of [...existing, ...groundingSources]) {
    if (!source?.url || byUrl.has(source.url)) continue;
    byUrl.set(source.url, {
      title: source.title || source.url,
      url: source.url,
      memo: source.memo || "",
    });
  }

  return { ...research, sources: [...byUrl.values()] };
}
