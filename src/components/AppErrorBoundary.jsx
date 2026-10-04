import React from 'react'

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, details) {
    console.error('Splitlie UI error:', error, details)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="fatal-error-page">
        <div className="fatal-error-card">
          <span className="auth-brand-mark">S</span>
          <p className="eyebrow">Splitlie</p>
          <h1>Something went wrong.</h1>
          <p>出现了一些问题。你的数据没有被删除，请刷新页面重试。</p>
          <button className="primary" type="button" onClick={() => window.location.reload()}>Reload · 重新加载</button>
        </div>
      </main>
    )
  }
}

