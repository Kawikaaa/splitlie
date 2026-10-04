export default function AppLoadingShell({ label }) {
  return (
    <div className="loading-shell" role="status" aria-live="polite" aria-label={label}>
      <aside className="loading-shell-rail" aria-hidden="true">
        <span className="loading-shell-brand" />
        <span className="loading-shell-space" />
        <div className="loading-shell-nav">
          <i /><i /><i /><i /><i />
        </div>
      </aside>
      <main className="loading-shell-canvas" aria-hidden="true">
        <div className="loading-shell-heading"><i /><b /></div>
        <div className="loading-shell-hero"><i /><b /><span /></div>
        <div className="loading-shell-grid"><i /><i /><i /></div>
      </main>
      <span className="sr-only">{label}</span>
    </div>
  )
}
