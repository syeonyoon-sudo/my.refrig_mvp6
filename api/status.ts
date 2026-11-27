// GET /api/status — AI 연결 여부만 알려줌 (키 값은 절대 보내지 않음)
export default function handler(_req: any, res: any) {
  const ai = !!process.env.ANTHROPIC_API_KEY
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ ai, model: ai ? (process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5') : null })
}
