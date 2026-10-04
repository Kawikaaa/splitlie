import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { additionalLocales } from './additionalLocales.js'

const source = readFileSync(new URL('./LanguageContext.jsx', import.meta.url), 'utf8')
const start = source.indexOf('{', source.indexOf('const translations'))
const end = source.indexOf('const LanguageContext')
const { en } = Function(`return ${source.slice(start, end).trim()}`)()
const tokens = message => [...message.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort()

for (const language of ['ja', 'ko', 'es']) {
  test(`${language}: every interface message is translated with matching interpolation tokens`, () => {
    const messages = additionalLocales[language]
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(en).sort())
    for (const [key, original] of Object.entries(en)) {
      assert.ok(messages[key].trim(), `${key} is empty`)
      assert.deepEqual(tokens(messages[key]), tokens(original), `${key} has incompatible placeholders`)
    }
  })
}
