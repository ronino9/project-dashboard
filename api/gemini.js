export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 없습니다.' });
    }

    const { projectTitle, historyData, reportStyle } = req.body;
    
    const systemInstruction = `
너는 산업자동화 및 배터리 공정 설비 프로젝트 관리를 맡고 있는 전문 PLC 제어 엔지니어이다.
다음 지침에 따라 날카롭고 프로페셔널한 한국어 분석 보고서를 작성해라:
1. '작업시간' 대비 '대기시간'의 비율을 검토하고 병목 요인을 짚어내라.
2. 현장 유관 부서에 즉각 보고할 수 있는 실행 가능한 액션 아이템 2~3개를 도출해라.
3. 마크다운 포맷으로 가독성 좋게 출력해라.
[대상 프로젝트]: ${projectTitle || '프로젝트'}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemInstruction }, { text: JSON.stringify(historyData || []) }] }]
      })
    });

    const apiData = await apiResponse.json();

    // 구글 AI 정상 응답 시
    if (apiData.candidates && apiData.candidates[0].content.parts[0].text) {
      return res.status(200).json({ report: apiData.candidates[0].content.parts[0].text });
    } else {
      // 구글 AI 거절 시 (거절 사유 화면 출력)
      return res.status(500).json({ error: `구글 AI 거절 사유: ${JSON.stringify(apiData)}` });
    }

  } catch (error) {
    console.error('서버 에러:', error);
    return res.status(500).json({ error: error.message });
  }
}
