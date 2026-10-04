import { getToday } from './transactionUtils.js'

const currencyAliases = [
  { code: 'USD', pattern: /(?:USD|US\$|美元|美金)/i },
  { code: 'CAD', pattern: /(?:CAD|C\$|加元|加币)/i },
  { code: 'CNY', pattern: /(?:CNY|RMB|人民币|元|块钱|块|¥|￥)/i },
  { code: 'EUR', pattern: /(?:EUR|欧元|€)/i },
  { code: 'GBP', pattern: /(?:GBP|英镑|£)/i },
  { code: 'JPY', pattern: /(?:JPY|日元|円)/i },
  { code: 'HKD', pattern: /(?:HKD|港元|港币|HK\$)/i },
  { code: 'AUD', pattern: /(?:AUD|澳元|澳币|A\$)/i },
  { code: 'SGD', pattern: /(?:SGD|新加坡元|新币|S\$)/i },
  { code: 'KRW', pattern: /(?:KRW|韩元|₩)/i },
]

const categoryRules = [
  ['Income', /salary|paycheck|income|refund|bonus|工资|薪水|收入|退款|奖金|收款/i],
  ['Groceries', /grocery|groceries|supermarket|costco|whole foods|walmart|买菜|超市|菜市场|盒马|山姆/i],
  ['Food', /food|lunch|dinner|breakfast|coffee|restaurant|meal|burger king|mcdonald'?s|starbucks|kfc|午饭|午餐|晚饭|晚餐|早餐|咖啡|餐厅|吃饭|外卖|汉堡王|麦当劳|肯德基|星巴克|瑞幸|喜茶|奶茶/i],
  ['Housing', /rent|mortgage|utility|utilities|hydro|房租|房贷|水费|电费|燃气/i],
  ['Transportation', /uber|taxi|bus|train|metro|subway|gas|fuel|parking|打车|出租车|公交|地铁|火车|加油|停车/i],
  ['Shopping', /shopping|amazon|clothes|clothing|买东西|购物|淘宝|京东|衣服/i],
  ['Entertainment', /movie|cinema|game|concert|netflix|电影|游戏|演出|娱乐/i],
  ['Health', /doctor|dentist|medicine|pharmacy|hospital|condom|contraception|医生|牙医|药|医院|健康|避孕|安全套|避孕套/i],
  ['Education', /school|tuition|course|book|学校|学费|课程|书/i],
]

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`)
  date.setDate(date.getDate() + days)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function validMonthDay(month, day) {
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  return monthNumber >= 1 && monthNumber <= 12 && dayNumber >= 1 && dayNumber <= 31
}

function hasExplicitDate(text) {
  if (/大前天|前天|昨天|今天|明天|tomorrow|today|yesterday|day\s+before\s+yesterday/i.test(text)) return true
  const full = text.match(/\b20\d{2}[./-](\d{1,2})[./-](\d{1,2})\b/)
  if (full && validMonthDay(full[1], full[2])) return true
  const short = text.match(/(?:\b|^)(\d{1,2})[./-](\d{1,2})(?:\b|$)|(?:\b|^)(\d{1,2})月(\d{1,2})日?(?:\b|$)/)
  return Boolean(short && validMonthDay(short[1] || short[3], short[2] || short[4]))
}

function parseDate(text, today) {
  if (/大前天/i.test(text)) return addDays(today, -3)
  if (/\b(?:the\s+)?day\s+before\s+yesterday\b/i.test(text) || /前天/i.test(text)) return addDays(today, -2)
  if (/\b(yesterday)\b|昨天/i.test(text)) return addDays(today, -1)
  if (/\b(tomorrow)\b|明天/i.test(text)) return addDays(today, 1)
  if (/\b(today)\b|今天/i.test(text)) return today

  const fullDate = text.match(/\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/)
  if (fullDate && validMonthDay(fullDate[2], fullDate[3])) return `${fullDate[1]}-${fullDate[2].padStart(2, '0')}-${fullDate[3].padStart(2, '0')}`

  const shortDate = text.match(/(?:\b|^)(\d{1,2})[./-](\d{1,2})(?:\b|$)|(?:\b|^)(\d{1,2})月(\d{1,2})日?(?:\b|$)/)
  if (shortDate && validMonthDay(shortDate[1] || shortDate[3], shortDate[2] || shortDate[4])) {
    const year = today.slice(0, 4)
    const month = shortDate[1] || shortDate[3]
    const day = shortDate[2] || shortDate[4]
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return today
}

function parseAmount(text) {
  const candidates = [...text.matchAll(/(?:[$€£¥￥]\s*)?(\d+(?:[.,]\d{1,2})?)(?:\s*(?:USD|CAD|CNY|RMB|EUR|GBP|JPY|HKD|AUD|SGD|KRW|元|块钱|块|美元|美金|加元|加币|欧元|英镑|日元|港元|港币|澳元|澳币|新加坡元|新币|韩元))?/gi)]
  const match = candidates.find((candidate) => {
    const value = candidate[1]
    const index = candidate.index || 0
    const around = text.slice(Math.max(0, index - 1), index + candidate[0].length + 1)
    const touchesDateSeparator = /[\/-]/.test(around) && !/[$€£¥￥]|USD|CAD|CNY|RMB|EUR|GBP|JPY|HKD|AUD|SGD|KRW|元|块钱/i.test(candidate[0])
    return !touchesDateSeparator && !(value.length === 4 && /^20\d{2}$/.test(value))
  })
  if (!match) return null
  const amount = Number(match[1].replace(',', '.'))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

function cleanDescription(text) {
  return text
    .replace(/\b(?:the\s+)?day\s+before\s+yesterday\b/gi, ' ')
    .replace(/\b(?:add|record|spent|spend|paid|pay|bought|received|earned|income|expense|today|yesterday|tomorrow|on)\b/gi, ' ')
    .replace(/(?:添加|记录|记一笔|花了|花费|支付|付款|买了|收到|收入|支出|消费|大前天|前天|今天|昨天|明天)/g, ' ')
    .replace(/(?:[$€£¥￥]\s*)?\d+(?:[.,]\d{1,2})?\s*(?:USD|CAD|CNY|RMB|EUR|GBP|JPY|HKD|AUD|SGD|KRW|元|块钱|块|美元|美金|加元|加币|欧元|英镑|日元|港元|港币|澳元|澳币|新加坡元|新币|韩元)?/gi, ' ')
    .replace(/\b20\d{2}[./-]\d{1,2}[./-]\d{1,2}\b/g, ' ')
    .replace(/(?:\b|^)\d{1,2}[./-]\d{1,2}(?:\b|$)|(?:\b|^)\d{1,2}月\d{1,2}日?(?:\b|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,，。:：\s]+|[,，。:：\s]+$/g, '')
    .trim()
}

export function parseQuickTransaction(text, { fallbackCurrency = 'USD', today = getToday() } = {}) {
  const normalized = text.trim()
  if (!normalized) return { ok: false, reason: 'empty' }

  const amount = parseAmount(normalized)
  if (!amount) return { ok: false, reason: 'amount' }

  const income = /\b(income|salary|paycheck|earned|received|refund|bonus)\b|收入|工资|薪水|收到|退款|奖金|进账/i.test(normalized)
  const type = income ? 'income' : 'expense'
  const detectedCurrency = currencyAliases.find((item) => item.pattern.test(normalized))?.code
  const currency = detectedCurrency || fallbackCurrency
  const matchedCategory = categoryRules.find(([, pattern]) => pattern.test(normalized))?.[0]
  const category = type === 'income' ? 'Income' : (matchedCategory && matchedCategory !== 'Income' ? matchedCategory : 'Other')
  const description = cleanDescription(normalized) || (type === 'income' ? 'Income' : '')

  return {
    ok: true,
    amount: String(amount),
    currency,
    type,
    category,
    description,
    date: parseDate(normalized, today),
    explicitCurrency: Boolean(detectedCurrency),
    explicitDate: hasExplicitDate(normalized),
    confidence: matchedCategory ? 0.9 : 0.72,
    needsReview: !matchedCategory,
  }
}
