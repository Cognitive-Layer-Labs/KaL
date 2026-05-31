"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { VerifyQuestion } from "@/lib/api";

interface QuestionCardProps {
  question: VerifyQuestion;
  onSubmit: (answer: string) => void;
  isSubmitting: boolean;
}

export function QuestionCard({ question, onSubmit, isSubmitting }: QuestionCardProps) {
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const progress = ((question.number - 1) / question.totalQuestions) * 100;
  const isMCQ = question.type === "mcq" || question.type === "true_false";

  function handleSubmit() {
    const value = isMCQ ? selected ?? "" : answer;
    if (!value.trim()) return;
    onSubmit(value);
    setAnswer("");
    setSelected(null);
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

        {isMCQ && question.options ? (
          <div className="space-y-2">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelected(opt)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  selected === opt
                    ? "border-[#6C5CE7] bg-[#6C5CE7]/10 text-foreground"
                    : "border-border hover:border-[#6C5CE7]/40 hover:bg-secondary"
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
            className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#6C5CE7] placeholder:text-muted-foreground"
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
      </CardContent>
    </Card>
  );
}
