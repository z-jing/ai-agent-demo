
第3周交付物 · 文档问答 AI 应用（方案A：LangChain.js + Pinecone，纯前端）
在保留第2周全部交互（打字机流式、多会话+localStorage、stop、v-markdown 安全渲染）的基础上，
叠加 RAG 能力：上传文档 → 解析 → 切块 → 向量化 → 写入 Pinecone → 提问时检索 → 带引用来源回答。

项目目录结构（★新增 / ◆修改，未标注为第2周原样复用）
.env.example                     # ★新增  密钥 + 全部 RAG 调参入口
src/
├── ai/
│   ├── chat.ts                  # ◆修改  流式封装 → 新增 system、history 参数
│   └── chat.mock.ts             #         模拟流式（本地测试）→ 未改动
├── composables/
│   ├── useChatStream.ts         # ◆修改  发消息前先检索；Message 加 sources；send 改 async
│   ├── useConversation.ts       # ◆修改  会话绑定 boundDocIds + bindDoc()
│   └── useRag.ts                # ★新增  知识库总控：上传→解析→切块→向量化→入库→删除
├── components/
│   ├── ChatWindow.vue           # ◆修改  顶部加「上传文档」按钮 + 状态提示
│   ├── MessageItem.vue          # ◆修改  回答下方显示「引用来源」
│   └── KnowledgePanel.vue       # ★新增  文档列表、RAG 开关、Pinecone 连接自检
├── directives/
│   └── markdown.ts              #         v-markdown 指令 → 未改动
├── rag/                         # ★新增目录  第3周 RAG 能力全部在此
│   ├── types.ts                 # ★新增  类型：DocChunk/KbDocument/SourceRef/KbStatus
│   ├── config.ts                # ★新增  参数唯一入口（chunk/top_k/dim/Pinecone）
│   ├── loaders.ts               # ★新增  Document Loaders：PDF/TXT/MD → 文本（PDF 逐页）
│   ├── splitter.ts              # ★新增  Text Splitters：RecursiveCharacterTextSplitter
│   ├── embeddings.ts            # ★新增  文本 → 向量（OpenAI 格式接口）
│   ├── pineconeStore.ts         # ★新增  Pinecone：upsert / query / deleteByDoc / 自检
│   ├── retriever.ts             # ★新增  问题向量化 → 召回 top_k → 去重过滤
│   └── prompt.ts                # ★新增  拼 [S1][S2] 角标 system + 引用来源
├── main.ts                      #         入口 + 注册指令 → 未改动
└── App.vue                      # ◆修改  左侧挂 KnowledgePanel
RAG 五步 ↔ 文件对应
步骤	做什么	文件
读取	PDF/TXT → 纯文本	rag/loaders.ts
切块	长文切小段(800/重叠120)	rag/splitter.ts
向量化	文本→数字	rag/embeddings.ts
入库+检索	Pinecone 存取	rag/pineconeStore.ts
检索召回	问题→最相关3段	rag/retriever.ts
拼提示词	资料塞进 system	rag/prompt.ts
运行（3 步）
cp .env.example .env，填第2周的对话 Key，再填 Embedding 与 Pinecone 的 Key/Host/索引名
npm i @langchain/textsplitters @pinecone-database/pinecone pdfjs-dist
npm run dev → 左侧面板测试 Pinecone 连接 → 上传 PDF/TXT → 提问，回答下方出现引用来源
注意
Pinecone 索引维度必须 = VITE_EMBED_DIM（OpenAI 3-small=1536，通义 v3=1024）
删掉 rag/ 与 useRag.ts 即退回第2周纯聊天，第2周逻辑未删