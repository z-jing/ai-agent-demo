
// ============================================================================
// splitter.ts  ——  文本切块（RAG 五步链路的「第 2 步：切块」）
// 用 LangChain 官方 Text Splitter：RecursiveCharacterTextSplitter
// 把「逐页文本」切成带页码元信息的小片段（DocChunk），供后续向量化入库。
// 参数对齐：chunkSize / chunkOverlap 统一来自 config.RAG（默认 800 / 120）。
// ============================================================================

// LangChain 的递归字符切分器（npm i @langchain/textsplitters）
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
// 切块大小、重叠，统一从 config 取，本文件不直接读 env
import { RAG } from './config'
import type { DocChunk } from './types'
import type { LoadedDoc } from './loaders'

/**
 * 把一份「逐页文档」切成带元信息的小片段
 * @param doc   loaders.ts 解析出的文档：{ docName, pages: string[] }（pages 下标+1 即页码）
 * @param docId 本次上传分配的文档 id，用于给每个 chunk 生成唯一 id、并支持按文档删除
 * @returns     DocChunk 数组（每个 chunk 带 docId / docName / page / text / order）
 */
export async function splitDocument(doc: LoadedDoc, docId: string): Promise<DocChunk[]> {
  // 切分器：chunkSize=每块最大字符数，chunkOverlap=相邻块重叠字符数
  // 重叠的作用：防止一句话正好被切在两块边界上，导致语义被拦腰截断
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: RAG.chunkSize,        // 默认 800（来自 .env 的 VITE_CHUNK_SIZE）
    chunkOverlap: RAG.chunkOverlap,  // 默认 120（来自 .env 的 VITE_CHUNK_OVERLAP）
    // 分隔符优先级：先按段落，再按行，再按中文标点，最后才硬切；保证尽量不切碎句子
    separators: ['\n\n', '\n', '。', '！', '？', '；', '，', ' ', ''],
  })

  const chunks: DocChunk[] = []
  let order = 0   // chunk 在整篇文档里的全局顺序，便于展示时按原文排

  // 逐页切：页码即下标+1，这样引用来源能显示「第几页」
  for (let p = 0; p < doc.pages.length; p++) {
    const pageText = doc.pages[p]
    if (!pageText.trim()) continue        // 空页直接跳过

    const pieces = await splitter.splitText(pageText)   // 递归切分（异步）
    for (const text of pieces) {
      if (!text.trim()) continue          // 切出来的空白片段丢弃
      chunks.push({
        id: `${docId}_${order}`,          // 唯一 id：文档 id + 全局序号，重复入库天然覆盖（幂等）
        docId,
        docName: doc.docName,
        page: p + 1,                       // 页码从 1 开始
        text,
        order: order++,
      })
    }
  }
  return chunks
}