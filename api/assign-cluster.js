export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { issues, existingGroups } = req.body;
    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ error: 'issues 배열이 비어있습니다.' });
    }

    const existingGroupsText = (existingGroups && existingGroups.length > 0)
      ? JSON.stringify(existingGroups, null, 2)
      : '(기존 그룹 없음 — 전부 새 그룹으로 분류)';

    const prompt = `너는 산업 자동화 및 PLC 제어 설비 분야의 업무 분류 전문가다.
아래는 이미 확정된 "기존 그룹 목록"과, 새로 배정해야 할 "신규 업무 항목 목록"이다.

[기존 그룹 목록]
각 그룹은 code(고유 코드), examples(대표 제목 예시 1~2개), subParts(해당 그룹에 속한 세부파트 목록)로 구성된다.
${existingGroupsText}
[배정 규칙]
- 먼저 파트(파트 구분 필드)가 같은 항목들끼리만 같은 그룹으로 배정을 고려한다. 파트가 다르면 절대 같은 그룹에 배정하지 않는다.
- 신규 항목에 세부파트 필드가 있고, 기존 그룹의 subParts와 일치하지 않으면 그 그룹에 배정하지 않는다. 세부파트가 비어있는 항목은 이 규칙을 건너뛰고 제목/설명만으로 판단한다.
- 신규 항목의 제목/설명이 기존 그룹의 examples와 의미상 유사하면, 그 기존 그룹의 code를 그대로 배정한다.
- 설명(진행 사항) 필드가 판단의 핵심 근거다. 제목만으로 판단하지 말고 설명에 서술된 증상/원인/대상을 함께 비교해 유사도를 판단한다.
- 같은 부품/장비명이 언급되어도 근본 원인(로직 오류/센서 미감지/기구 간섭/통신 문제 등)이 다르면 기존 그룹에 억지로 배정하지 않는다.
- 어느 기존 그룹과도 명확히 유사하지 않으면, 새로운 code를 제안한다 (형식: 파트약어-키워드-3자리번호, 예: MES-NEW-001). 새 code는 기존 목록에 없는 것으로 만든다.
- 애매하면 기존 그룹에 억지로 넣지 말고 새 그룹으로 분리한다. 과도한 통합보다 과도한 분리가 안전하다.

[출력 규칙 — 매우 중요]
- 설명, 인사말, 마크다운, 코드블록 절대 금지
- 순수 JSON 객체만 출력
- 형식: {"assignments": [{"title": "원본 제목 그대로", "code": "배정된 코드"}, ...]}
- 입력된 신규 항목 전부에 대해 빠짐없이 assignments 배열에 포함시킨다

[신규 업무 항목 목록]
${JSON.stringify(issues, null, 2)}`;

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

    // 배정 작업은 처음부터 flash로 (pro는 대량 배치에서 시간 초과 위험이 확인됨)
    let modelUsed = 'gemini-2.5-flash';
    let result = await callGemini(modelUsed);

    if (!result.ok) {
      return res.status(500).json({ error: 'AI 배정 실패', modelUsed, detail: result.data });
    }

    const raw = result.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return res.status(500).json({ error: 'AI 응답 없음', modelUsed, detail: result.data });
    }

    let parsed;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      return res.status(500).json({ error: 'JSON 파싱 실패', modelUsed, raw });
    }

    return res.status(200).json({ assignments: parsed.assignments || [], modelUsed });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
