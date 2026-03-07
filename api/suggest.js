export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'GOOGLE_API_KEY not configured' });
  }

  console.log('Key length:', process.env.GOOGLE_API_KEY.length, '| First 8 chars:', process.env.GOOGLE_API_KEY.substring(0, 8));

  try {
    const { system, messages, max_tokens } = req.body;

    const geminiBody = {
      system_instruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: max_tokens || 1500 },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      return res.status(response.status).json({ error: JSON.stringify(data) });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ content: [{ text }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
