function Block({ className = '' }) {
  return <span className={`overview-skeleton-block ${className}`} />
}

function Card({ hero = false }) {
  return <div className={`overview-skeleton-card ${hero ? 'overview-skeleton-hero' : ''}`}>
    <Block className="skeleton-label" /><Block className="skeleton-value" /><Block className="skeleton-copy" />
  </div>
}

export default function OverviewSkeleton({ label, shared = false }) {
  return <section className="overview-skeleton" role="status" aria-label={label} aria-busy="true">
    <span className="visually-hidden">{label}</span>
    <div aria-hidden="true">
      {!shared && <Card hero />}
      <div className="overview-skeleton-kpis">{[0, 1, 2].map(index => <Card key={index} />)}</div>
      {!shared && <div className="overview-skeleton-notice"><Block className="skeleton-label" /><Block className="skeleton-copy" /></div>}
      <div className="overview-skeleton-wide"><Card /></div>
      <div className="overview-skeleton-grid">{[0, 1, 2, 3].map(index => <Card key={index} />)}</div>
      <div className="overview-skeleton-wide"><Card /></div>
    </div>
  </section>
}
