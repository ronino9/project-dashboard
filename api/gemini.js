export default async function handler(req, res) {
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

    // 구글에게 "이 API 키로 쓸 수 있는 모델 리스트 다 내놔" 라고 요청하는 주소
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    const apiResponse = await fetch(listUrl);
    const apiData = await apiResponse.json();

    if (apiData.models) {
      // 쓸 수 있는 모델 이름만 뽑아서 화면에 출력
      const modelNames = apiData.models.map(m => m.name).join('<br>✔ ');
      return res.status(200).json({ report: `<strong>[구글 승인 완료 모델 리스트]</strong><br><br>✔ ${modelNames}` });
    } else {
      return res.status(500).json({ error: `리스트 조회 실패: ${JSON.stringify(apiData)}` });
    }

  } catch (error) {
    console.error('서버 에러:', error);
    return res.status(500).json({ error: error.message });
  }
}
