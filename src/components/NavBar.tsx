import Link from "next/link";
import Image from "next/image";
import { WalletButton } from "./WalletButton";

export function NavBar() {
  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Image src="/kal-logo.png" alt="KaL" width={28} height={28} className="rounded-full" />
            <span className="text-[#A29BFE]">KaL</span>
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Catalog</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </div>
        </div>
        <WalletButton />
      </div>
    </nav>
  );
}
