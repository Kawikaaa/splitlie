import assert from 'node:assert/strict'
import test from 'node:test'
import { getAuthErrorMessage } from './authErrorMessage.js'
const t = key => key
test('authentication errors name the recovery path without leaking server details', () => {
  assert.equal(getAuthErrorMessage({ code: 'invalid_credentials' }, t), 'authInvalidCredentials')
  assert.equal(getAuthErrorMessage({ code: 'email_not_confirmed' }, t), 'authEmailNotConfirmed')
  assert.equal(getAuthErrorMessage({ status: 429 }, t), 'authRateLimited')
  assert.equal(getAuthErrorMessage({ name: 'AuthRetryableFetchError' }, t), 'authNetworkError')
  assert.equal(getAuthErrorMessage({ message: 'internal SQL details' }, t), 'authTryAgain')
})
