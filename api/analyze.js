export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "이미지가 없어요" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: '이 그림을 분석해서 JSON만 응답해. 마크다운 없이 순수 JSON만.\n{"theme":"nature|ocean|space|animals|people|vehicles|fantasy|generic","description":"친근한 한국어 설명 1~2문장","animationType":"bounce|float|sparkle|wave"}' }
          ]
        }]
      })
    });

    const data = await response.json();
    const raw = data.content[0].text.replace(/```json|```/g, "").trim();
    res.status(200).json(JSON.parse(raw));
  } catch (e) {
    res.status(200).json({ theme: "generic", description: "멋진 그림이에요! ✨", animationType: "sparkle" });
  }
}
