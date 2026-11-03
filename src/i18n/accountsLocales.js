export const accountsLocales = {
  en: {
    moneyWallet: 'Account cards — select a card or use the arrow keys', moneySelectNamed: 'Select {name}, balance {amount}', moneyPrevious: 'Previous account', moneyNext: 'Next account', moneyRateMissing: 'This account’s exchange rate is unavailable. Its native balance is preserved.',
    moneyTitle: 'My Money', moneyIntro: 'Account balances, separate from your spending plan. Only linked transactions update these balances.',
    moneyAdd: 'Add account', moneyEdit: 'Edit account', moneyName: 'Account name', moneyType: 'Account type', moneyBalance: 'Current balance', moneyOwed: 'Amount owed',
    moneyInstitution: 'Institution (optional)', moneyNote: 'Note (optional)', moneyInclude: 'Include in My Money totals', moneyConfirm: 'Confirm this balance is current',
    moneyDebtHelp: 'Enter your outstanding credit-card debt, not your credit limit. Negative balances are not supported yet.', moneyManualHelp: 'Enter a non-negative balance you have checked. This is a manual snapshot, not a bank connection.',
    moneyAssets: 'Total recorded assets', moneyDebt: 'Credit-card debt', moneyNet: 'Net account balance', moneyPartial: 'Known subtotal: {amount} · incomplete',
    moneyIncomplete: 'Some accounts or exchange rates could not be verified. Affected totals are unavailable, not zero.', moneyEstimated: 'Estimated in {currency}, using the dated rates shown with each account. Only included accounts count.',
    moneyRecorded: 'In {currency}. Only included accounts count; this is not a verified picture of all your finances.',
    moneyEmpty: 'Add the accounts where you keep your money, and any credit-card debt. No account balances recorded yet.',
    moneyInvalid: 'Check the account name, currency and non-negative balance. Use no more than four decimal places.', moneySaveError: 'Could not save the account. Your draft is still here. Check your connection and try again.',
    moneyLoadError: 'Your accounts could not be loaded. No balances are shown until the read succeeds.', moneyConflict: 'This account changed elsewhere. Reload the latest version before editing again; reloading discards this draft.',
    moneyReload: 'Reload latest version', moneySaved: 'Account saved', moneyArchived: 'Account archived', moneyRestored: 'Account restored', moneyArchive: 'Archive', moneyRestore: 'Restore',
    moneyShowArchive: 'Show archived accounts ({count})', moneyHideArchive: 'Hide archived accounts ({count})', moneyExcluded: 'Excluded from totals', moneyConfirmed: 'Manually confirmed {date}', moneyEstimate: 'Estimated {amount}', moneyEditNamed: 'Edit {name}',
    moneyType_checking: 'Checking', moneyType_savings: 'Savings', moneyType_cash: 'Cash', moneyType_credit_card: 'Credit card', moneyType_campus_card: 'Campus card', moneyType_digital_wallet: 'Digital wallet', moneyType_other: 'Other',
  },
  zh: {
    moneyWallet: '账户卡片，可点击卡片或使用左右方向键切换', moneySelectNamed: '选择 {name}，余额 {amount}', moneyPrevious: '上一个账户', moneyNext: '下一个账户', moneyRateMissing: '此账户汇率暂不可用，原币余额仍然保留。',
    moneyTitle: '我的资金', moneyIntro: '账户余额与支出计划分开计算。只有关联账户的交易才会更新余额。',
    moneyAdd: '添加账户', moneyEdit: '编辑账户', moneyName: '账户名称', moneyType: '账户类型', moneyBalance: '当前余额', moneyOwed: '待还金额',
    moneyInstitution: '机构（选填）', moneyNote: '备注（选填）', moneyInclude: '计入我的资金汇总', moneyConfirm: '确认此余额为当前余额',
    moneyDebtHelp: '填写信用卡尚未偿还的欠款，不是信用额度。暂不支持负数余额。', moneyManualHelp: '填写已核对的非负余额。这是手动记录，不是银行连接。',
    moneyAssets: '总资产（已记录）', moneyDebt: '信用卡欠款', moneyNet: '账户净余额', moneyPartial: '已知小计：{amount} · 不完整',
    moneyIncomplete: '部分账户或汇率无法核实。受影响的汇总暂不可用，不代表为零。', moneyEstimated: '按账户详情中标注日期的汇率估算为 {currency}，仅统计已勾选的账户。',
    moneyRecorded: '以 {currency} 显示，仅统计已勾选的账户；不代表完整且已核实的财务状况。',
    moneyEmpty: '添加存放资金的账户及信用卡欠款。目前尚未记录账户余额。',
    moneyInvalid: '请检查账户名称、币种和非负余额，小数最多四位。', moneySaveError: '账户保存失败，草稿已保留。请检查网络后重试。',
    moneyLoadError: '账户加载失败。读取成功前不会显示余额。', moneyConflict: '此账户已在其他地方被修改。请重新加载后再编辑；重新加载将放弃当前草稿。',
    moneyReload: '加载最新版本', moneySaved: '账户已保存', moneyArchived: '账户已归档', moneyRestored: '账户已恢复', moneyArchive: '归档', moneyRestore: '恢复',
    moneyShowArchive: '显示已归档账户（{count}）', moneyHideArchive: '收起已归档账户（{count}）', moneyExcluded: '不计入汇总', moneyConfirmed: '手动确认于 {date}', moneyEstimate: '估算为 {amount}', moneyEditNamed: '编辑 {name}',
    moneyType_checking: '活期账户', moneyType_savings: '储蓄账户', moneyType_cash: '现金', moneyType_credit_card: '信用卡', moneyType_campus_card: '校园卡', moneyType_digital_wallet: '电子钱包', moneyType_other: '其他',
  },
  ja: {
    moneyWallet: '口座カード。カードを選択するか矢印キーで切り替え', moneySelectNamed: '{name} を選択、残高 {amount}', moneyPrevious: '前の口座', moneyNext: '次の口座', moneyRateMissing: 'この口座の為替レートは利用できません。元の通貨の残高は保持されます。',
    moneyTitle: '保有資金', moneyIntro: '口座残高は支出計画とは別に計算されます。連携した取引のみが残高を更新します。',
    moneyAdd: '口座を追加', moneyEdit: '口座を編集', moneyName: '口座名', moneyType: '口座の種類', moneyBalance: '現在の残高', moneyOwed: '未返済額',
    moneyInstitution: '金融機関（任意）', moneyNote: 'メモ（任意）', moneyInclude: '保有資金の合計に含める', moneyConfirm: 'この残高が現在の金額であることを確認',
    moneyDebtHelp: '利用限度額ではなく、クレジットカードの未返済額を入力してください。負の残高にはまだ対応していません。', moneyManualHelp: '確認済みの非負の残高を入力してください。手動の記録であり、銀行との連携ではありません。',
    moneyAssets: '記録済み資産合計', moneyDebt: 'カード未返済額', moneyNet: '口座の純残高', moneyPartial: '確認できた小計：{amount} · 一部のみ',
    moneyIncomplete: '一部の口座または為替レートを確認できませんでした。該当する合計はゼロではなく、表示できません。', moneyEstimated: '口座詳細の日付付きレートで {currency} に換算した推定額です。対象の口座のみを含みます。',
    moneyRecorded: '{currency} で表示。対象の口座のみを含み、財務状況全体の確認済みデータではありません。',
    moneyEmpty: '資金を保有する口座とカード未返済額を追加してください。口座残高はまだ記録されていません。',
    moneyInvalid: '口座名、通貨、非負の残高を確認してください。小数は4桁までです。', moneySaveError: '保存できませんでした。下書きは保持されています。接続を確認して再試行してください。',
    moneyLoadError: '口座を読み込めませんでした。読み込みが成功するまで残高は表示されません。', moneyConflict: 'この口座は別の場所で変更されました。再読み込みしてから編集してください。現在の下書きは破棄されます。',
    moneyReload: '最新版を読み込む', moneySaved: '口座を保存しました', moneyArchived: '口座をアーカイブしました', moneyRestored: '口座を復元しました', moneyArchive: 'アーカイブ', moneyRestore: '復元',
    moneyShowArchive: 'アーカイブ済み口座を表示（{count}）', moneyHideArchive: 'アーカイブ済み口座を閉じる（{count}）', moneyExcluded: '合計の対象外', moneyConfirmed: '手動確認：{date}', moneyEstimate: '推定 {amount}', moneyEditNamed: '{name} を編集',
    moneyType_checking: '当座口座', moneyType_savings: '貯蓄口座', moneyType_cash: '現金', moneyType_credit_card: 'クレジットカード', moneyType_campus_card: '学生カード', moneyType_digital_wallet: '電子ウォレット', moneyType_other: 'その他',
  },
  ko: {
    moneyWallet: '계좌 카드. 카드를 선택하거나 방향키로 전환', moneySelectNamed: '{name} 선택, 잔액 {amount}', moneyPrevious: '이전 계좌', moneyNext: '다음 계좌', moneyRateMissing: '이 계좌의 환율을 사용할 수 없습니다. 원래 통화 잔액은 유지됩니다.',
    moneyTitle: '내 자금', moneyIntro: '계좌 잔액은 지출 계획과 별도로 계산됩니다. 연결된 거래만 잔액을 업데이트합니다.',
    moneyAdd: '계좌 추가', moneyEdit: '계좌 수정', moneyName: '계좌 이름', moneyType: '계좌 유형', moneyBalance: '현재 잔액', moneyOwed: '미상환 금액',
    moneyInstitution: '기관 (선택)', moneyNote: '메모 (선택)', moneyInclude: '내 자금 합계에 포함', moneyConfirm: '이 잔액이 현재 금액임을 확인',
    moneyDebtHelp: '신용 한도가 아닌 카드 미상환 금액을 입력하세요. 음수 잔액은 아직 지원하지 않습니다.', moneyManualHelp: '확인한 0 이상의 잔액을 입력하세요. 은행 연결이 아닌 수동 기록입니다.',
    moneyAssets: '기록된 총자산', moneyDebt: '신용카드 부채', moneyNet: '계좌 순잔액', moneyPartial: '확인된 소계: {amount} · 일부만 포함',
    moneyIncomplete: '일부 계좌 또는 환율을 확인할 수 없습니다. 해당 합계는 0이 아닌 확인 불가 상태입니다.', moneyEstimated: '계좌 상세에 표시된 날짜의 환율로 {currency} 기준 추정. 포함하도록 선택한 계좌만 계산합니다.',
    moneyRecorded: '{currency} 기준. 선택한 계좌만 포함하며 전체 재무 상황을 검증한 정보가 아닙니다.',
    moneyEmpty: '자금을 보유한 계좌와 카드 부채를 추가하세요. 아직 기록된 계좌 잔액이 없습니다.',
    moneyInvalid: '계좌 이름, 통화, 0 이상의 잔액을 확인하세요. 소수점은 최대 네 자리입니다.', moneySaveError: '저장하지 못했습니다. 초안은 유지됩니다. 연결을 확인하고 다시 시도하세요.',
    moneyLoadError: '계좌를 불러오지 못했습니다. 불러오기가 성공할 때까지 잔액은 표시되지 않습니다.', moneyConflict: '이 계좌가 다른 곳에서 변경되었습니다. 다시 불러온 뒤 수정하세요. 현재 초안은 삭제됩니다.',
    moneyReload: '최신 버전 불러오기', moneySaved: '계좌 저장됨', moneyArchived: '계좌 보관됨', moneyRestored: '계좌 복원됨', moneyArchive: '보관', moneyRestore: '복원',
    moneyShowArchive: '보관된 계좌 표시 ({count})', moneyHideArchive: '보관된 계좌 숨기기 ({count})', moneyExcluded: '합계에서 제외됨', moneyConfirmed: '수동 확인: {date}', moneyEstimate: '추정 {amount}', moneyEditNamed: '{name} 수정',
    moneyType_checking: '입출금 계좌', moneyType_savings: '저축 계좌', moneyType_cash: '현금', moneyType_credit_card: '신용카드', moneyType_campus_card: '학생 카드', moneyType_digital_wallet: '전자 지갑', moneyType_other: '기타',
  },
  es: {
    moneyWallet: 'Tarjetas de cuentas: selecciona una o usa las flechas', moneySelectNamed: 'Seleccionar {name}, saldo {amount}', moneyPrevious: 'Cuenta anterior', moneyNext: 'Cuenta siguiente', moneyRateMissing: 'El tipo de cambio de esta cuenta no está disponible. Se conserva el saldo original.',
    moneyTitle: 'Mi dinero', moneyIntro: 'Saldos separados de tu plan de gastos. Solo las transacciones vinculadas actualizan los saldos.',
    moneyAdd: 'Añadir cuenta', moneyEdit: 'Editar cuenta', moneyName: 'Nombre de la cuenta', moneyType: 'Tipo de cuenta', moneyBalance: 'Saldo actual', moneyOwed: 'Importe adeudado',
    moneyInstitution: 'Entidad (opcional)', moneyNote: 'Nota (opcional)', moneyInclude: 'Incluir en los totales de Mi dinero', moneyConfirm: 'Confirmar que este saldo es actual',
    moneyDebtHelp: 'Introduce la deuda pendiente de la tarjeta, no su límite de crédito. Aún no se admiten saldos negativos.', moneyManualHelp: 'Introduce un saldo no negativo que hayas comprobado. Es un registro manual, no una conexión bancaria.',
    moneyAssets: 'Total de activos registrados', moneyDebt: 'Deuda de tarjetas', moneyNet: 'Saldo neto de cuentas', moneyPartial: 'Subtotal conocido: {amount} · incompleto',
    moneyIncomplete: 'No se pudieron verificar algunas cuentas o tipos de cambio. Los totales afectados no están disponibles; no son cero.', moneyEstimated: 'Estimación en {currency} con los tipos y fechas indicados en cada cuenta. Solo incluye las cuentas seleccionadas.',
    moneyRecorded: 'En {currency}. Solo incluye las cuentas seleccionadas; no es una visión verificada de todas tus finanzas.',
    moneyEmpty: 'Añade las cuentas donde guardas tu dinero y las deudas de tarjetas. Aún no hay saldos registrados.',
    moneyInvalid: 'Comprueba el nombre, la moneda y el saldo no negativo. Usa un máximo de cuatro decimales.', moneySaveError: 'No se pudo guardar. Tu borrador sigue aquí. Comprueba tu conexión e inténtalo de nuevo.',
    moneyLoadError: 'No se pudieron cargar las cuentas. No se muestran saldos hasta que la lectura se complete.', moneyConflict: 'Esta cuenta cambió en otro lugar. Recarga la versión actual antes de editar; se descartará este borrador.',
    moneyReload: 'Recargar versión actual', moneySaved: 'Cuenta guardada', moneyArchived: 'Cuenta archivada', moneyRestored: 'Cuenta restaurada', moneyArchive: 'Archivar', moneyRestore: 'Restaurar',
    moneyShowArchive: 'Mostrar cuentas archivadas ({count})', moneyHideArchive: 'Ocultar cuentas archivadas ({count})', moneyExcluded: 'Excluida de los totales', moneyConfirmed: 'Confirmado manualmente el {date}', moneyEstimate: 'Estimación: {amount}', moneyEditNamed: 'Editar {name}',
    moneyType_checking: 'Cuenta corriente', moneyType_savings: 'Ahorro', moneyType_cash: 'Efectivo', moneyType_credit_card: 'Tarjeta de crédito', moneyType_campus_card: 'Tarjeta del campus', moneyType_digital_wallet: 'Monedero digital', moneyType_other: 'Otra',
  },
}

