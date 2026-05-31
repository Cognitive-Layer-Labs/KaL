"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGraph, type KGGraph } from "@/lib/api";
import { bloomColor } from "@/lib/utils";

interface KGGraphModalProps {
  knowledgeId: string;
  trigger?: React.ReactNode;
}

export function KGGraphModal({ knowledgeId, trigger }: KGGraphModalProps) {
  const [open, setOpen] = useState(false);
  const [graph, setGraph] = useState<KGGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ForceGraphRef = useRef<any>(null);

  useEffect(() => {
    if (!open || graph) return;
    setLoading(true);
    getGraph(knowledgeId)
      .then(setGraph)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, knowledgeId, graph]);

  const renderGraph = useCallback(async () => {
    if (!graph || !containerRef.current) return;
    const { default: ForceGraph2D } = await import("react-force-graph-2d");
    ForceGraphRef.current = ForceGraph2D;

    const nodes = graph.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      bloomLevel: n.bloomLevel,
      color: bloomColor(n.bloomLevel),
    }));

    const links = graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.relation,
    }));

    // Force re-render via state if needed — this component uses a portal
  }, [graph]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Network className="h-4 w-4" />
            View Knowledge Graph
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-4 sm:inset-8 z-50 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <Dialog.Title className="font-semibold">Knowledge Graph</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 relative overflow-hidden" ref={containerRef}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Loading graph…
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center text-rose-400 text-sm px-8 text-center">
                {error}
              </div>
            )}
            {graph && !loading && (
              <GraphCanvas graph={graph} containerRef={containerRef} />
            )}
          </div>

          <BloomLegend />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function GraphCanvas({
  graph,
  containerRef,
}: {
  graph: KGGraph;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [ForceGraph, setForceGraph] = useState<any>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });

  useEffect(() => {
    import("react-force-graph-2d").then((m) => setForceGraph(() => m.default));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ width, height });
    });
    obs.observe(containerRef.current);
    const { width, height } = containerRef.current.getBoundingClientRect();
    setDims({ width, height });
    return () => obs.disconnect();
  }, [containerRef]);

  if (!ForceGraph) return null;

  const data = {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      bloomLevel: n.bloomLevel,
      color: bloomColor(n.bloomLevel),
    })),
    links: graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.relation,
    })),
  };

  return (
    <ForceGraph
      graphData={data}
      width={dims.width}
      height={dims.height}
      backgroundColor="transparent"
      nodeLabel="label"
      nodeColor={(n: any) => n.color}
      nodeRelSize={5}
      linkColor={() => "rgba(148,163,184,0.3)"}
      linkLabel="label"
      linkDirectionalArrowLength={4}
      linkDirectionalArrowRelPos={1}
      nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.label as string;
        const fontSize = Math.min(12, 10 / globalScale + 2);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, node.x, node.y + 7);
      }}
      cooldownTicks={80}
    />
  );
}

function BloomLegend() {
  const levels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];
  return (
    <div className="flex flex-wrap gap-3 px-4 py-2 border-t border-border">
      {levels.map((l) => (
        <div key={l} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: bloomColor(l) }}
          />
          {l}
        </div>
      ))}
    </div>
  );
}
