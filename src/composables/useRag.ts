// ============================================================================
// useRag.ts  ——  知识库总控（一体化模式）
// 文档列表：本地 localStorage 为主，Pinecone 反查作校准
// ============================================================================
import { ref, onMounted } from 'vue'

import { loadDocument } from '@/rag/loaders'
import { splitDocument } from '@/rag/splitter'
import { upsertChunks, deleteByDocId, pingIndex, listDocs } from '@/rag/pineconeStore'
import type { ChunkRecord } from '@/rag/pineconeStore'
import type { KbDocument, KbStatus } from '@/rag/types'
import { PINECONE } from '@/rag/config'

// ---------- 响应式状态 ----------
const docs = ref<KbDocument[]>(loadDocs())
const status = ref<KbStatus>('idle')
const enabled = ref(true)
const indexName = PINECONE.indexName

// ---------- 本地缓存 ----------
interface DocMeta { docId: string; name: string; size: number; chunkCount: number; addedAt: number }

function loadMeta(): Record<string, DocMeta> {
  try { return JSON.parse(localStorage.getItem('kb:meta') || '{}') } catch { return {} }
}
function saveMeta(map: Record<string, DocMeta>) {
  localStorage.setItem('kb:meta', JSON.stringify(map))
}
function loadDocs(): KbDocument[] {
  const meta = loadMeta()
  return Object.values(meta).map((m) => ({
    id: m.docId,
    name: m.name,
    chunkCount: m.chunkCount || 0,
    size: m.size || 0,
    addedAt: m.addedAt || Date.now(),
  }))
}
function persistDocs() {
  const map: Record<string, DocMeta> = {}
  docs.value.forEach((d) => {
    map[d.id] = { docId: d.id, name: d.name, size: d.size, chunkCount: d.chunkCount, addedAt: d.addedAt }
  })
  saveMeta(map)
}

// ---------- 工具函数 ----------
function makeDocId(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function toChunkRecords(
  chunks: { id: string; docId: string; docName: string; text: string }[],
): ChunkRecord[] {
  return chunks.map((c) => ({
    id: c.id, text: c.text, title: c.docName, docId: c.docId,
  }))
}

// ---------- 核心方法 ----------

/** 刷新列表：先显示本地缓存，再异步用 Pinecone 校准 */
async function refreshDocs() {
  docs.value = loadDocs()
  try {
    const remote = await listDocs()
    if (remote.length > 0) {
      const meta = loadMeta()
      docs.value = remote.map((r) => ({
        id: r.docId,
        name: meta[r.docId]?.name || r.title || r.docId,
        chunkCount: r.chunkCount,
        size: meta[r.docId]?.size || 0,
        addedAt: meta[r.docId]?.addedAt || Date.now(),
      }))
      persistDocs()
    }
  } catch (e) {
    console.warn('Pinecone 校准失败，沿用本地缓存：', e)
  }
}

/** 上传文件：入库成功后立即更新本地列表 */
async function upload(file: File): Promise<KbDocument> {
  const docId = makeDocId(file.name)
  const meta = loadMeta()
  const exist = meta[docId]

  // 同名文件：询问是否覆盖
  if (exist) {
    const sameSize = exist.size === file.size
    const msg = sameSize
      ? `「${file.name}」已存在且内容大小相同，是否覆盖重新入库？`
      : `「${file.name}」已存在，是否用新文件覆盖？`
    if (!confirm(msg)) {
      throw new Error('已取消上传')   // 用户取消，调用方静默处理
    }
    // 选择覆盖：先删旧的，避免残留旧切块
    await deleteByDocId(docId).catch(() => {})
  }

  try {
    status.value = 'parsing'
    const loaded = await loadDocument(file)
    const chunks = await splitDocument(loaded, docId)
    if (!chunks.length) throw new Error('文档没有可解析的文本')

    status.value = 'uploading'
    await upsertChunks(toChunkRecords(chunks))

    const doc: KbDocument = {
      id: docId, name: file.name, chunkCount: chunks.length,
      size: file.size, addedAt: Date.now(),
    }
    const idx = docs.value.findIndex((d) => d.id === docId)
    if (idx >= 0) docs.value.splice(idx, 1, doc)
    else docs.value.push(doc)
    persistDocs()

    status.value = 'ready'
    return doc
  } catch (e) {
    status.value = 'error'
    throw e
  }
}

/** 删除文档：先删 Pinecone，再清本地 */
async function remove(docId: string) {
  await deleteByDocId(docId).catch(() => {})
  docs.value = docs.value.filter((d) => d.id !== docId)
  persistDocs()
  refreshDocs().catch(() => {})
}

async function ping() { return pingIndex() }

onMounted(() => { refreshDocs() })

export function useRag() {
  return { docs, status, enabled, indexName, upload, remove, ping, refreshDocs }
}