const linkCopy = {
  en: ['Linked account (optional)', 'No linked account', 'Records the transaction without changing account balances. Safe to Spend still follows your spending plan.', 'Deducts from this account when saved.', 'Adds to this account when saved.', 'Updates the account only when marked paid.', 'Expenses increase credit-card debt; income reduces it.', 'Account movement: {amount}', 'Account or exchange rate unavailable. Choose no linked account or try again.', 'Insufficient balance or debt. Update the account balance or choose no linked account.', 'Restore the archived account or unlink the transaction before changing its amount.', 'This transaction changed elsewhere. Reopen it before editing.', 'Could not save. Your draft is still here; try again.', 'Balance updated {date}', 'Unlink transactions before changing account currency or type.'],
  zh: ['关联账户（选填）', '不关联账户', '仅记录交易，不改变账户余额。Safe to Spend 仍按支出计划计算。', '保存后从此账户扣款。', '保存后增加此账户余额。', '标记为已支付时才更新账户余额。', '支出增加信用卡欠款，收入减少欠款。', '账户变动金额：{amount}', '账户或汇率暂不可用，请选择不关联账户或重试。', '账户余额或欠款不足，请更新账户余额或选择不关联账户。', '请恢复已归档账户或取消关联，再修改交易金额。', '此交易已在其他地方修改，请重新打开后编辑。', '未能保存，草稿仍保留，请重试。', '余额更新于 {date}', '请先取消交易关联，再修改账户货币或类型。'],
  ja: ['連携口座（任意）', '口座を連携しない', '取引のみ記録し、口座残高は変更しません。Safe to Spend は支出計画に従います。', '保存時にこの口座から差し引きます。', '保存時にこの口座へ入金します。', '支払い済みにした時点で残高を更新します。', '支出はカード債務を増やし、収入は減らします。', '口座の変動額：{amount}', '口座または為替レートを取得できません。連携を解除するか再試行してください。', '残高または債務が不足しています。残高を更新するか連携を解除してください。', '金額を変更する前に口座を復元するか連携を解除してください。', '取引が別の場所で変更されました。再度開いてください。', '保存できませんでした。下書きは保持されています。再試行してください。', '残高更新：{date}', '通貨や種類を変更する前に取引の連携を解除してください。'],
  ko: ['연결 계좌 (선택)', '계좌 연결 안 함', '거래만 기록하고 계좌 잔액은 변경하지 않습니다. Safe to Spend는 지출 계획을 따릅니다.', '저장 시 이 계좌에서 차감합니다.', '저장 시 이 계좌에 입금합니다.', '결제 완료로 표시할 때만 잔액을 업데이트합니다.', '지출은 카드 부채를 늘리고 수입은 줄입니다.', '계좌 변동 금액: {amount}', '계좌 또는 환율을 사용할 수 없습니다. 연결을 해제하거나 다시 시도하세요.', '잔액 또는 부채가 부족합니다. 잔액을 업데이트하거나 연결을 해제하세요.', '금액 변경 전에 보관된 계좌를 복원하거나 연결을 해제하세요.', '다른 곳에서 거래가 변경되었습니다. 다시 열어 수정하세요.', '저장하지 못했습니다. 초안은 보관되어 있습니다. 다시 시도하세요.', '잔액 업데이트: {date}', '통화나 유형 변경 전에 거래 연결을 해제하세요.'],
  es: ['Cuenta vinculada (opcional)', 'Sin cuenta vinculada', 'Registra la transacción sin cambiar saldos. Safe to Spend sigue el plan de gastos.', 'Descuenta de esta cuenta al guardar.', 'Añade a esta cuenta al guardar.', 'Actualiza el saldo solo al marcar como pagada.', 'Los gastos aumentan la deuda de tarjeta; los ingresos la reducen.', 'Movimiento de cuenta: {amount}', 'Cuenta o cambio no disponible. Desvincula la cuenta o reintenta.', 'Saldo o deuda insuficiente. Actualiza el saldo o desvincula la cuenta.', 'Restaura la cuenta archivada o desvincúlala antes de cambiar el importe.', 'La transacción cambió en otro lugar. Ábrela de nuevo para editar.', 'No se pudo guardar. Tu borrador sigue aquí; reintenta.', 'Saldo actualizado el {date}', 'Desvincula las transacciones antes de cambiar la moneda o el tipo.'],
}
const linkKeys = ['moneyLinkAccount', 'moneyNoAccount', 'moneyNoAccountHelp', 'moneyAccountExpense', 'moneyAccountIncome', 'moneyAccountUpcoming', 'moneyCardMovement', 'moneyAccountMovement', 'moneyAccountUnavailable', 'moneyInsufficient', 'moneyAccountArchivedError', 'moneyTransactionConflict', 'moneyTransactionSaveError', 'moneyConfirmed', 'moneyLinkedIdentity']
for (const [language, values] of Object.entries(linkCopy)) Object.assign(accountsLocales[language], Object.fromEntries(linkKeys.map((key, index) => [key, values[index]])))

