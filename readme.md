RAG Scientific Literature Explorer
Retrieval-Augmented Question Answering over Scientific PDFs

This project allows users to upload PDFs, automatically index them using embeddings + FAISS, and ask questions that are answered using a Groq LLM grounded in retrieved document context.

📁 Project Structure
RAG_Scientific-Literature-Explorer-with-Hypothesis-Drill-Down/
│
├── backend/                  # FastAPI server (RAG pipeline)
│   ├── main.py
│   ├── rag_pipeline.py
│   ├── requirements.txt
│   ├── .env.example
│   └── data/                # auto-created: PDF files + FAISS indexes
│
└── rag-frontend/            # Vite + React UI
    ├── src/
    ├── index.html
    ├── package.json
    └── .env.local

🚀 How to Run This Project
1. Clone the repository
git clone https://github.com/Nikhil2005menariya/RAG_Scientific-Literature-Explorer-with-Hypothesis-Drill-Down.git
cd RAG_Scientific-Literature-Explorer-with-Hypothesis-Drill-Down

🖥️ Backend Setup (FastAPI)
Step 1 — Create virtual environment
cd backend
python -m venv .venv
source .venv/bin/activate         # macOS/Linux
# .\.venv\Scripts\Activate.ps1    # Windows PowerShell

Step 2 — Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

Step 3 — Set environment variables

Copy .env.example → .env:

cp .env.example .env


Edit .env and add:

GROQ_API_KEY=your_groq_api_key_here


(Do NOT commit .env to GitHub.)

Step 4 — Run backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000


Backend will be available at:

http://localhost:8000


Health check:

http://localhost:8000/api/health

🌐 Frontend Setup (Vite + React)

Open a new terminal:

Step 1 — Move to frontend folder
cd rag-frontend

Step 2 — Install node modules
npm install

Step 3 — Create environment file

Create .env.local inside rag-frontend:

VITE_API_BASE_URL=http://localhost:8000

Step 4 — Run frontend
npm run dev


Frontend will run on:

http://localhost:5173

🧪 How to Use the Application

Open the frontend in your browser.

Upload any PDF (scientific paper, article, notes, etc.).

The backend automatically:

extracts PDF text,

chunks it,

generates embeddings (Sentence Transformers),

builds FAISS index.

Ask questions about the document.

The app retrieves the most relevant chunks and sends them to a Groq LLM for an accurate, citation-backed answer.

⚠️ Important Notes

Never commit:

.env

.venv/

node_modules/

backend/data/

If an API key is accidentally pushed, rotate it immediately and clean the Git history.

For large PDFs, ingestion may take a few seconds.

✔️ Summary Commands
Backend
cd backend
source .venv/bin/activate
uvicorn main:app --reload

Frontend
cd rag-frontend
npm run dev

🎉 You're Ready to Explore Scientific PDFs with RAG!

Upload PDFs → Build FAISS index → Ask Questions → Get LLM-powered answers grounded in citation-backed context.
