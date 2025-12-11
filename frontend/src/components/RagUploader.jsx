import React, { useState, useRef } from "react";

/**
 * RagUploader.jsx
 * Finalized React component for uploading a PDF and asking questions.
 * - Uses VITE_API_BASE_URL from import.meta.env (falls back to empty string)
 * - Expects backend endpoints:
 *    POST ${API_BASE}/api/upload  -> multipart/form-data (file)
 *    POST ${API_BASE}/api/query   -> JSON { docId, question }
 *
 * Drop this file into: src/components/RagUploader.jsx
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function RagUploader() {
  const [file, setFile] = useState(null);
  const [docId, setDocId] = useState(null);
  const [filename, setFilename] = useState("");
  const [pages, setPages] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  function resetInteraction() {
    setQuestion("");
    setAnswer(null);
    setSources([]);
    setLoadingAnswer(false);
    setError(null);
  }

  async function handleFileSelect(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFilename(f.name);
    resetInteraction();
  }

  async function uploadFile() {
    if (!file) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file, file.name);

    try {
      const resp = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: form,
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Upload failed: ${resp.status} ${text}`);
      }
      const data = await resp.json();
      setDocId(data.docId);
      setFilename(data.filename || file.name);
      setPages(data.pages || null);
      // keep previous interaction cleared
      resetInteraction();
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  async function askQuestion(e) {
    e?.preventDefault();
    setError(null);
    if (!docId) {
      setError("Upload a document first.");
      return;
    }
    if (!question.trim()) {
      setError("Please type a question.");
      return;
    }
    setLoadingAnswer(true);
    setAnswer(null);
    setSources([]);

    try {
      const resp = await fetch(`${API_BASE}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, question }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Query failed: ${resp.status} ${txt}`);
      }
      const data = await resp.json();
      setAnswer(data.answer ?? "(no answer returned)");
      setSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoadingAnswer(false);
    }
  }

  function renderSources() {
    if (!sources || sources.length === 0) return null;
    return (
      <div className="mt-4 space-y-3">
        <h4 className="text-sm font-semibold">Context / Sources</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {sources.map((s, i) => (
            <div key={i} className="p-3 border rounded-md bg-white/50">
              <div className="text-xs text-gray-500">page {s.page} • score {typeof s.score==="number"? s.score.toFixed(3) : "-"}</div>
              <div className="mt-1 text-sm text-gray-800 break-words">{s.text}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 flex items-start justify-center">
      <div className="w-full max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">RAG QA — Upload a PDF & Ask Questions</h1>
          <p className="mt-1 text-sm text-slate-500">Upload a document, then ask questions grounded in that document.</p>
        </header>

        <main className="space-y-6">
          <section className="rounded-lg border p-4 bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">PDF</div>
                <div>
                  <div className="text-sm font-medium">Document</div>
                  <div className="text-xs text-slate-500">Upload a PDF for question answering</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center px-3 py-2 bg-slate-800 text-white rounded-md cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  Select PDF
                </label>

                <button
                  disabled={!file || uploading}
                  onClick={uploadFile}
                  className="px-3 py-2 rounded-md border bg-white text-slate-700 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : docId ? "Re-upload" : "Upload"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="text-sm text-slate-600">Selected: <span className="font-medium">{filename || "—"}</span></div>
              <div className="text-sm text-slate-600">Status: <span className="font-medium">{docId ? "Indexed" : "Not uploaded"}</span></div>
              <div className="text-sm text-slate-600">Pages: <span className="font-medium">{pages ?? "—"}</span></div>
            </div>
            {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
          </section>

          <section className="rounded-lg border p-4 bg-white shadow-sm">
            <form onSubmit={askQuestion} className="space-y-3">
              <div className="flex gap-3">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={docId ? "Type a question about the uploaded document..." : "Upload a document first..."}
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring"
                  disabled={!docId}
                />
                <button
                  type="submit"
                  disabled={!docId || loadingAnswer}
                  className="px-4 py-2 bg-slate-800 text-white rounded-md disabled:opacity-50"
                >
                  {loadingAnswer ? "Thinking..." : "Ask"}
                </button>
              </div>
            </form>

            <div className="mt-4">
              <h3 className="text-sm font-semibold">Answer</h3>
              <div className="mt-2 min-h-[80px] p-3 rounded-md border bg-white/50">
                {loadingAnswer ? (
                  <div className="text-sm text-slate-500">Waiting for model...</div>
                ) : answer ? (
                  <div className="prose text-sm text-slate-800 whitespace-pre-wrap">{answer}</div>
                ) : (
                  <div className="text-sm text-slate-500">No answer yet. Ask a question to get started.</div>
                )}
              </div>

              {renderSources()}
            </div>
          </section>

        </main>

        <footer className="mt-8 text-xs text-slate-400">Build By NIK</footer>
      </div>
    </div>
  );
}
