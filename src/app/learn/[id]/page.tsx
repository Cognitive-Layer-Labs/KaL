"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, GraduationCap, ExternalLink, Youtube, FileText, Globe,
  File as FileIcon, BookOpen,
} from "lucide-react";
import { getIndexStatus, getGraph, type KGGraph } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { KGGraphCard } from "@/components/KGGraphCard";
import {
  detectSourceType, youtubeEmbed, type SourceType,
} from "@/lib/catalog-config";

interface ContentStatus {
  knowledgeId: string;
  status: string;
  title?: string;
  source?: string;
}

const TYPE_ICON: Record<SourceType, typeof Youtube> = {
  youtube: Youtube,
  pdf: FileText,
  web: Globe,
  file: FileIcon,
};
const TYPE_LABEL: Record<SourceType, string> = {
  youtube: "Video",
  pdf: "PDF",
  web: "Article",
  file: "File",
};

export default function LearnPage() {
  const { id: knowledgeId } = useParams<{ id: string }>();
  const [content, setContent] = useState<ContentStatus | null>(null);
  const [graph, setGraph] = useState<KGGraph | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getIndexStatus(knowledgeId).catch(() => null),
      getGraph(knowledgeId).catch(() => null),
    ]).then(([status, g]) => {
      setContent(status);
      setGraph(g);
    }).finally(() => setLoading(false));
  }, [knowledgeId]);

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">Loading material…</div>;
  }

  const source = content?.source ?? "";
  const type = detectSourceType(source);
  const TypeIcon = TYPE_ICON[type];
  const title = content?.title || "Learning material";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to courses
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-kal/30 bg-kal/10 px-2.5 py-1 text-xs font-medium text-kal-light">
          <TypeIcon className="h-3.5 w-3.5" />
          {TYPE_LABEL[type]}
        </span>
        <h1 className="font-display text-2xl font-extrabold leading-tight">{title}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* material pane */}
        <div className="min-w-0">
          <MaterialPane type={type} source={source} />
        </div>

        {/* knowledge graph + start test */}
        <aside className="space-y-4">
          {graph ? (
            <KGGraphCard knowledgeId={knowledgeId} graph={graph} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Knowledge graph unavailable.
            </div>
          )}

          <div className="rounded-xl border border-kal/25 glass p-5">
            <div className="flex items-center gap-2 font-display font-bold">
              <BookOpen className="h-4 w-4 text-kal-light" />
              Done studying?
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Take the adaptive test to mint your KAL and Soulbound credential.
            </p>
            <Button variant="kal" className="mt-4 w-full" asChild>
              <Link href={`/content/${knowledgeId}`}>
                <GraduationCap className="h-4 w-4" />
                Start Test
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── material pane: render per type with graceful fallback ──────────────────────

function MaterialPane({ type, source }: { type: SourceType; source: string }) {
  if (type === "youtube") {
    const embed = youtubeEmbed(source);
    if (embed) {
      return (
        <div className="overflow-hidden rounded-xl border border-border bg-black">
          <div className="aspect-video w-full">
            <iframe
              src={embed}
              title="Course video"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      );
    }
  }

  if (type === "pdf") {
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <iframe src={source} title="Course PDF" className="h-[72vh] w-full" />
        </div>
        <OpenExternally source={source} note="PDF not displaying? Open it directly." />
      </div>
    );
  }

  // web / file / unknown — iframing is unreliable (X-Frame-Options) or there's no
  // public URL, so offer a clean open-in-new-tab path instead.
  return <FallbackCard type={type} source={source} />;
}

function FallbackCard({ type, source }: { type: SourceType; source: string }) {
  const isFile = type === "file" || !/^https?:\/\//.test(source);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
      <Globe className="mb-4 h-10 w-10 text-kal/60" />
      <h3 className="font-display text-lg font-bold">
        {isFile ? "Uploaded material" : "External material"}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {isFile
          ? "This material was uploaded to the oracle and can't be previewed inline. Study it from your source, then take the test."
          : "This source can't be embedded here (the site blocks framing). Open it in a new tab to study, then come back to take the test."}
      </p>
      {!isFile && (
        <Button variant="kal" className="mt-6" asChild>
          <a href={source} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open material
          </a>
        </Button>
      )}
      {source && (
        <p className="tape mt-4 max-w-full truncate text-muted-foreground" title={source}>
          {source}
        </p>
      )}
    </div>
  );
}

function OpenExternally({ source, note }: { source: string; note: string }) {
  return (
    <a
      href={source}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-kal-light"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      {note}
    </a>
  );
}
