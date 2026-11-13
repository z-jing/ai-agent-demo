
// 【新增】LangChain Document Loaders：PDF/TXT/MD → 纯文本（PDF 逐页解析，便于标页码）
import * as pdfjsLib from 'pdfjs-dist'
// 指定 worker，Vite 下用 ?url 导入
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker

export interface LoadedDoc { docName: string; pages: string[] }

// 主入口：根据文件类型分流（对应 LangChain 的 PDFLoader / TextLoader）
export async function loadDocument(file: File): Promise<LoadedDoc> {
  const name = file.name
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) {
    return { docName: name, pages: await loadPdf(file) }
  }
  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    const text = await file.text()
    return { docName: name, pages: [text] }
  }
  throw new Error('暂不支持该文件类型，请用 PDF / TXT / MD')
}

// 逐页读取 PDF，返回每页文本数组（页码即下标+1）
async function loadPdf(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((it: any) => ('str' in it ? it.str : ''))
      .join(' ')
    pages.push(text)
  }
  return pages
}