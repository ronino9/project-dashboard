// api/gemini.js
export default async function handler(req, res) {
  // 1. CORS 및 POST 요청 허용 세팅
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  try {
    // 2. 금고에 숨겨둔 Gemini API 키 가져오기
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Vercel 환경 변수에 GEMINI_API_KEY가 설정되지 않았습니다.' });
    }

    // 3. 프론트엔드(대시보드)가 보내온 프로젝트 데이터 받기
    const { projectTitle, historyData, reportStyle } = req.body;

    if (!historyData || historyData.length === 0) {
      return res.status(400).json({ error: '분석할 이력 데이터가 없습니다.' });
    }

    // 4. AI에게 내릴 '엔지니어 맞춤형 지시문(System Prompt)' 조립
    const systemInstruction = `
너는 산업자동화 및 배터리 공정 설비 프로젝트 관리를 맡고 있는 전문 PLC 제어 엔지니어이자 PMO 분석가이다.
전달받은 [프로젝트 이력 데이터]는 구글 시트 기반의 관리 대시보드에서 파싱된 최신 실전 데이터이다.

다음 지침에 따라 날카롭고 프로페셔널한 한국어 분석 보고서를 작성해라:
1. '작업시간(h)' 대비 '대기시간(h)'의 비율을 직관적으로 검토하고, 공수(MD) 소진의 효율성을 진단해라.
2. 상세 부연설명 및 지연 사유를 추적하여 설비 해체 지연, 자재 입고 대기, 타 파트(기구/설계) 간섭, 고객사 상위 통신(MES) 매핑 지연 등 핵심 병목(Bottleneck) 요인을 명확히 짚어내라.
3. 관리자(김기연 과장님) 및 현장 유관 부서에 즉각 보고하고 대응할 수 있는 실행 가능한 액션 아이템(Action Item)을 2~3개 도출해라.
4. 문체는 격식 있고 신뢰감 주는 엔지니어링 톤앤매너를 유지하며, 보고서 형태로 가독성 좋게 마크다운(Markdown) 포맷으로 출력해라.

[선택된 보고 템플릿 유형]: ${reportStyle || '과장님 보고용 요약'}
[대상 프로젝트]: ${projectTitle || '알 수 없는 프로젝트'}
`;

    // 5. 구글 공식 Gemini API 엔드포인트 호출 (가장 안정적인 v1beta 버젼 활용)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemInstruction },
              { text: `[분석할 프로젝트 이력 데이터 JSON]\n${JSON.stringify(historyData, null, 2)}` }
            ]
          }
        ]
      })
    });

    const apiData = await apiResponse.json();

    // 6. AI가 생성한 텍스트 추출 후 프론트엔드로 반환
    if (apiData.candidates && apiData.candidates[0].content.parts[0].text) {
      const aiText = apiData.candidates[0].content.parts[0].text;
      return res.status(200).json({ report: aiText });
    } else {
      return res.status(500).json({ error: 'Gemini 응답 파싱 실패', details: apiData });
    }

  } catch (error) {
    console.error('서버 에러 발생:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.', message: error.message });
  }
}
