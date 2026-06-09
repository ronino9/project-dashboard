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
text: `너는 산업 자동화 및 PLC 제어 설비 프로젝트 관리 전문가다.
아래 프로젝트 이력 데이터를 분석해서 다음 항목을 한국어로 보고해라.

* 중요 지시사항: 현장의 실제 이슈, 지연/대기 사유, 조치 방안, 개선 효과 등 구체적인 맥락은 반드시 각 행의 '분석 데이터' 항목을 최우선으로 읽고 분석해라.

[보고 항목]
1. 전체 공수(MD) 현황 및 업무 구분(표준/개선/Issue 등)별 비중
2. 지연 및 초과 패턴 분석: '분석 데이터'를 바탕으로 주요 지연/초과 원인과 반복되는 병목 패턴을 도출할 것.
3. 해결 방안 및 유사 사례 인사이트: 지연/초과/Issue 항목에 대한 구체적인 대응 방안을 제시할 것. 특히, 제어 로직 최적화나 모션 모듈 에러 등 산업 자동화 분야의 유사 사례나, 다른 프로젝트에서 적용될 법한 모범 해결 패턴을 서치하여 함께 언급해 줄 것.
4. 개선 성과 요약: '분석 데이터'에 기록된 개선 조치들을 분석하여, 프로젝트 효율(공수 절감, 가동률 상승 등)에 기여한 바를 명확히 짚어줄 것.
5. 리스크 구간 및 향후 일정 ('분석 데이터'의 추후 계획, 원격 업데이트 예정 등 반영)
6. 담당자(팀장/경영진) 보고용 핵심 한 줄 요약

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
