"use client";

import { useRef, useState, useEffect } from "react";
import { Maximize2, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { KGGraph } from "@/lib/api";

// Matches explore.html BLOOM_COLORS: bg = node fill, fg = label text, dot = border/legend
const BLOOM_PALETTE: Record<string, { bg: string; fg: string; dot: string }> = {
  Remember:   { bg: "#374151", fg: "#9ca3af", dot: "#6b7280" },
  Understand: { bg: "#1e3a5f", fg: "#93c5fd", dot: "#3b82f6" },
  Apply:      { bg: "#14532d", fg: "#86efac", dot: "#22c55e" },
  Analyze:    { bg: "#713f12", fg: "#fcd34d", dot: "#f59e0b" },
  Evaluate:   { bg: "#7c2d12", fg: "#fdba74", dot: "#f97316" },
  Create:     { bg: "#581c87", fg: "#d8b4fe", dot: "#a855f7" },
};

function pal(level: string) {
  return BLOOM_PALETTE[level] ?? BLOOM_PALETTE.Understand;
}

interface Props {
  knowledgeId: string;
  graph: KGGraph;
}

export function KGGraphCard({ knowledgeId, graph }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Network className="h-4 w-4 text-[#A29BFE]" />
            Knowledge Graph
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => window.open(`/graph/${knowledgeId}`, "_blank")}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Full screen
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} className="aspect-square w-full relative overflow-hidden">
          <GraphCanvas graph={graph} containerRef={containerRef} />
        </div>
        <BloomLegend />
      </CardContent>
    </Card>
  );
}

export function GraphCanvas({
  graph,
  containerRef,
}: {
  graph: KGGraph;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [ForceGraph, setForceGraph] = useState<any>(null);
  const [dims, setDims] = useState({ width: 600, height: 600 });
  const fgRef = useRef<any>(null);

  useEffect(() => {
    import("react-force-graph-2d").then((m) => setForceGraph(() => m.default));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ width, height });
    });
    obs.observe(el);
    const { width, height } = el.getBoundingClientRect();
    setDims({ width, height });
    return () => obs.disconnect();
  }, [containerRef]);

  // Spread nodes wide; no central gravity to avoid ring clustering
  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.d3Force("charge").strength(-400);
    fgRef.current.d3Force("link").distance(130).iterations(3);
  }, [ForceGraph, graph]);

  if (!ForceGraph) return null;

  const data = {
    nodes: graph.nodes.map((n) => {
      const p = pal(n.bloomLevel);
      return {
        id: n.id,
        label: n.label,
        bloomLevel: n.bloomLevel,
        importance: n.importance ?? 0.5,
        bg: p.bg,
        fg: p.fg,
        dot: p.dot,
      };
    }),
    links: graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.relation,
    })),
  };

  function nodeRadius(importance: number) {
    return 8 + importance * 14; // 8–22 px in graph coords
  }

  return (
    <ForceGraph
      ref={fgRef}
      graphData={data}
      width={dims.width}
      height={dims.height}
      backgroundColor="transparent"
      nodeLabel="label"
      nodeVal={(n: any) => n.importance * 30 + 8}
      linkCurvature={0.1}
      cooldownTicks={150}
      // ── Node: dark fill, accent border, colored label with dark stroke outline ─
      nodeCanvasObjectMode={() => "replace"}
      nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const r = nodeRadius(node.importance);

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = node.bg;
        ctx.fill();
        ctx.strokeStyle = node.dot;
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();

        // screen-stable label with dark outline (no background rect)
        const fontSize = 11 / globalScale;
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const textY = node.y + r + 3 / globalScale;

        ctx.lineWidth = 3 / globalScale;
        ctx.strokeStyle = "rgba(9,9,16,0.95)";
        ctx.strokeText(node.label, node.x, textY);
        ctx.fillStyle = node.fg;
        ctx.fillText(node.label, node.x, textY);
      }}
      // pointer area covers circle + label area below
      nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const r = nodeRadius(node.importance);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        ctx.fill();
        const fontSize = 11 / globalScale;
        const labelH = fontSize + 4 / globalScale;
        const textY = node.y + r + 3 / globalScale;
        ctx.fillRect(node.x - r * 2, textY, r * 4, labelH);
      }}
      // ── Link: manual arrow + relation label with dark outline ──────────────
      linkCanvasObjectMode={() => "replace"}
      linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const src = link.source;
        const tgt = link.target;
        if (src.x == null || tgt.x == null) return;

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const ux = dx / dist;
        const uy = dy / dist;

        const srcR = nodeRadius(src.importance ?? 0.5);
        const tgtR = nodeRadius(tgt.importance ?? 0.5);
        const arrowLen = 8 / globalScale;
        const arrowAngle = Math.PI / 6;

        const startX = src.x + ux * srcR;
        const startY = src.y + uy * srcR;
        const tipX = tgt.x - ux * tgtR;
        const tipY = tgt.y - uy * tgtR;
        const endX = tipX - ux * arrowLen;
        const endY = tipY - uy * arrowLen;

        // line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = "#4a4a6e";
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();

        // arrowhead
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(
          tipX - arrowLen * (Math.cos(arrowAngle) * ux - Math.sin(arrowAngle) * uy),
          tipY - arrowLen * (Math.cos(arrowAngle) * uy + Math.sin(arrowAngle) * ux),
        );
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(
          tipX - arrowLen * (Math.cos(arrowAngle) * ux + Math.sin(arrowAngle) * uy),
          tipY - arrowLen * (Math.cos(arrowAngle) * uy - Math.sin(arrowAngle) * ux),
        );
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();

        // relation label with dark stroke outline — no background rect needed
        if (!link.label || globalScale < 0.3) return;
        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y + tgt.y) / 2;
        const fontSize = 9 / globalScale;
        ctx.font = `${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.lineWidth = 2.5 / globalScale;
        ctx.strokeStyle = "rgba(9,9,16,0.95)";
        ctx.strokeText(link.label, midX, midY);
        ctx.fillStyle = "#a0aec0";
        ctx.fillText(link.label, midX, midY);
      }}
    />
  );
}

export function BloomLegend() {
  const levels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"] as const;
  return (
    <div className="flex flex-wrap gap-3 px-4 py-2 border-t border-border">
      {levels.map((l) => (
        <div key={l} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pal(l).dot }} />
          {l}
        </div>
      ))}
    </div>
  );
}