const deleteKeys = ['moneyDelete', 'moneyDeleteQuestion', 'moneyDeleteCopy', 'moneyDeleted', 'moneyDeleteLinked', 'moneyDeleteError']
const deleteCopy = {
  en: ['Delete account', 'Delete this account?', '“{name}” and its balance will be permanently removed from My Money. This cannot be undone. Accounts with linked transactions cannot be deleted; archive them instead.', 'Account deleted', 'This account has linked transactions and cannot be deleted. Archive it to preserve the transaction history.', 'Could not delete this account. Nothing was removed. Please try again.'],
  zh: ['删除账户', '删除此账户？', '“{name}”及其余额将从我的资金中永久移除，无法撤销。有关联交易的账户不能删除，请使用归档。', '账户已删除', '此账户有关联交易，无法删除。可以归档账户以保留交易历史。', '账户删除失败，未移除任何记录，请重试。'],
  ja: ['口座を削除', 'この口座を削除しますか？', '「{name}」とその残高を保有資金から完全に削除します。この操作は元に戻せません。取引が連携されている口座は削除できません。代わりにアーカイブしてください。', '口座を削除しました', '取引が連携されているため削除できません。取引履歴を保持するにはアーカイブしてください。', '口座を削除できませんでした。記録は削除されていません。再試行してください。'],
  ko: ['계좌 삭제', '이 계좌를 삭제할까요?', '“{name}” 계좌와 잔액이 내 자금에서 영구 삭제되며 되돌릴 수 없습니다. 연결된 거래가 있는 계좌는 삭제할 수 없으므로 보관하세요.', '계좌가 삭제되었습니다', '연결된 거래가 있어 삭제할 수 없습니다. 거래 내역을 유지하려면 계좌를 보관하세요.', '계좌를 삭제하지 못했습니다. 삭제된 기록은 없습니다. 다시 시도하세요.'],
  es: ['Eliminar cuenta', '¿Eliminar esta cuenta?', '“{name}” y su saldo se eliminarán permanentemente de Mis fondos. No se puede deshacer. Las cuentas con transacciones vinculadas no se pueden eliminar; archívalas.', 'Cuenta eliminada', 'Esta cuenta tiene transacciones vinculadas y no se puede eliminar. Archívala para conservar el historial.', 'No se pudo eliminar la cuenta. No se eliminó ningún registro. Inténtalo de nuevo.'],
}
for (const [language, values] of Object.entries(deleteCopy)) Object.assign(accountsLocales[language], Object.fromEntries(deleteKeys.map((key, index) => [key, values[index]])))

