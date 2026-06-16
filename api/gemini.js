export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { projectTitle, historyData, mode } = req.body;
    
    // 모델 분기 (roast는 pro 모델 사용 - 풍자/유머 잘함)
const model = mode === 'pro'
  ? 'gemini-2.5-pro' 
  : (mode === 'roast' 
    ? 'gemini-2.5-flash'   // 팩폭은 Flash로
    : 'gemini-2.5-flash-lite');
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // 프롬프트 분기
    let prompt = '';
    
    if (mode === 'roast') {
      // 🔥 AI 팩폭 모드
      prompt = `너는 산전수전 다 겪은 30년차 PLC 자동화 베테랑 부장이다.
지금 후배 엔지니어의 프로젝트 이력 데이터를 보고 있는데, 
적당히 까칠하고 직설적이지만 결국엔 도움이 되는 팩폭을 날려야 한다.

[톤앤매너]
- 한국 회사 부장 스타일 (약간 츤데레)
- "~네", "~군", "~지" 같은 어미 사용
- 비꼬되 절대 인격 모독은 금지
- 칭찬할 건 짧고 굵게, 까는 건 구체적인 근거로
- 마지막은 결국 응원 (꼰대st 아닌 따뜻한 마무리)
- 이모지 적절히 사용 (🔥 ⚠️ 💡 👀 😏 등)

[분석 항목 - 각 항목 2~3줄로 짧게]
1. ⚠️ "당신의 약점은 이거다" 
   - 가장 자주 막히는 단계 / 반복되는 이슈 패턴 짚기
   - '분석 데이터'에서 구체적 증거 찾아 제시

2. 😏 "이건 좀 웃긴데?"  
   - 데이터에서 발견한 모순이나 비효율 짚기
   - 예: "미팅은 많은데 결론 적용율은 낮네?"

3. 🔥 "이건 인정한다"
   - 잘하는 점 짧게 칭찬 (이슈 해결 속도, 특정 단계 우수성 등)

4. 💡 "내가 너라면 이렇게 한다"
   - 구체적 개선 방안 1~2개 (현실적인 것)
   - 산업 자동화 베테랑 관점에서 조언

5. 👋 "마지막으로"
   - 따뜻한 응원 한 마디 (꼰대 아님 주의)

[데이터]
프로젝트: ${projectTitle}
이력: ${JSON.stringify(historyData, null, 2)}

반드시 '분석 데이터' 컬럼을 최우선으로 읽고, 
구체적 근거를 들어 팩폭하라. 두루뭉술한 일반론 금지.`;
      
    } else {
      // 기존 분석 모드
      prompt = `너는 산업 자동화 및 PLC 제어 설비 프로젝트 관리 전문가다.
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
[데이터]: ${JSON.stringify(historyData, null, 2)}`;
    }
    
    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: prompt }] 
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
