import { createServer } from 'http'
import { getAIResponse } from './ai/chat'

const ALLOW_ORIGIN = 'http://localhost:5173'

const server = createServer(async (req, res) => {
  // 1. 先统一设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // 2. 处理预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // 3. 业务路由
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = ''
    for await (const chunk of req) body += chunk

    console.log('收到请求 body:', body)

    try {
      const { message } = JSON.parse(body)
      console.log('准备调用 AI，message:', message)

      const response = await getAIResponse(message)

      console.log('AI 返回 status:', response.status)
      console.log('AI 返回 headers:', response.headers)

      res.writeHead(response.status, response.headers)

      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('流结束')
          res.end()
          break
        }
        console.log('后端收到 chunk 长度:', value.length)
        res.write(value)
      }
    } catch (err: any) {
      console.error('AI 调用失败:', err)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(3001, () => {
  console.log('AI 后端运行在 http://localhost:3001')
})