const movementHistoryCopy = {
  en: ['Accounts with transaction or transfer history retain their currency and type. Create a new account if needed.', 'This account has transaction or transfer history and cannot be deleted. Archive it to preserve the records.'],
  zh: ['有关联交易或转账历史的账户需要保留原币种和类型。如需更换，请新建账户。', '此账户有关联交易或转账历史，无法删除。可以归档账户以保留记录。'],
  ja: ['取引または振替履歴のある口座は通貨と種類を保持します。必要に応じて新しい口座を作成してください。', '取引または振替履歴があるため削除できません。記録を残すにはアーカイブしてください。'],
  ko: ['거래나 이체 내역이 있는 계좌는 기존 통화와 유형을 유지합니다. 필요하면 새 계좌를 만드세요.', '거래나 이체 내역이 있어 삭제할 수 없습니다. 기록을 유지하려면 계좌를 보관하세요.'],
  es: ['Las cuentas con historial de transacciones o transferencias conservan su moneda y tipo. Crea otra cuenta si lo necesitas.', 'Esta cuenta tiene historial de transacciones o transferencias y no puede eliminarse. Archívala para conservar los registros.'],
}
for (const [language, values] of Object.entries(movementHistoryCopy)) Object.assign(accountsLocales[language], { moneyLinkedIdentity: values[0], moneyDeleteLinked: values[1] })

const transferIntroCopy = {
  en: 'Account balances are separate from your spending plan. Linked transactions and account transfers update these balances.',
  zh: '账户余额与支出计划分开计算。关联交易和账户转账会更新余额。',
  ja: '口座残高と支出計画は別々に計算します。連携取引と口座間振替で残高を更新します。',
  ko: '계좌 잔액과 지출 계획은 별도로 계산합니다. 연결된 거래와 계좌 간 이체가 잔액을 갱신합니다.',
  es: 'Los saldos están separados del plan de gastos. Las transacciones vinculadas y las transferencias actualizan los saldos.',
}
for (const [language, copy] of Object.entries(transferIntroCopy)) accountsLocales[language].moneyIntro = copy
