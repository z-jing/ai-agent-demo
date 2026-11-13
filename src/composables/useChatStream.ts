// 【修改】流式对话 + 打字机 → 发消息前先检索 Pinecone
import { ref } from 'vue'
import { streamChat } from '@/ai/chat'
import type { SourceRef } from '@/rag/types'
import { retrieve } from '@/rag/retriever'
import { buildSystemPrompt } from '@/rag/prompt'
import { useRag } from '@/composables/useRag'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceRef[]
  status?: 'streaming' | 'done' | 'error'
}

export function useChatStream(opts: {
  getDocIds: () => string[] | undefined
  onSave: (m: Message) => void
}) {
  const messages = ref<Message[]>([])
  const loading = ref(false)
  let aborter: AbortController | null = null

  async function send(text: string) {
    if (!text.trim() || loading.value) return
    loading.value = true

    // 1) 用户消息入列
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      status: 'done',
    }
    messages.value.push(userMsg)
    opts.onSave(userMsg)

    // 2) 检索资料
    let refs: SourceRef[] = []
    try {
      refs = await retrieve(text, opts.getDocIds())
      console.log('【refs】', JSON.stringify(refs, null, 2))
    } catch (e) {
      console.warn('检索失败，降级为无资料回答', e)
    }

    // 3) 助手占位
    const aiMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      sources: refs,
      status: 'streaming',
    }
    messages.value.push(aiMsg)
    const aiIdx = messages.value.length - 1

    const appendToken = (d: string) => {
      const cur = messages.value[aiIdx]
      messages.value[aiIdx] = { ...cur, content: cur.content + d }
    }

    const setStatus = (status: Message['status']) => {
      const cur = messages.value[aiIdx]
      messages.value[aiIdx] = { ...cur, status }
    }

    // 4) 【核心修复】组装 history：严格 user/assistant 交替，排除当前 streaming 消息
    const history = messages.value
      .filter((m) => m.status === 'done' && m.content.trim())  // 只保留已完成且有内容的
      .slice(-4)  // 最近 2 轮
      .map((m) => ({ role: m.role, content: m.content }))

    // 去重：如果最后一条是 user（刚 push 的），且倒数第二条也是 user，说明历史有脏数据
    // 这里做一层保护：确保 history 不以 user 结尾（因为当前 user 已经在 prompt 里了）
    if (history.length > 0 && history[history.length - 1].role === 'user') {
      history.pop()
    }

    console.log('【history 组装后】', JSON.stringify(history, null, 2))

    aborter = new AbortController()
    await streamChat({
      prompt: text,
      system: buildSystemPrompt(refs),
      history,
      signal: aborter.signal,
      onToken: appendToken,
      onDone: () => {
        setStatus('done')
        opts.onSave(messages.value[aiIdx])
        loading.value = false
      },
      onError: (e) => {
        setStatus('error')
        if (!messages.value[aiIdx].content) {
          appendToken('生成出错，请重试')
        }
        loading.value = false
      },
    })
  }

  function stop() {
    aborter?.abort()
    loading.value = false
  }

  return { messages, loading, send, stop }
}