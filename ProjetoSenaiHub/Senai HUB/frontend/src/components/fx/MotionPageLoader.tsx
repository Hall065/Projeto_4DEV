/**
 * Subtle inline Suspense fallback — stays until parent unmounts.
 * Intentionally non-theatrical (no full-screen wipe / giant brand).
 * Real asset waits live in lazy() factories; RouteTransitionLoader is
 * skipped for in-shell sidebar nav.
 */
export function MotionPageLoader({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 px-6 py-10"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-[2px] w-40 overflow-hidden rounded-full bg-hub-navy/10">
        <div className="h-full w-1/2 origin-left animate-pulse bg-hub-red" />
      </div>
      <span className="text-[11px] uppercase tracking-[0.2em] text-hub-navy/45">{label}</span>
    </div>
  )
}
