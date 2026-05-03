# RAG Chatbot

A full-stack Retrieval-Augmented Generation (RAG) chatbot application that allows users to upload PDF documents and ask questions about them using AI. The system combines document retrieval with large language models to provide accurate, context-aware answers.

## 🌟 Features

- **📄 PDF Document Processing**: Upload and process PDF documents with automatic text extraction and chunking
- **🤖 Intelligent Question Answering**: Ask questions about your documents and get AI-powered responses
- **🔍 Vector Search**: Efficient semantic search using ChromaDB and sentence transformers
- **🌐 Web Fallback**: Optional web search integration when document context is insufficient
- **💬 Conversational AI**: Handles casual conversations and greetings naturally
- **📊 Source Citations**: Provides references to specific pages and sources in responses
- **🖼️ Diagram Extraction**: Displays relevant PDF page images alongside answers
- **⚡ Caching System**: Multi-level caching for embeddings, retrievals, and answers
- **🎨 Modern UI**: Beautiful, responsive Next.js frontend with dark mode support
- **📱 Mobile Friendly**: Fully responsive design with mobile-optimized interface

## 🏗️ Architecture

### Backend (FastAPI + Python)
- **FastAPI**: High-performance REST API
- **ChromaDB**: Vector database for document embeddings
- **Sentence Transformers**: Text embedding generation (BAAI/bge-small-en-v1.5)
- **Groq API**: LLM inference with multiple model fallback support
- **PyMuPDF**: PDF text extraction and page rendering
- **BeautifulSoup4**: Web scraping for fallback search

### Frontend (Next.js + TypeScript)
- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Lucide Icons**: Beautiful icon library

## 📋 Prerequisites

