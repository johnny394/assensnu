"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="min-h-14 w-full bg-ink px-5 text-xl font-bold text-paper">
      Print skiltet
    </button>
  );
}
