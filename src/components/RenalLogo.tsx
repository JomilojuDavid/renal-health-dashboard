export function RenalLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M3 12h3l2-5 4 10 2-5h7" />
        </svg>
        <span className="absolute inset-0 rounded-lg animate-pulse-ring bg-primary/40" aria-hidden />
      </div>
      <span className="text-base font-semibold tracking-tight">RenalWatch</span>
    </div>
  );
}
