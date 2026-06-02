"use client";

import { useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Network, Brain } from "lucide-react";
import { submitAnswer, getResult, type VerifyQuestion, type AnswerFeedback } from "@/lib/api";
import { QuestionCard } from "@/components/QuestionCard";
import { KGGraphModal } from "@/components/KGGraphModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface IRTState {
  theta: number;
  se: number;
  bloomLevel: string;
  questionNumber: number;
}

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const knowledgeId = searchParams.get("knowledgeId") ?? "";

  const [question, setQuestion] = useState<VerifyQuestion | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(`q_${sessionId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  const [irtState, setIrtState] = useState<IRTState | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingResult, setFetchingResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswer = useCallback(
    async (answer: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const fb = await submitAnswer(sessionId, answer);
        setIrtState(fb.progress);
        setFeedback(fb);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSubmitting(false);
      }
    },
    [sessionId]
  );

  const handleNext = useCallback(async () => {
    if (!feedback) return;
    if (feedback.isComplete) {
      setFetchingResult(true);
      try {
        const result = await getResult(sessionId);
        sessionStorage.setItem(`result_${sessionId}`, JSON.stringify(result));
        router.push(
          `/result/${sessionId}?knowledgeId=${knowledgeId}&passed=${result.competenceIndicator ? "1" : "0"}`
        );
      } catch (e) {
        setError((e as Error).message);
        setFetchingResult(false);
      }
    } else if (feedback.nextQuestion) {
      setQuestion(feedback.nextQuestion);
      setFeedback(null);
    }
  }, [feedback, sessionId, knowledgeId, router]);

  if (fetchingResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Brain className="h-12 w-12 text-[#A29BFE] animate-pulse" />
        <p className="text-muted-foreground">Finalizing your result…</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Session not found or expired.</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Brain className="h-4 w-4" />
          <span>Adaptive Test</span>
          {irtState && (
            <>
              <span className="text-[#A29BFE]">θ={irtState.theta.toFixed(2)}</span>
              <span className="text-xs">SE={irtState.se.toFixed(2)}</span>
              <Badge variant="outline" className="text-xs">{irtState.bloomLevel}</Badge>
            </>
          )}
        </div>
        {knowledgeId && (
          <KGGraphModal
            knowledgeId={knowledgeId}
            trigger={
              <Button variant="ghost" size="sm">
                <Network className="h-4 w-4" />
                Knowledge Graph
              </Button>
            }
          />
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      <QuestionCard
        question={question}
        onSubmit={handleAnswer}
        onNext={handleNext}
        isSubmitting={submitting}
        feedback={feedback}
      />
    </div>
  );
}
