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
- 의미가 유사하면 표현이 달라도 같은 그룹 (예: "HMI 터치 오프셋", "HMI 화면 터치 이상" → 같은 그룹)
- 각 그룹에 짧은 대표 이름과 영문 코드를 부여 (코드 형식: 파트약어-키워드-3자리번호, 예: HMI-ERR-001)
- 그룹의 심각도를 high/mid/low로 판단 (빈도가 높거나 여러 프로젝트에 걸쳐 있으면 high)

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

    // 1차: pro 시도
    let modelUsed = 'gemini-2.5-pro';
    let result = await callGemini(modelUsed);

    // pro가 할당량 초과(429)거나 실패하면 → flash로 폴백
    if (!result.ok) {
      const errCode = result.data?.error?.code;
      if (errCode === 429 || errCode === 400 || errCode === 500) {
        modelUsed = 'gemini-2.5-flash';
        result = await callGemini(modelUsed);
      }
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
