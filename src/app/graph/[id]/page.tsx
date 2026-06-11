"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getGraph, type KGGraph } from "@/lib/api";
import { GraphCanvas, BloomLegend } from "@/components/KGGraphCard";

export default function GraphFullPage() {
  const { id } = useParams<{ id: string }>();
  const [graph, setGraph] = useState<KGGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGraph(id)
      .then(setGraph)
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <div className="w-screen h-screen bg-background flex flex-col overflow-hidden">
      <div ref={containerRef} className="flex-1 relative">
        {!graph && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Loading graph…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-rose-400 text-sm">
            {error}
          </div>
        )}
        {graph && <GraphCanvas graph={graph} containerRef={containerRef} />}
      </div>
      <BloomLegend />
    </div>
  );
}
