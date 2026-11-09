// src/ai/chat.ts
import 'dotenv/config'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

const ai = createOpenAI({
  apiKey: process.env.VITE_AI_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
})

export async function getAIResponse(userMessage: string) {
  const result = streamText({
    // 1. 模型
    model: ai('deepseek-chat'),

    // 2. 系统提示词必须放在单独的 system 属性中
    system: '你是一个 helpful 助手',

    // 3. 对话数组中只保留 user 和 assistant 消息
    messages: [{ role: 'user', content: userMessage }],
  })

  // 4. 直接返回流式文本响应
  return result.toTextStreamResponse()
}
