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

* 중요 지시사항: 현장의 실제 이슈, 지연/대기 사유, 개선 효과, 추후 계획 등 구체적인 맥락을 파악할 때는 반드시 각 행의 '분석 데이터' 항목에 작성된 텍스트를 최우선으로 읽고 분석해라.

[보고 항목]
1. 전체 공수(MD) 현황 및 업무 구분(표준/개선/Issue 등)별 비중
2. 주요 지연/초과 원인 및 패턴 (특히 '분석 데이터'의 대기, 지연, 초과 키워드 집중 분석)
3. Issue 해결 및 개선 작업의 핵심 성과 ('분석 데이터'의 조치, 효과 키워드 요약)
4. 리스크가 높은 구간 또는 향후 주요 계획 ('분석 데이터'의 계획, 예정 키워드 참고)
5. 담당자(팀장/경영진) 보고용 한 줄 요약

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
