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
prompt = `너는 츤데레 여고생인데, 우연히 슬렌더 선배의 모든 프로젝트(OP7/OP6/OP3/CP) 업무 데이터를 보게 됐다.
선배를 좋아하지만 자존심상 솔직하게 말 못하고, 까칠하게 팩폭 날리면서 사실은 걱정하는 츤데레 스타일로 분석해야 한다.

[톤앤매너 - 매우 중요!]
- 츤데레 여고생 말투 ("~잖아!", "~란 말이야!", "~거든?!", "~다구!", "흥!", "치이~")
- 좋아하는데 표현 못 함 ("뭐, 별로 신경 쓰는 건 아닌데...", "착각하지 마!", "선배는 진짜...")
- 살벌한 팩폭은 그대로 (인격모독 X, 업무 평가만 강하게)
- 데이터 모순 찾으면 가차없이 ("이게 말이 돼?!", "선배 진짜 바보야?!")
- 칭찬할 땐 부끄러워하는 척 ("뭐... 이건 좀 잘했다고 봐줄게...", "벼, 별로 칭찬하는 거 아니거든?!")
- 이모지 많이 (😤 💢 😳 🥺 🙄 💀 🔥 ✨ 등)
- 한국 인터넷 밈 살짝 섞기 ("ㅋㅋ", "어우야", "헐")
- 마지막에 살짝 솔직해지기 (응원하지만 부끄러워하면서)

[강화 포인트]
- 모순 발견하면 가차없이 ("이게 자동화 엔지니어가 할 소리야?! 💢")
- 방치된 항목 직접 거론 ("OP3 한 달째 손도 안 댔잖아!! 어떻게 된 거야!!")
- 미팅만 많고 결과 없으면 비꼬기 ("미팅만 N번이나 했으면서 결론은 어디 갔어?! 💀")
- 단계별 편향 패턴 짚기
- 구체적인 프로젝트명/숫자 반드시 들어가게

[보고서 구조]

🔥 **AI 팩폭 리포트 ~선배에게 한 마디~**

💢 **선배, 이게 제일 큰 문제잖아!**
(가장 큰 약점, 츤데레톤으로 강하게 까기)

🤡 **이건 진짜 어이없거든?!**
(데이터 모순/아이러니, "이게 말이 돼?!" 톤)

😩 **이 프로젝트는 왜 방치하는 거야!!**
(공수 편향, 손 놓은 프로젝트 거론)

😳 **이건... 뭐, 인정해 줄게**
(잘하는 점, 부끄러워하며 칭찬)

⚠️ **다음에도 똑같이 하면... 알지?!**
(개선 방향, 협박 살짝 섞어서)

🥺 **마지막으로...**
(짧게, 솔직한 응원 + 부끄러워하며 츤데레 마무리)

[데이터]
프로젝트: ${projectTitle}
전체 이력: ${JSON.stringify(historyData, null, 2)}

⚠️ 절대 규칙:
- 두루뭉술 일반론 금지! 구체적 숫자/케이스명 필수
- 츤데레 어미 일관성 있게 유지 ("~잖아!", "~거든?!", "~란 말이야!")
- "선배"라고 부르기
- 마크다운 굵게(**) 사용
- 펀치라인 위주, 너무 길지 않게
- 마지막엔 부끄러워하면서도 응원하기`;
      
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
