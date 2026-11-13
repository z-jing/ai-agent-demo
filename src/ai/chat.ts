
// 【修改】真实 fetch 流式封装（生产用）
// 相比第2周：新增 system（注入 RAG 资料）与 history（多轮上下文）两个参数
export interface ChatOptions {
  prompt: string
  system?: string                 // 【新增】RAG 检索到的资料拼成的系统提示词
  history?: { role: 'user' | 'assistant'; content: string }[]  // 【新增】多轮上下文
  signal?: AbortSignal
  onToken: (delta: string) => void
  onDone?: () => void
  onError?: (e: unknown) => void
}

const BASE = import.meta.env.VITE_AI_BASE_URL || 'https://api.deepseek.com'
const KEY = import.meta.env.VITE_AI_API_KEY
const MODEL = import.meta.env.VITE_AI_MODEL || 'deepseek-chat'

export async function streamChat(opts: ChatOptions): Promise<void> {
  const messages = [
    ...(opts.system ? [{ role: 'system', content: opts.system }] : []), // 【新增】
    ...(opts.history || []),                                            // 【新增】
    { role: 'user', content: opts.prompt },
  ]

  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`,
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({ model: MODEL, messages, stream: true }),
      signal: opts.signal,
    })
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        const s = line.trim()
        if (!s.startsWith('data:')) continue
        const payload = s.slice(5).trim()
        if (payload === '[DONE]') { opts.onDone?.(); return }
        try {
          const delta = JSON.parse(payload).choices?.[0]?.delta?.content
          if (delta) opts.onToken(delta)
        } catch { /* 忽略半包 */ }
      }
    }
    opts.onDone?.()
  } catch (e) {
    opts.onError?.(e)
  }
}