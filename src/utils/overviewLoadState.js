// A completed request from another space/refresh must never expose stale content.
export function overviewLoadState({ scope, loadedScope, pending, failed }) {
  if (scope !== loadedScope || pending) return 'loading'
  return failed ? 'error' : 'ready'
}
