import { Suspense } from "react";
import { ContentCatalog } from "@/components/ContentCatalog";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Prove what you know.{" "}
          <span className="text-[#A29BFE]">Earn KAL.</span>
        </h1>
        <p className="text-muted-foreground">
          Take AI-adaptive knowledge assessments on any content.
          Pass the test — get a Soulbound Token and KAL tokens.
        </p>
      </div>
      <Suspense fallback={<CatalogSkeleton />}>
        <ContentCatalog />
      </Suspense>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-44 rounded-xl bg-card border border-border animate-pulse" />
      ))}
    </div>
  );
}
