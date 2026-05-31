import Link from "next/link";
import { BookOpen, Network } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KGGraphModal } from "@/components/KGGraphModal";
import type { ContentItem } from "@/lib/api";

interface ContentCardProps {
  item: ContentItem;
  kalEstimate?: number;
}

function shortSource(source: string): string {
  try {
    const url = new URL(source);
    return url.hostname + (url.pathname.length > 1 ? url.pathname.slice(0, 30) + "…" : "");
  } catch {
    return source.slice(0, 40) + (source.length > 40 ? "…" : "");
  }
}

export function ContentCard({ item, kalEstimate }: ContentCardProps) {
  return (
    <Card className="flex flex-col hover:border-[#6C5CE7]/40 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug line-clamp-2">
            {item.title ?? shortSource(item.source)}
          </CardTitle>
          {item.status === "ready" ? (
            <Badge variant="kal" className="shrink-0">Ready</Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 text-amber-400 border-amber-400/30">Indexing</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 text-xs text-muted-foreground font-mono truncate">
        {shortSource(item.source)}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          {kalEstimate != null && (
            <span className="text-xs text-[#A29BFE] font-semibold">
              ~{kalEstimate} KAL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <KGGraphModal knowledgeId={item.knowledgeId} trigger={
            <Button variant="ghost" size="icon" title="View Knowledge Graph">
              <Network className="h-4 w-4 text-muted-foreground" />
            </Button>
          } />
          {item.status === "ready" && (
            <Button variant="kal" size="sm" asChild>
              <Link href={`/content/${item.knowledgeId}`}>
                <BookOpen className="h-4 w-4" />
                Start Test
              </Link>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
