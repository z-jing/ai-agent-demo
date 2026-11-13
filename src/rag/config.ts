
// src/rag/config.ts
// 全套 RAG 参数的唯一入口。其它文件只从这里 import，不要再各自读 import.meta.env。
//
// 【重要变更】本轮起改用 Pinecone「一体化索引（Integrated Indexing）」模式：
//   - 向量由 Pinecone 内置的 llama-text-embed-v2 模型自动生成，前端不再调用 OpenAI 算向量；
//   - 因此 VITE_EMBED_API_KEY / VITE_EMBED_BASE_URL / VITE_EMBED_MODEL / VITE_EMBED_DIM
//     这几个变量在本模式下【不再被使用】，可保留在 .env 里但不生效；
//   - EMBED.dim 改为 1024，必须与索引 SCHEMA 里显示的「1024 dim」一致。

// 读取环境变量的小工具：Vite 下用 import.meta.env，统一在此封装，避免各处散落。
const env = import.meta.env

// ---------- 1. Embedding（一体化模式下仅作为元信息记录，不参与实际向量化） ----------
export const EMBED = {
  // 向量维度：与 Pinecone 索引 SCHEMA 中 llama-text-embed-v2 的 1024 维保持一致
  dim: 1024,
  // 实际向量由 Pinecone 内置模型生成，这里仅记录所用模型名，便于排查
  model: 'llama-text-embed-v2',
} as const

// ---------- 2. Pinecone 向量库连接信息 ----------
export const PINECONE = {
  // API Key：在控制台 API keys 页生成（注意：之前明文发过的那个 Key 已泄露，务必 Revoke 换新）
  apiKey: env.VITE_PINECONE_API_KEY as string,
  // 索引 Host：在索引详情页复制，形如 kb-vectors-xxx.svc.aped-4627-b74a-xxx.pinecone.io
  host: env.VITE_PINECONE_HOST as string,
  // 索引名：与你在控制台创建的名字一致
  indexName: (env.VITE_PINECONE_INDEX as string) || 'kb-vectors',
} as const

// ---------- 3. RAG 调参（第 3 周 Day6 实验入口） ----------
export const RAG = {
  // 每个文本块的字符数
  chunkSize: Number(env.VITE_CHUNK_SIZE) || 800,
  // 相邻块之间的重叠字符数，防止语义被切断
  chunkOverlap: Number(env.VITE_CHUNK_OVERLAP) || 120,
  // 每次检索召回的片段数量
  topK: Number(env.VITE_TOP_K) || 3,
  // 相似度分数下限，低于该值的片段会被丢弃
  minScore: Number(env.VITE_MIN_SCORE) || 0.2,
} as const