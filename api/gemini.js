export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { projectTitle, historyData, reportStyle } = req.body;
    
    // 검증된 모델명 gemini-3.5-flash 사용
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [
            { text: `너는 전문 PLC 엔지니어다. 다음 데이터를 분석해라. [유형]: ${reportStyle}. [프로젝트]: ${projectTitle}` },
            { text: JSON.stringify(historyData || []) }
          ] 
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