- Python 3.8+
- Node.js 18+
- npm or pnpm
- Groq API key ([Get one here](https://console.groq.com))

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Backend Setup

#### Create Virtual Environment

```bash
python -m venv ragvenv
source ragvenv/bin/activate  # On Windows: ragvenv\Scripts\activate
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_FALLBACK_MODELS=llama-3.1-8b-instant,llama-3.3-70b-versatile
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
CHROMA_PERSIST_DIR=data/chroma
CHROMA_COLLECTION=documents
PDF_DIR=dataset/pdfs
TOP_K=12
SIMILARITY_THRESHOLD=0.5
WEB_SEARCH_ENABLED=false
WEB_MAX_RESULTS=6
WEB_MAX_CHARS=12000
CACHE_MAX_ITEMS=512
CACHE_TTL_SECONDS=3600
CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_CREDENTIALS=false
MAX_UPLOAD_MB=50
```

### 3. Frontend Setup

```bash
cd frontend
npm install  # or: pnpm install
```

Create `frontend/.env.local`:

```env
BACKEND_URL=http://127.0.0.1:8000
BACKEND_TIMEOUT_MS=30000
```

## 🎯 Usage

### Start the Backend Server

```bash
# From project root, with virtual environment activated
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Start the Frontend Development Server

```bash
cd frontend
npm run dev  # or: pnpm dev
```

The application will be available at `http://localhost:3000`

### Ingest Documents (Optional)

To pre-process PDFs from the `dataset/pdfs` directory:

```bash
python -m app.ingest
```

## 📚 API Endpoints

### Health Check
```
GET /health
GET /api/health
```

### Chat
```
POST /chat
Body: {
  "question": "Your question here",
  "allow_web_fallback": true,
  "source": "document.pdf"  // optional
}
```

### Upload PDF
```
POST /upload_pdf
Body: multipart/form-data with file field
```

### List Sources
```
GET /sources
```

### Get PDF Page Image
```
GET /pdf_page_image?source=document.pdf&page=1
```

## 🔧 Configuration

### Backend Configuration

All backend settings are configured via environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq API key (required) | - |
| `GROQ_MODEL` | Primary LLM model | `llama-3.3-70b-versatile` |
| `GROQ_FALLBACK_MODELS` | Comma-separated fallback models | `llama-3.1-8b-instant,llama-3.3-70b-versatile` |
| `EMBEDDING_MODEL` | Sentence transformer model | `BAAI/bge-small-en-v1.5` |
| `CHROMA_PERSIST_DIR` | ChromaDB storage directory | `data/chroma` |
| `CHROMA_COLLECTION` | Collection name | `documents` |
| `PDF_DIR` | Default PDF directory | `dataset/pdfs` |
| `TOP_K` | Number of chunks to retrieve | `12` |
| `SIMILARITY_THRESHOLD` | Cosine similarity threshold | `0.5` |
| `WEB_SEARCH_ENABLED` | Enable web fallback | `false` |
| `WEB_MAX_RESULTS` | Max web search results | `6` |
| `WEB_MAX_CHARS` | Max chars from web | `12000` |
| `CACHE_MAX_ITEMS` | Cache size | `512` |
| `CACHE_TTL_SECONDS` | Cache TTL | `3600` |
| `MAX_UPLOAD_MB` | Max upload size | `50` |

### Chunking Strategy

Documents are split into chunks with:
- **Chunk size**: 1200 characters
- **Overlap**: 200 characters
- **Smart boundaries**: Splits at sentence/paragraph boundaries when possible

## 🎨 Frontend Features

### User Interface
- **Drag & Drop**: Upload PDFs by dragging them into the interface
- **Quick Prompts**: Pre-defined questions for common queries
- **Source Management**: View and manage uploaded documents
- **Mode Toggle**: Switch between document-only and web-enabled modes
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### Chat Features
- **Streaming-like Experience**: Smooth message rendering
- **Source Citations**: Click to view referenced document pages
- **Diagram Display**: Visual context from PDF pages
- **Mode Indicators**: Shows whether answer came from documents, web, or LLM knowledge
- **Error Handling**: Clear error messages and retry options

## 📁 Project Structure

```
.
├── app/                      # Backend application
│   ├── main.py              # FastAPI application entry point
│   ├── settings.py          # Configuration management
│   ├── rag.py               # RAG query logic
│   ├── embedding.py         # Text embedding generation
│   ├── vectorstore.py       # ChromaDB operations
│   ├── chunking.py          # Text chunking utilities
│   ├── ingest.py            # Document ingestion
│   ├── pdf_loader.py        # PDF processing
│   ├── web_fallback.py      # Web search integration
│   ├── cache.py             # Caching implementation
│   └── diagnose.py          # Diagnostic utilities
├── frontend/                 # Next.js frontend
│   ├── app/                 # App router pages
│   │   ├── page.tsx         # Main chat interface
│   │   ├── layout.tsx       # Root layout
│   │   └── api/             # API routes
│   ├── components/          # React components
│   │   ├── chat-message.tsx
│   │   ├── chat-input.tsx
│   │   ├── welcome-section.tsx
│   │   └── ui/              # UI component library
│   └── lib/                 # Utilities
├── data/                     # Runtime data
│   ├── chroma/              # Vector database storage
│   └── uploads/             # Uploaded PDFs
├── dataset/                  # Pre-loaded documents
│   └── pdfs/                # PDF files for ingestion
├── requirements.txt          # Python dependencies
├── .env.example             # Environment template
└── README.md                # This file
```

## 🔄 How It Works

1. **Document Upload**: User uploads a PDF through the web interface
2. **Text Extraction**: PyMuPDF extracts text from the PDF
3. **Chunking**: Text is split into overlapping chunks (1200 chars, 200 overlap)
4. **Embedding**: Each chunk is converted to a vector embedding
5. **Storage**: Embeddings are stored in ChromaDB with metadata
6. **Query Processing**: User asks a question
7. **Retrieval**: Question is embedded and similar chunks are retrieved
8. **Context Building**: Retrieved chunks are formatted as context
9. **LLM Generation**: Groq API generates an answer using the context
10. **Response**: Answer is returned with source citations and diagrams

### Response Modes

- **document_rag**: Answer from uploaded documents
- **web_fallback**: Answer from web search (when document context insufficient)
- **llm_knowledge**: Answer from LLM's general knowledge
- **conversational**: Casual conversation handling

## 🧪 Testing

### Test Backend Health

```bash
curl http://localhost:8000/health
```

### Test Chat Endpoint

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is this document about?", "source": "your-document.pdf"}'
```

## 🐛 Troubleshooting

### Backend Issues

**Problem**: `GROQ_API_KEY is not set`
- **Solution**: Ensure `.env` file exists and contains valid `GROQ_API_KEY`

**Problem**: No documents in vector store
- **Solution**: Upload a PDF via the UI or run `python -m app.ingest`

**Problem**: CORS errors
- **Solution**: Add your frontend URL to `CORS_ALLOW_ORIGINS` in `.env`

### Frontend Issues

**Problem**: Cannot reach backend
- **Solution**: Ensure backend is running on port 8000 and `BACKEND_URL` is correct

**Problem**: Upload fails
- **Solution**: Check file size (max 50MB) and ensure it's a valid PDF

## 🚀 Deployment

### Backend Deployment

The backend can be deployed to any platform supporting Python:
- **Railway**: Add `Procfile` with `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Render**: Use `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **AWS/GCP/Azure**: Use Docker or serverless functions

### Frontend Deployment

The frontend is optimized for Vercel:

```bash
cd frontend
vercel deploy
```

Set environment variables in Vercel dashboard:
- `BACKEND_URL`: Your backend API URL
- `BACKEND_TIMEOUT_MS`: Request timeout (default: 30000)

## 📝 License

This project is provided as-is for educational and commercial use.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📧 Support

For questions or issues, please open an issue on the repository.

## 🙏 Acknowledgments

- **Groq**: Fast LLM inference
- **ChromaDB**: Vector database
- **Sentence Transformers**: Embedding models
- **FastAPI**: Modern Python web framework
- **Next.js**: React framework
- **Vercel**: Frontend hosting platform

---

Built with ❤️ using FastAPI, Next.js, and AI
