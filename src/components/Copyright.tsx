export function Copyright({ className = "" }: { className?: string }) {
  const year = new Date().getFullYear();
  return (
    <p className={`text-xs text-muted-foreground/70 ${className}`}>
      Built and designed by thejomilojudavid © {year}
    </p>
  );
}
