export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { projectTitle, historyData, mode } = req.body;

    // 모델 분기
    const model = mode === 'pro' 
      ? 'gemini-2.5-pro' 
      : 'gemini-2.5-flash-lite';

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `너는 산업 자동화 프로젝트 관리 전문가다.
아래 프로젝트 이력 데이터를 분석해서 다음 항목을 한국어로 보고해라.

1. 전체 공수(MD) 현황 및 업무 구분별 비중
2. 지연 중인 항목과 주요 지연 사유 패턴
3. Issue 발생 빈도 및 근본 원인
4. 리스크가 높은 구간 또는 항목
5. 담당자 보고용 한 줄 요약

[모드]: ${mode === 'pro' ? '심층 분석' : '빠른 요약'}
[프로젝트]: ${projectTitle}
[데이터]: ${JSON.stringify(historyData, null, 2)}`
          }] 
        }]
      })
    });

    const apiData = await apiResponse.json();
    if (apiData.candidates && apiData.candidates[0].content.parts[0].text) {
      return res.status(200).json({ report: apiData.candidates[0].content.parts[0].text });
    } else {
      return res.status(500).json({ error: 'AI 분석 실패: ' + JSON.stringify(apiData) });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
