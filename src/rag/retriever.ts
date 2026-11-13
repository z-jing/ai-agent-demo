// src/rag/retriever.ts
import { RAG } from './config'
import { queryVectors, type MatchItem } from './pineconeStore'
import type { SourceRef } from './types'  // ← 新增

// 检索结果（带片段正文，供 prompt 使用）
export interface RetrievedChunk {
  id: string
  score: number
  text: string
  title: string
  docId: string
}

// 核心：根据问题召回上下文片段
export async function retrieve(
  question: string,
  options?: { topK?: number; minScore?: number; docIds?: string[] },
): Promise<SourceRef[]> {
  const topK = options?.topK ?? RAG.topK
  // 不再使用绝对 minScore，改为 0 先全部拿回来
  const matches: MatchItem[] = await queryVectors(question, topK, options?.docIds)

  if (matches.length === 0) return []

  // 🌟 核心修改：相对阈值过滤
  // 只要分数大于 0，且不低于最高分的 60%，就保留
  const topScore = matches[0].score
  const filtered = matches.filter((m) => {
    return m.score > 0 && m.score >= topScore * 0.6
  })

  console.log('【过滤后】保留:', filtered.length, '条 | 最高分:', topScore)

  // ✅ 映射成 SourceRef 结构
  return filtered.map((m) => ({
    id: m.id,
    score: m.score,
    docId: m.docId,
    docName: m.title,
    snippet: m.chunkText,
    page: undefined,
  }))
}

// 把召回片段拼成给大模型的「上下文」文本块
export function formatContext(refs: SourceRef[]): string {
  if (refs.length === 0) return ''
  return refs
    .map((c, i) => `【资料${i + 1}｜来源：${c.docName}】\n${c.snippet}`)
    .join('\n\n---\n\n')
}