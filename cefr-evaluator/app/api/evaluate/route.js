import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WRITING_SYSTEM = (prompt) => `You are an expert CEFR English examiner. Evaluate the writing sample and return ONLY a JSON object (no markdown, no backticks) with this exact structure:
{
  "level": "B1",
  "summary": "2-sentence overall assessment in Spanish",
  "criteria": [
    {"name": "Logro de tarea", "score": 18},
    {"name": "Coherencia y cohesión", "score": 15},
    {"name": "Rango léxico", "score": 14},
    {"name": "Corrección gramatical", "score": 13}
  ],
  "strengths": "Paragraph in Spanish describing strengths with specific examples",
  "improvements": "Paragraph in Spanish with specific actionable improvements",
  "errors": "Paragraph in Spanish listing specific grammar/lexical errors with corrections"
}
CEFR: A1 (very basic), A2 (basic), B1 (intermediate), B2 (upper-intermediate), C1 (advanced), C2 (mastery).
Score each criterion 0-25. Be rigorous and accurate.
Writing prompt given to student: "${prompt}"`;

const SPEAKING_SYSTEM = (prompt) => `You are an expert CEFR oral examiner. Evaluate the spoken English transcription and return ONLY a JSON object (no markdown, no backticks) with this exact structure:
{
  "level": "B1",
  "summary": "2-sentence overall assessment in Spanish",
  "criteria": [
    {"name": "Fluidez y ritmo", "score": 16},
    {"name": "Rango gramatical y precisión", "score": 14},
    {"name": "Rango léxico", "score": 15},
    {"name": "Coherencia del discurso", "score": 17}
  ],
  "strengths": "Paragraph in Spanish describing oral strengths with examples",
  "improvements": "Paragraph in Spanish with specific speaking improvements",
  "errors": "Paragraph in Spanish listing grammatical/lexical errors found in the transcription"
}
CEFR: A1, A2, B1, B2, C1, C2. Score each criterion 0-25. Consider this is transcribed speech.
Speaking prompt: "${prompt}"`;

export async function POST(req) {
  try {
    const { type, text, prompt } = await req.json();
    if (!text || text.trim().length < 10) {
      return Response.json({ error: 'Text too short' }, { status: 400 });
    }

    const systemPrompt = type === 'writing' ? WRITING_SYSTEM(prompt) : SPEAKING_SYSTEM(prompt);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Evaluate this ${type} sample:\n\n${text}` }]
    });

    const raw = message.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);
    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
