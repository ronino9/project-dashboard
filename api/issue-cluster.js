export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { issues } = req.body;

    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ error: 'issues 배열이 비어있습니다.' });
    }

    const prompt = `너는 산업 자동화 및 PLC 제어 설비 분야의 이슈 분류 전문가다.
아래는 여러 프로젝트에서 수집된 'Issue' 항목 목록이다.
표현은 제각각이지만 본질적으로 같은 종류의 이슈를 하나의 그룹으로 묶어라.

[묶는 기준]
- 같은 파트(PLC/기구/검사/운영SW/전장/공동)에 속한 이슈들끼리만 그룹핑을 고려하라. 파트가 다르면 절대 같은 그룹으로 묶지 마라.
- 세부파트 필드가 있는 항목끼리는 세부파트가 다르면 절대 같은 그룹으로 묶지 마라. 세부파트가 비어있는 항목은 제목/설명만으로 판단하라.
- 같은 파트(및 세부파트) 내에서도, 의미가 유사하면 표현이 달라도 같은 그룹으로 묶어라. 판단은 제목보다 설명(진행 사항)에 서술된 증상/원인/대상을 우선 근거로 삼아라.
[분리 기준 - 매우 중요]
- 파트가 다르면 무조건 별도 그룹 (최우선 규칙)
- 세부파트가 다르면 무조건 별도 그룹 (두 번째 우선 규칙)
- 같은 파트·세부파트라도 근본 원인(로직/센서/기구간섭/통신 등)이 다르면 별도 그룹으로 분리하라
- 애매하면 통합하지 말고 분리하라

[출력 규칙 — 매우 중요]
- 설명, 인사말, 마크다운, 코드블록 절대 금지
- 순수 JSON 배열만 출력
- 각 요소: {"code": "...", "name": "...", "part": "...", "severity": "high|mid|low", "count": 숫자, "projects": ["OP7","OP6"], "members": ["원본제목1","원본제목2"]}
- count 내림차순 정렬

[이슈 목록]
${JSON.stringify(issues, null, 2)}`;

    // Gemini 호출 함수
    async function callGemini(model) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const data = await resp.json();
      return { ok: resp.ok, status: resp.status, data };
    }

    // 앞에서부터 순서대로 시도, 성공하는 첫 모델을 사용
    const MODELS = (process.env.GEMINI_MODELS || 'gemini-3.7-flash,gemini-3.5-flash,gemini-2.5-flash')
      .split(',').map(s => s.trim()).filter(Boolean);

    let modelUsed = null;
    let result = null;
    const attempts = [];

    for (const m of MODELS) {
      result = await callGemini(m);
      if (result.ok) { modelUsed = m; break; }

      const code = result.data?.error?.code;
      const msg  = result.data?.error?.message || '';
      attempts.push(`${m} → ${code || '?'} ${msg}`.slice(0, 250));

      // 키·권한 문제는 모델을 바꿔도 소용없으므로 즉시 중단
      if (code === 401 || code === 403) break;
    }

    if (!modelUsed) {
      return res.status(500).json({ error: 'AI 분석 실패', attempts });
    }

    const raw = result.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return res.status(500).json({
        error: 'AI 분석 실패',
        modelUsed,
        detail: result.data
      });
    }

    let parsed;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      return res.status(500).json({ error: 'JSON 파싱 실패', modelUsed, raw });
    }

    // 어떤 모델로 처리됐는지도 같이 반환 (디버깅·표시용)
    return res.status(200).json({ clusters: parsed, modelUsed });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
