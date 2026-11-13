
// 【新增】类型定义：文档片段、知识库文档、引用来源、知识库状态
export interface DocChunk {
  id: string;          // 片段唯一 id（docId + 序号）
  docId: string;       // 所属文档 id
  docName: string;     // 所属文档名
  page?: number;       // 来源页码（PDF 才有）
  text: string;        // 片段正文
  order: number;       // 片段在文档内的顺序
}

export interface KbDocument {
  id: string;
  name: string;
  chunkCount: number;
  size: number;        // 字节
  addedAt: number;     // 时间戳
}

export interface SourceRef {
  docId: string;
  docName: string;
  page?: number;
  score: number;       // 相似度
  snippet: string;     // 召回片段摘要
}

export type KbStatus =
  | 'idle'
  | 'parsing'          // 解析中
  | 'vectorizing'      // 向量化中
  | 'uploading'        // 写入 Pinecone 中
  | 'ready'
  | 'error';

export interface EmbeddingConfig {
  baseUrl: string;
  apiKey: string;
  model: string;       // 如 text-embedding-3-small / text-embedding-v3
  dim: number;         // 向量维度，必须与 Pinecone 索引一致
}