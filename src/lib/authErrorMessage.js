// Map stable Auth codes to recovery-oriented copy; never expose internal errors.
export function getAuthErrorMessage(error, t) {
  const code = error?.code
  if (code === 'invalid_credentials') return t('authInvalidCredentials')
  if (code === 'email_not_confirmed') return t('authEmailNotConfirmed')
  if (code === 'email_exists' || code === 'user_already_exists') return t('authAccountExists')
  if (code === 'weak_password') return t('authWeakPassword')
  if (code === 'same_password') return t('authSamePassword')
  if (code === 'otp_expired' || code === 'flow_state_expired' || code === 'flow_state_not_found') return t('authLinkExpired')
  if (error?.status === 429 || code?.startsWith('over_')) return t('authRateLimited')
  if (code === 'request_timeout' || error?.name === 'AuthRetryableFetchError' || /failed to fetch|network|fetch failed/i.test(error?.message || '')) return t('authNetworkError')
  return t('authTryAgain')
}
