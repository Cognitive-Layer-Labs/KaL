"use client";

import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
  BookOpen, Brain, Coins, Award, ArrowRight, Network,
  Lock, Sparkles, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/WalletButton";
import { useMounted } from "@/lib/use-mounted";

export default function LandingPage() {
  const { isConnected } = useAccount();
  const connected = useMounted() && isConnected;

  return (
    <div className="overflow-hidden">
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-fade-up">
            <span className="tape inline-flex items-center gap-2 rounded-full border border-kal/30 bg-kal/10 px-3 py-1 text-kal-light">
              <Sparkles className="h-3.5 w-3.5" />
              Knowledge as Liquidity
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              Turn what you know
              <br />
              into <span className="text-kal text-glow">on-chain proof.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              KaL distills any video, PDF or article into a knowledge graph, then quizzes you with an
              AI-adaptive test. Pass it and the oracle mints you{" "}
              <span className="font-mono text-mono-green">KAL tokens</span> plus a non-transferable{" "}
              <span className="font-mono text-mono-purple">Soulbound credential</span>.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {connected ? (
                <Button variant="kal" size="lg" asChild>
                  <Link href="/courses">
                    Enter the Library
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <WalletButton />
                  <span className="tape text-muted-foreground">
                    ← your wallet is your login
                  </span>
                </>
              )}
            </div>
          </div>

          {/* glowing flask */}
          <div className="relative mx-auto hidden lg:block">
            <div className="absolute inset-0 -z-10 mx-auto h-72 w-72 rounded-full bg-kal/25 blur-[90px]" />
            <Image
              src="/kal-logo.png"
              alt="KaL knowledge potion"
              width={360}
              height={360}
              priority
              className="mx-auto animate-float drop-shadow-[0_0_60px_rgba(249,38,114,0.45)]"
            />
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading kicker="The loop" title="Three steps, one credential" />
        <div className="grid gap-5 md:grid-cols-3">
          <StepCard
            n="01"
            icon={BookOpen}
            color="text-mono-cyan"
            title="Learn"
            body="Open a course and study the material in-app — video, PDF or text — alongside its live knowledge graph."
          />
          <StepCard
            n="02"
            icon={Brain}
            color="text-kal-light"
            title="Prove"
            body="Take an adaptive test that targets the graph's key concepts and converges on your true ability with IRT."
          />
          <StepCard
            n="03"
            icon={Award}
            color="text-mono-purple"
            title="Earn"
            body="Pass and the oracle mints KAL to your wallet and issues a Soulbound Token attesting your competence."
          />
        </div>
      </section>

      {/* ─── KAL + SBT explainers ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-5 md:grid-cols-2">
          <ExplainerCard
            icon={Coins}
            iconWrap="bg-mono-green/15 text-mono-green"
            bullet="text-mono-green"
            title="KAL — the reward token"
            points={[
              "ERC-20 minted automatically when you pass a test.",
              "Earn more on harder difficulties and richer subjects.",
              "Spend it to access premium, paid-tier courses.",
            ]}
          />
          <ExplainerCard
            icon={ShieldCheck}
            iconWrap="bg-mono-purple/15 text-mono-purple"
            bullet="text-mono-purple"
            title="SBT — your proof of work"
            points={[
              "A Soulbound (non-transferable) credential bound to your wallet.",
              "Each one attests verified knowledge of a specific subject.",
              "Holding the right SBT unlocks the next-level courses.",
            ]}
          />
        </div>
      </section>

      {/* ─── Tiers ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading kicker="The library" title="Three tiers of courses" />
        <div className="grid gap-5 md:grid-cols-3">
          <TierCard
            icon={Sparkles}
            iconColor="text-mono-green"
            borderHover="hover:border-mono-green/40"
            name="Free"
            body="Open to anyone. Connect, study, and prove your knowledge to start earning KAL right away."
          />
          <TierCard
            icon={Coins}
            iconColor="text-kal-light"
            borderHover="hover:border-kal/40"
            name="Paid"
            body="Premium subjects priced in KAL. Put the tokens you earned back to work on deeper material."
          />
          <TierCard
            icon={Lock}
            iconColor="text-mono-purple"
            borderHover="hover:border-mono-purple/40"
            name="Unlocked"
            body="Next-level courses gated by credentials — earn the prerequisite SBT and the door opens."
          />
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="relative overflow-hidden rounded-3xl border border-kal/30 glass p-12">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-kal/20 blur-3xl" />
          <Network className="mx-auto mb-4 h-9 w-9 text-kal" />
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
            Ready to make it count?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Connect your wallet to browse the library and turn your knowledge into liquidity.
          </p>
          <div className="mt-7 flex justify-center">
            {connected ? (
              <Button variant="kal" size="lg" asChild>
                <Link href="/courses">
                  Enter the Library
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <WalletButton />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── building blocks ──────────────────────────────────────────────────────────

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-8">
      <p className="tape uppercase tracking-[0.2em] text-kal-light">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
    </div>
  );
}

function StepCard({
  n, icon: Icon, color, title, body,
}: { n: string; icon: typeof BookOpen; color: string; title: string; body: string }) {
  return (
    <div className="group relative rounded-2xl border border-border bg-card/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-kal/40">
      <span className="absolute right-5 top-4 font-mono text-3xl font-bold text-border transition-colors group-hover:text-kal/30">
        {n}
      </span>
      <Icon className={`h-8 w-8 ${color}`} />
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function ExplainerCard({
  icon: Icon, iconWrap, bullet, title, points,
}: { icon: typeof Coins; iconWrap: string; bullet: string; title: string; points: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-7">
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconWrap}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <ArrowRight className={`mt-0.5 h-4 w-4 shrink-0 ${bullet}`} />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TierCard({
  icon: Icon, iconColor, borderHover, name, body,
}: { icon: typeof Lock; iconColor: string; borderHover: string; name: string; body: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card/60 p-6 transition-colors ${borderHover}`}>
      <Icon className={`h-7 w-7 ${iconColor}`} />
      <h3 className="mt-3 font-display text-lg font-bold">{name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
