"use client";

import { useState, useEffect } from "react";
import { Send, ChevronRight, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { VerifyQuestion, AnswerFeedback } from "@/lib/api";

interface QuestionCardProps {
  question: VerifyQuestion;
  onSubmit: (answer: string) => void;
  onNext: () => void;
  isSubmitting: boolean;
  feedback?: AnswerFeedback | null;
}

export function QuestionCard({ question, onSubmit, onNext, isSubmitting, feedback }: QuestionCardProps) {
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);

  // Reset input when question changes
  useEffect(() => {
    setAnswer("");
    setSelected(null);
    setSubmittedAnswer(null);
  }, [question.number]);

  const progress = ((question.number - 1) / question.totalQuestions) * 100;
  const isMCQ = question.type === "mcq" || question.type === "true_false";

  function handleSubmit() {
    const value = isMCQ ? selected ?? "" : answer;
    if (!value.trim()) return;
    setSubmittedAnswer(value);
    onSubmit(value);
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            Question {question.number} of {question.totalQuestions}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {question.bloomLevel}
            </Badge>
            <span className="text-xs text-muted-foreground">
              diff {question.difficulty.toFixed(2)}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-base leading-relaxed">{question.text}</p>

        {feedback ? (
          // ── Feedback mode ──────────────────────────────────────────────────
          <div className="space-y-3">
            {/* MCQ/TF: show all options with correct/chosen highlights */}
            {isMCQ && question.options && (
              <div className="space-y-2">
                {question.options.map((opt, i) => {
                  const isCorrect = opt === feedback.correctAnswer;
                  const isChosen = opt === submittedAnswer;
                  const isWrongChoice = isChosen && !isCorrect;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm ${
                        isCorrect
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                          : isWrongChoice
                          ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
                          : "border-border/40 text-muted-foreground opacity-50"
                      }`}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : isWrongChoice ? (
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      ) : (
                        <span className="w-3.5 h-3.5 shrink-0" />
                      )}
                      {opt}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Result banner */}
            <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
              feedback.correct
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-rose-500/30 bg-rose-500/10"
            }`}>
              {feedback.correct
                ? <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                : <XCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              }
              <div className="space-y-1 min-w-0">
                <p className={`text-sm font-medium ${feedback.correct ? "text-emerald-400" : "text-rose-400"}`}>
                  {feedback.correct ? "Correct" : "Incorrect"} — {feedback.score}/100
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feedback.reasoning}
                </p>
              </div>
            </div>

            {/* Reference key points for open questions */}
            {feedback.referenceKeyPoints && feedback.referenceKeyPoints.length > 0 && (
              <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" />
                  Key points
                </p>
                <ul className="space-y-1">
                  {feedback.referenceKeyPoints.map((kp, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-kal-light mt-0.5">·</span>
                      {kp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button variant="kal" className="w-full" onClick={onNext}>
              <ChevronRight className="h-4 w-4" />
              {feedback.isComplete ? "See Results" : "Next Question"}
            </Button>
          </div>
        ) : (
          // ── Input mode ─────────────────────────────────────────────────────
          <div className="space-y-4">
            {isMCQ && question.options ? (
              <div className="space-y-2">
                {question.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(opt)}
                    disabled={isSubmitting}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
                      selected === opt
                        ? "border-kal bg-kal/10 text-foreground"
                        : "border-border hover:border-kal/40 hover:bg-secondary"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here…"
                rows={4}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-kal placeholder:text-muted-foreground disabled:opacity-50"
              />
            )}

            <Button
              variant="kal"
              className="w-full"
              disabled={isSubmitting || (isMCQ ? !selected : !answer.trim())}
              onClick={handleSubmit}
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Grading…" : "Submit Answer"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
