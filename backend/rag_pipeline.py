import os
import uuid
import json
import pickle
import numpy as np
import faiss
import requests
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

BASE_DATA = "data"
DOC_DIR = os.path.join(BASE_DATA, "docs")
INDEX_DIR = os.path.join(BASE_DATA, "indexes")

os.makedirs(DOC_DIR, exist_ok=True)
os.makedirs(INDEX_DIR, exist_ok=True)

EMBED_MODEL = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


# -------------------------
# Utility: Chunking
# -------------------------
def chunk_text(text, size=500, overlap=100):
    chunks = []
    text = text.strip()
    L = len(text)
    start = 0
    while start < L:
        end = min(start + size, L)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == L:
            break
        start = end - overlap
    return chunks


# -------------------------
# PDF → chunks
# -------------------------
def extract_chunks_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    docs = []
    for page_no, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        chunks = chunk_text(text)
        for ch in chunks:
            docs.append({"page": page_no, "text": ch})
    return docs


# -------------------------
# Build FAISS index
# -------------------------
def build_faiss_index(docs, index_path, meta_path):
    texts = [d["text"] for d in docs]
    embeddings = EMBED_MODEL.encode(texts, convert_to_numpy=True)
    faiss.normalize_L2(embeddings)

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    # Save index
    faiss.write_index(index, index_path)
    with open(meta_path, "wb") as f:
        pickle.dump(docs, f)


# -------------------------
# Load FAISS index
# -------------------------
def load_faiss_index(index_path, meta_path):
    index = faiss.read_index(index_path)
    with open(meta_path, "rb") as f:
        docs = pickle.load(f)
    return index, docs


# -------------------------
# Retrieval
# -------------------------
def retrieve(query, index, docs, top_k=4):
    q_emb = EMBED_MODEL.encode([query], convert_to_numpy=True)
    faiss.normalize_L2(q_emb)
    D, I = index.search(q_emb, top_k)

    results = []
    for score, idx in zip(D[0], I[0]):
        if idx == -1:
            continue
        d = docs[idx]
        results.append({
            "page": d["page"],
            "text": d["text"],
            "score": float(score)
        })
    return results


# -------------------------
# Groq LLM call
# -------------------------
def ask_llm(context, question):
    prompt = (
        "Use ONLY the provided document excerpts.\n"
        "If the answer cannot be found, say you don't see it.\n\n"
        "Context:\n" + context +
        "\n\nQuestion: " + question +
        "\n\nAnswer clearly and cite page numbers."
    )

    body = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.0,
        "max_tokens": 400
    }

    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}

    resp = requests.post(GROQ_URL, json=body, headers=headers)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


# -------------------------
# High-level: ingest PDF
# -------------------------
def ingest_pdf(pdf_path):
    doc_id = str(uuid.uuid4())
    chunks = extract_chunks_from_pdf(pdf_path)

    doc_folder = os.path.join(INDEX_DIR, doc_id)
    os.makedirs(doc_folder, exist_ok=True)

    index_file = os.path.join(doc_folder, "index.faiss")
    meta_file = os.path.join(doc_folder, "meta.pkl")

    build_faiss_index(chunks, index_file, meta_file)

    return doc_id, len(chunks)


# -------------------------
# High-level: answer question
# -------------------------
def answer_question(doc_id, question):
    doc_folder = os.path.join(INDEX_DIR, doc_id)
    index_file = os.path.join(doc_folder, "index.faiss")
    meta_file = os.path.join(doc_folder, "meta.pkl")

    index, docs = load_faiss_index(index_file, meta_file)
    hits = retrieve(question, index, docs, top_k=4)

    # Build context string
    context = ""
    for h in hits:
        snippet = h["text"].replace("\n", " ")
        context += f"[page {h['page']} | score {h['score']:.3f}] {snippet}\n"

    answer = ask_llm(context, question)

    return answer, hits
