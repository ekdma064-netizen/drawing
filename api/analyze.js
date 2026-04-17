export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ theme: 'generic', description: '그림이 없어요!', animationType: 'sparkle' });

    // 이미지가 너무 크면 축소 (Vercel 4.5MB 제한)
    // base64 길이 체크
    const maxB64Len = 3 * 1024 * 1024; // ~3MB
    let imgData = image;
    if (image.length > maxB64Len) {
      // 너무 크면 앞부분만 잘라서 전송 (API 오류 방지)
      imgData = image.substring(0, maxB64Len);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imgData
              }
            },
            {
              type: 'text',
              text: '이 그림을 분석해서 JSON만 응답해. 마크다운 없이 순수 JSON만.\n{"theme":"nature|ocean|space|animals|people|vehicles|fantasy|generic","description":"친근한 한국어 설명 1~2문장","animationType":"bounce|float|sparkle|wave"}'
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return res.status(200).json({ theme: 'generic', description: '멋진 그림이에요! ✨', animationType: 'sparkle' });
    }

    const data = await response.json();

    if (!data.content || !data.content[0]) {
      return res.status(200).json({ theme: 'generic', description: '멋진 그림이에요! ✨', animationType: 'sparkle' });
    }

    const raw = data.content[0].text.replace(/```json|```/g, '').trim();

    let info;
    try {
      info = JSON.parse(raw);
    } catch (e) {
      // JSON 파싱 실패해도 기본값으로 진행
      info = { theme: 'generic', description: '멋진 그림이에요! ✨', animationType: 'sparkle' };
    }

    return res.status(200).json(info);

  } catch (err) {
    console.error('Handler error:', err);
    // 오류가 나도 기본값 반환 — 프론트엔드가 멈추지 않게
    return res.status(200).json({ theme: 'generic', description: '멋진 그림이에요! ✨', animationType: 'sparkle' });
  }
}
