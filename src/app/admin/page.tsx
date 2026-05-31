"use client";

import { useState, useCallback } from "react";
import { Upload, Link as LinkIcon, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { indexUrl, uploadFile, getIndexStatus } from "@/lib/api";

type IndexResult = { knowledgeId: string; status: string; contentId?: number };

export default function AdminPage() {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IndexResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  async function handleIndexUrl() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await indexUrl(url.trim());
      setResult(data);
      if (data.status !== "ready") startPolling(data.knowledgeId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await uploadFile(file);
      setResult(data);
      if (data.status !== "ready") startPolling(data.knowledgeId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function startPolling(knowledgeId: string) {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const status = await getIndexStatus(knowledgeId);
        setResult((prev) => prev ? { ...prev, status: status.status } : null);
        if (status.status === "ready" || status.status === "failed") {
          clearInterval(interval);
          setPolling(false);
        }
      } catch {
        clearInterval(interval);
        setPolling(false);
      }
    }, 5000);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Admin — Content Upload</h1>

      {/* URL indexing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-[#A29BFE]" />
            Index a URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article  or  ipfs://CID"
              className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7] placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === "Enter" && handleIndexUrl()}
            />
            <Button variant="kal" size="sm" disabled={loading || !url.trim()} onClick={handleIndexUrl}>
              Index
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File upload */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-[#A29BFE]" />
            Upload a File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-xl px-6 py-10 text-center cursor-pointer hover:border-[#6C5CE7]/50 transition-colors"
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            {file ? (
              <p className="text-sm font-medium">{file.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Drop a PDF or text file here, or click to browse
              </p>
            )}
            <input
              id="file-input"
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            variant="kal"
            className="w-full"
            disabled={loading || !file}
            onClick={handleUpload}
          >
            <Upload className="h-4 w-4" />
            {loading ? "Uploading…" : "Upload & Index"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={result.status === "ready" ? "border-emerald-500/30" : "border-amber-500/30"}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2">
              {result.status === "ready" ? (
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              ) : (
                <RefreshCw className={`h-4 w-4 text-amber-400 ${polling ? "animate-spin" : ""}`} />
              )}
              <span className="text-sm font-medium capitalize">{result.status}</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              knowledgeId: {result.knowledgeId}
            </p>
            {result.contentId != null && (
              <p className="text-xs text-muted-foreground font-mono">
                contentId: {result.contentId}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-rose-500/30">
          <CardContent className="pt-4 flex items-center gap-2 text-rose-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
