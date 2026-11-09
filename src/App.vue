<!-- <template>
  <div>
    <input v-model="input" @keyup.enter="sendMessage" placeholder="输入消息..." />
    <button @click="sendMessage">发送</button>
    <div v-if="loading">思考中...</div>
    <div v-html="response"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const input = ref('')
const response = ref('')
const loading = ref(false)

async function sendMessage() {
  if (!input.value) return
  loading.value = true
  response.value = ''

  try {
    // 方案A：用 Vercel AI SDK（推荐）
    // const { textStream } = await getAIResponse(input.value)
    // for await (const text of textStream) {
    //   response.value += text
    // }

    // 方案B：直接 fetch 调 DeepSeek API（更简单，不依赖 SDK）
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: input.value }],
        stream: true,
      }),
    })

    // 读取流式响应
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      // 解析 SSE 格式的数据
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          const data = JSON.parse(line.slice(6))
          response.value += data.choices[0].delta.content || ''
        }
      }
    }
  } catch (err) {
    response.value = '请求失败：' + err.message
  } finally {
    loading.value = false
  }
}
</script> -->

<template>
  <div>
    <input v-model="input" @keyup.enter="sendMessage" placeholder="输入消息..." />
    <button @click="sendMessage">发送</button>
    <div v-if="loading">思考中...</div>
    <div v-html="response"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const input = ref('')
const response = ref('')
const loading = ref(false)

async function sendMessage() {
  if (!input.value) return
  loading.value = true
  response.value = ''

  try {
    const res = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input.value }),
    })

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    // 纯文本拼接，去掉之前的 JSON 解析逻辑
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      // 直接解码并拼接到 response 上
      const chunk = decoder.decode(value, { stream: true })
      response.value += chunk
    }
  } catch (err) {
    response.value = '请求失败：' + err.message
  } finally {
    loading.value = false
  }
}
</script>