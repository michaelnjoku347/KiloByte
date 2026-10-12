// Supabase Edge Function. Deploy with the CLI. GEMINI_API_KEY is a secret
// on the function, never a Vite variable. The static site does not call this
// until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.

const WINDOW_MS = 60_000
const LIMIT = 20
const hits = new Map<string, { n: number; t: number }>()

function tooFast(ip: string): boolean {
  const now = Date.now()
  const row = hits.get(ip) ?? { n: 0, t: now }
  if (now - row.t > WINDOW_MS) {
    row.n = 0
    row.t = now
  }
  row.n += 1
  hits.set(ip, row)
  return row.n > LIMIT
}

async function gemini(prompt: string, model: string): Promise<unknown> {
  const key = Deno.env.get('GEMINI_API_KEY') ?? ''
  if (!key) {
    return { error: 'Set GEMINI_API_KEY on the studio function. No image or text was generated.' }
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 700 },
      }),
    },
  )
  if (!res.ok) return { error: `Gemini ${res.status}` }
  return res.json()
}

function textFrom(payload: unknown): string {
  const data = payload as {
    candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[] } }[]
    error?: string
  }
  if (data.error) return ''
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
      },
    })
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (tooFast(ip)) {
    return Response.json({ error: 'Rate limit: 20 studio calls a minute.' }, { status: 429 })
  }
  const body = (await req.json().catch(() => ({}))) as {
    action?: string
    prompt?: string
    title?: string
    catalog?: { id: string; title: string; blurb: string; genres: string[] }[]
  }
  const action = body.action ?? 'ideas'
  if (action === 'cover') {
    const payload = await gemini(
      `Original square game-cover description only, no brand names. Subject for: ${body.title ?? 'a small arcade'}. Then if you can return an image, do that instead of prose.`,
      'gemini-2.0-flash-preview-image-generation',
    )
    const data = payload as {
      error?: string
      candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[] } }[]
    }
    const part = data.candidates?.[0]?.content?.parts?.find((item) => item.inlineData?.data)
    if (data.error) return Response.json({ error: data.error })
    if (!part?.inlineData?.data) {
      return Response.json({
        image: null,
        note: 'The model returned no image. The card keeps its original cover. This is not a generated picture.',
      })
    }
    return Response.json({ image: part.inlineData.data, mime: part.inlineData.mimeType ?? 'image/png' })
  }
  const catalog = (body.catalog ?? [])
    .slice(0, 40)
    .map((game) => `${game.id}: ${game.title} (${game.genres.join(', ')}) ${game.blurb}`)
    .join('\n')
  const prompt =
    action === 'describe'
      ? `Write a one-sentence blurb and a two-sentence description for an original browser game titled "${body.title ?? 'Untitled'}". No copyrighted names. Return JSON {"blurb":"","description":""}.`
      : action === 'search'
        ? `Pick up to 6 catalog ids that match "${body.prompt ?? ''}". Catalog:\n${catalog}\nReturn JSON {"ids":["id"]}.`
        : action === 'recommend'
          ? `Pick up to 6 catalog ids this player might like. Catalog:\n${catalog}\nHint: ${body.prompt ?? ''}. Return JSON {"ids":["id"]}.`
          : `Give 3 original mashup game ideas for: ${body.prompt ?? 'a small arcade'}. No copyrighted names. Return JSON {"ideas":[{"title":"","pitch":""}]}.`
  const payload = await gemini(prompt, 'gemini-2.0-flash')
  const data = payload as { error?: string }
  if (data.error) return Response.json({ error: data.error })
  const raw = textFrom(payload).replace(/^```json\s*|\s*```$/g, '').trim()
  try {
    return Response.json(JSON.parse(raw))
  } catch {
    return Response.json({ error: 'The model did not return JSON.', raw })
  }
})
