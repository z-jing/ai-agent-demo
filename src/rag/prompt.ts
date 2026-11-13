
// 【新增】提示词拼装：把召回片段塞进 system（带 [S1][S2] 角标）+ 生成界面引用文案
import type { SourceRef } from './types'

// 生成注入大模型的 system 提示词
// prompt.ts
export function buildSystemPrompt(refs: SourceRef[]): string {
  if (!refs.length) {
    return `你是知识库助手。当前未检索到任何相关资料。
      禁止使用你自己的知识回答。
      直接回复："文档中未找到相关信息。"`
  }

  const context = refs
    .map((r, i) => `[S${i + 1}]（来源：${r.docName}）\n${r.snippet}`)
    .join('\n\n')

  return `【重要】你是一个文档问答机器人。

    绝对规则：
    1. 只能复述【参考资料】里的内容，禁止使用任何外部知识。
    2. 当用户问"你是谁/你叫什么"时，必须根据【参考资料】回答。
    3. 资料里没有的内容，回复"文档中未提及"。
    4. 引用时用 [S编号] 标注。
    5. 【关键】如果资料中出现多个相似答案，以与用户问题最匹配的那条为准，不要混淆不同人物。

    【参考资料】
    ${context}`
}

// 给界面用的引用来源列表（与 system 里的角标一一对应）
export function toDisplaySources(refs: SourceRef[]): SourceRef[] {
  return refs
}