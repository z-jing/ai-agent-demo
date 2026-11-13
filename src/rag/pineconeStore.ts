
/**
 * pineconeStore.ts —— Pinecone 向量库读写封装（一体化模式 / Integrated Indexing）
 *
 * 适用索引：kb-vectors
 *   - chunk_text 字段已绑定 Dense embedding：llama-text-embed-v2 · 1024 dim · cosine
 *   - 该模式下【前端不再计算向量】，Pinecone 收到原文后自动向量化
 *
 * 两个关键点（与手动向量模式的根本区别）：
 *   1. 入库用 upsert({ documents: [...] })，每条传 text 原文 —— 不是 records / values
 *   2. 检索用 search({ query: { inputs: [{ chunk_text: 问题 }] } }) —— 不是 query({ vector })
 *
 * 依赖：@pinecone-database/pinecone >= 4.0（旧版没有 documents / search 写法）
 */
import { Pinecone } from '@pinecone-database/pinecone'
import { PINECONE } from './config'

/* ============================================================
 * 类型定义
 * ========================================================== */

/**
 * 入库记录（一体化模式）
 * 注意：字段名 text 对应 Pinecone 内置模型的输入文本，
 *       它会映射到索引 SCHEMA 里的 chunk_text 字段并被自动向量化。
 */
export interface ChunkRecord {
  /** 唯一 id，建议用 `${docId}_${序号}`，重复入库会覆盖旧记录 */
  id: string
  /** 切分后的原文片段（Pinecone 靠它自动向量化，1024 维） */
  text: string
  /** 文档标题，参与全文检索并在界面显示来源 */
  title: string
  /** 文档 id，用于检索过滤与按文档删除 */
  docId: string
}

/** 检索命中结果（统一成前端好渲染的结构） */
export interface RetrievedChunk {
  id: string
  text: string
  title: string
  docId: string
  /** 相似度分数（cosine，越大越相似） */
  score: number
}

/** 索引统计信息 */
export interface IndexStats {
  recordCount: number
  indexName: string
}

/* ============================================================
 * 客户端与索引初始化
 * ========================================================== */

let _pc: Pinecone | null = null

/** 单例获取 Pinecone 客户端 */
function getClient(): Pinecone {
  if (!_pc) {
    if (!PINECONE.apiKey) {
      throw new Error('缺少 PINECONE_API_KEY，请检查 .env 中的 VITE_PINECONE_API_KEY')
    }
    _pc = new Pinecone({ apiKey: PINECONE.apiKey })
  }
  return _pc
}

/** 获取目标索引对象（kb-vectors） */
function getIndex() {
  return getClient().index(PINECONE.indexName)
}

/* ============================================================
 * 连通性自检
 * ========================================================== */

/**
 * ping：拉取索引统计，能返回数字即说明 API Key / Host / 索引名全部正确。
 * @returns { recordCount, indexName }
 */
export async function pingIndex(): Promise<IndexStats> {
  const index = getIndex()
  // describeIndexStats 在 v4 中是 index 上的方法，返回 dimension / totalRecordCount 等
  const stats: any = await index.describeIndexStats()

  return {
    // 一体化模式下记录总数优先取 recordCount，兼容旧字段 totalRecordCount
    recordCount: stats?.recordCount ?? stats?.totalRecordCount ?? 0,
    indexName: PINECONE.indexName,
  }
}

/* ============================================================
 * 入库（一体化模式：传原文，Pinecone 自动向量化）
 * ========================================================== */

/**
 * 批量写入切分块。
 *
 * 【核心】用 documents 而非 records：
 *   documents 每条 = { id, text, metadata }
 *   - text    → 原文，交给 llama-text-embed-v2 向量化
 *   - metadata→ 业务字段（title / docId），可被 filter 检索/删除
 *
 * @param records 由 useRag.ts 的 toChunkRecords() 构造
 * @param batchSize 单批条数，Pinecone 单次 upsert 有体积上限，分批更稳
 */
export async function upsertChunks(
  records: ChunkRecord[],
  batchSize = 20,
): Promise<void> {
  if (!records.length) return
  const index = getIndex()

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    await index.documents.upsert({
      documents: batch.map((r) => ({
        _id: r.id,                 // ← 下划线
        chunk_text: r.text,        // ← schema 字段名
        title: r.title,            // ← 平铺，不套 metadata
        docId: r.docId,
      })),
    })
  }
}

