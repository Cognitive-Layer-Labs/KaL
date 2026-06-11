import Link from "next/link";
import Image from "next/image";
import { CircleUserRound } from "lucide-react";
import { WalletButton } from "./WalletButton";

export function NavBar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/70 glass">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-7">
          <Link href="/" className="group flex items-center gap-2.5">
            <Image
              src="/kal-logo.png"
              alt="KaL"
              width={34}
              height={34}
              className="drop-shadow-[0_0_10px_rgba(249,38,114,0.6)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            />
            <span className="font-display text-xl font-extrabold tracking-tight text-kal text-glow">
              KaL
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/courses" className="hover:text-foreground transition-colors">
              Courses
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/account"
            aria-label="Account"
            title="Account"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-kal/50 hover:text-kal-light"
          >
            <CircleUserRound className="h-5 w-5" />
          </Link>
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
