import { CoursesView } from "@/components/CoursesView";

export default function CoursesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 animate-fade-up">
        <p className="tape mb-2 uppercase tracking-[0.2em] text-kal-light">The Library</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          Browse courses. <span className="text-kal text-glow">Prove what you know.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Pick a subject, study the material, then pass an AI-adaptive test to mint a Soulbound credential
          and earn KAL. Free courses are open to all; paid ones cost KAL; the Unlocked tier opens with the right SBT.
        </p>
      </header>
      <CoursesView />
    </div>
  );
}
