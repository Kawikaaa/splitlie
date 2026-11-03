import { validateReceipt, moneyUnits } from '../../../supabase/functions/ai-assistant/contract.js'
import { ADJUSTMENTS, adjustmentMode, reconcileReceipt, receiptCanConfirm } from './receiptReconciliation.js'
export function mergeReceiptDetails(current, details) {
  // Optional itemization must never overwrite a total/date/currency the user
  // has already checked in the transaction form.
  return { ...current, items:details.items, tax:details.tax, tip:details.tip, discount:details.discount,
    uncertain:details.uncertain, capture_mode:'details', reviewed:false, exception_confirmed:false }
}
export function receiptPayload(receipt, { amount, currency, date, description }) {
  if (!receipt) return null
  const summary = receipt.capture_mode === 'summary'
  // Optional, unfinished itemization stays in the live draft. It must neither
  // block total-only recording nor leak into its persisted representation.
  const core = { merchant: description.trim() || null, date, currency, total: String(amount),
    items: summary ? [] : receipt.items.map(item => ({ name: item.name.trim(), quantity: item.quantity == null || item.quantity === '' ? null : Number(item.quantity), amount: item.amount })),
    tax: summary ? null : receipt.tax, tip: summary ? null : receipt.tip, discount: summary ? null : receipt.discount,
    uncertain: summary ? (receipt.uncertain || []).filter(field => ['merchant','date','currency','total'].includes(field)) : receipt.uncertain || [] }
  if (!receipt.reviewed || (!summary && !receiptCanConfirm(receipt, amount)) || !validateReceipt(core) || !core.total || !core.date || !core.currency || !/^[a-f0-9]{64}$/.test(receipt.image_hash || '')) throw new Error('RECEIPT_REVIEW_REQUIRED')
  if (summary) return { ...core, items:[],tax:null,tip:null,discount:null,version:1,image_hash:receipt.image_hash,model:String(receipt.model || '').slice(0,80),reviewed:true,capture_mode:'summary',review_mode:'summary',review_reason:null,
    amount_source:receipt.amount_source==='user' || receipt.recognition_status==='manual' || moneyUnits(core.total)!==moneyUnits(String(receipt.total ?? '')) ? 'user' : 'recognition' }
  const balanced = reconcileReceipt(receipt, amount).status === 'balanced'
  return { ...core, version: 1, image_hash: receipt.image_hash, model: String(receipt.model || '').slice(0, 80), reviewed: true,
    review_mode: balanced ? 'reconciled' : 'manual_exception', review_reason: balanced ? null : receipt.review_reason.trim(),
    adjustment_modes: Object.fromEntries(ADJUSTMENTS.map(field => [field, adjustmentMode(receipt, field)])) }
}