/* ============================================================
 * 检索（一体化模式：传问题原文，Pinecone 自动向量化后检索）
 * ========================================================== */

/**
 * 语义检索。
 *
 * 【核心】用 search + query.inputs：
 *   inputs 传原文，Pinecone 用同一模型向量化后做 cosine 检索。
 *
 * @param question 问题原文（字符串，不是向量数组）
 * @param topK     返回条数
 * @param docIds   可选：限定只在这些文档内检索（RAG「按选中文档提问」）
 * @param minScore 可选：相似度下限，低于它的命中被丢弃
 */
export async function queryVectors(
  question: string,
  topK = 5,
  docIds?: string[],
  minScore = 0,
): Promise<RetrievedChunk[]> {
  const index = getIndex()

  // 1. 先检索（拿到 id 和 score）
  const res: any = await index.documents.search({
    topK,
    // 关键：必须指定打分字段
    scoreBy: [
      {
        type: 'text',
        fields: ['chunk_text', 'title'],
        query: question,
      },
    ],
    // 按文档过滤：docIds 非空时只在这些文档里召回
    // ...(docIds?.length && {
    //   filter: { docId: { $in: docIds } },
    // }),
  })
  const matches = res.matches ?? []
  console.log('【1】search 返回:', matches.length, matches)

  // 2. 方案 A：用 index.fetch 补内容
  const ids = matches.map((m: any) => m._id)
  console.log('【2】ids:', ids, '长度:', ids.length)


  let docMap = new Map<string, any>()
  try {
    const fetched: any = await index.documents.fetch({ ids })
    console.log('【3】fetch 结果:', JSON.stringify(fetched, null, 2))

    Object.entries(fetched.documents ?? {}).forEach(([id, doc]: [string, any]) => {
      docMap.set(id, doc)
    })
  } catch (e: any) {
    console.error('【3】fetch 失败:', e.message)
  }


  const result = matches
    .filter((m: any) => (m._score ?? 0) >= minScore)
    .map((m: any) => {
      const doc = docMap.get(m._id) ?? {}
      return {
        id: m._id,
        score: m._score ?? 0,
        chunkText: doc.chunk_text ?? '',
        title: doc.title ?? '',
      }
    })

  console.log('【最终返回】', JSON.stringify(result, null, 2))
  return result
}

/* ============================================================
 * 删除（按文档 id 删除其全部切分块）
 * ========================================================== */

/**
 * 删除某个文档的所有记录。
 * 一体化模式下 /vectors/delete 不支持按 metadata filter 删除，
 * 必须先查出该文档的所有向量 id，再按 id 批量删除。
 * @param docId 文档 id
 */
export async function deleteByDocId(docId: string): Promise<void> {
  const index = getIndex()

  // 1) 找出该文档的所有向量 id（id 形如 `${docId}_${序号}`）
  const ids: string[] = []
  for await (const id of index.list()) {
    if (id.startsWith(`${docId}_`)) ids.push(id)
  }

  // 2) 没有就跳过，避免空数组报 400
  if (!ids.length) return

  // 3) 按 id 批量删除
  await index.deleteMany(ids)
}

// 列出文档
export interface DocListItem {
  docId: string
  title: string
  chunkCount: number
}

export async function listDocs(): Promise<DocListItem[]> {
  const index = getIndex()

  // 1) 列出所有向量 id
  const ids: string[] = []
  for await (const id of index.list()) {
    ids.push(id)
  }
  console.log('【listDocs】ids:', ids)
  if (!ids.length) return []

  // 2) 批量取文档（每次最多 100 个）
  const map = new Map<string, DocListItem>()
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    const res: any = await index.documents.fetch({ ids: batch })
    const docs = Object.values(res.documents ?? {}) as any[]
    console.log('【listDocs】docs:', docs)

    for (const doc of docs) {
      // 字段是平铺的，直接在 doc 上，不在 doc.metadata 里
      const docId = doc.docId
      const title = doc.title
      if (!docId) continue
      if (!map.has(docId)) {
        map.set(docId, { docId, title: title || docId, chunkCount: 0 })
      }
      map.get(docId)!.chunkCount += 1
    }
  }
  return Array.from(map.values())
}