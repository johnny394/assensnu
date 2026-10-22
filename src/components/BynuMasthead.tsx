import Link from "next/link";
import { BRAND } from "@/lib/site";

// Avishovedet på bynu.dk
export function BynuMasthead() {
  return (
    <>
      <Link href="/" className="block text-center font-display text-[2.6rem] font-black leading-none tracking-tight">{BRAND}</Link>
      <div className="mt-3 h-[7px] border-y border-t-[3px] border-ink" aria-hidden />
      <p className="border-b border-ink py-2 text-center text-sm uppercase tracking-[0.12em]">Lokal mad, by for by</p>
    </>
  );
}
