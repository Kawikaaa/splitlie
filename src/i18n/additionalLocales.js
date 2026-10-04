// Each row contains the same message in Japanese, Korean and Spanish.
// Interpolation tokens are preserved so names and financial data stay untouched.
const messages = `
budgetYear|年|연도|Año
displayNameLabel|表示名|표시 이름|Nombre para mostrar
saveDisplayName|名前を保存|이름 저장|Guardar nombre
displayNameHelp|プロフィールと共有スペースに表示されます。ログイン用メールは変わりません。|프로필과 공유 공간에 표시됩니다. 로그인 이메일은 변경되지 않습니다.|Se muestra en tu perfil y espacios compartidos. Tu correo de acceso no cambia.
displayNameRequired|1〜50文字の名前を入力してください。|1~50자의 이름을 입력하세요.|Introduce un nombre de entre 1 y 50 caracteres.
displayNameSaved|名前を保存しました。|이름이 저장되었습니다.|Tu nombre se ha guardado.
displayNameSaveError|名前を保存できませんでした。接続を確認して再試行してください。|이름을 저장하지 못했습니다. 연결을 확인하고 다시 시도하세요.|No se pudo guardar tu nombre. Comprueba la conexión e inténtalo de nuevo.
displayNameSyncError|共有スペースの名前は保存されましたが、アカウントとの同期に失敗しました。もう一度名前を保存してください。|공유 공간의 이름은 저장되었지만 계정 동기화에 실패했습니다. 이름 저장을 다시 눌러주세요.|El nombre de tus espacios compartidos se guardó, pero falló la sincronización de la cuenta. Pulsa Guardar nombre de nuevo.
languageSettingsCopy|Splitlie の表示言語を選択します。この端末に保存されます。|Splitlie의 표시 언어를 선택하세요. 이 기기에 저장됩니다.|Elige el idioma de Splitlie. Se guarda en este dispositivo.
profileSettings|プロフィール設定|프로필 설정|Ajustes del perfil
profile|プロフィール|프로필|Perfil
profileCopy|Splitlie のプロフィール写真をアップロードします。|Splitlie 프로필 사진을 업로드하세요.|Sube una foto para tu perfil de Splitlie.
uploadPhoto|写真をアップロード|사진 업로드|Subir foto
cropPhoto|プロフィール写真を切り抜く|프로필 사진 자르기|Recortar foto de perfil
profilePhoto|プロフィール写真|프로필 사진|Foto de perfil
cropTitle|写真の範囲を調整|사진 범위 조정|Ajusta el recorte
cropCopy|ドラッグして位置を調整します。円の内側がプロフィール写真になります。|드래그하여 위치를 조정하세요. 원 안의 영역이 프로필 사진이 됩니다.|Arrastra para ajustar la posición. El área del círculo será tu foto.
cropKeyboard|矢印キーで画像の位置を調整|방향키로 이미지 위치 조정|Usa las flechas para mover la imagen
dragAdjust|ドラッグして調整|드래그하여 조정|Arrastra para ajustar
zoom|拡大|확대|Zoom
saveAvatar|写真を保存|사진 저장|Guardar foto
saved|保存済み|저장됨|Guardado
actions|操作|작업|Acciones
completedWeeksMarked|記録を完了した週をカレンダーに表示しています|기록을 완료한 주가 달력에 표시됩니다|Las semanas completadas aparecen en el calendario
amountPlaceholder|金額を入力|금액 입력|Introduce un importe
skipToContent|メインコンテンツへ|본문으로 건너뛰기|Ir al contenido
retry|再試行|다시 시도|Reintentar
spacesLoadError|スペースを読み込めませんでした。接続を確認して再試行してください。|공간을 불러오지 못했습니다. 연결을 확인하고 다시 시도하세요.|No se pudieron cargar tus espacios. Comprueba la conexión y reintenta.
authInvalidCredentials|メールアドレスかパスワードが正しくありません。入力を確認するか、パスワードを再設定してください。|이메일 또는 비밀번호가 올바르지 않습니다. 입력을 확인하거나 비밀번호를 재설정하세요.|El correo o la contraseña son incorrectos. Revisa los datos o restablece la contraseña.
authEmailNotConfirmed|メールの確認リンクを開いてからログインしてください。|이메일의 확인 링크를 연 후 로그인하세요.|Confirma tu correo mediante el enlace recibido y luego inicia sesión.
authAccountExists|このメールアドレスは登録済みです。ログインするか、パスワードを再設定してください。|이미 등록된 이메일입니다. 로그인하거나 비밀번호를 재설정하세요.|Ya existe una cuenta con este correo. Inicia sesión o restablece la contraseña.
authWeakPassword|6文字以上の推測されにくいパスワードを設定してください。|흔한 비밀번호를 피하고 6자 이상의 강력한 비밀번호를 설정하세요.|Elige una contraseña segura de al menos 6 caracteres. Evita contraseñas comunes.
authSamePassword|現在とは異なるパスワードを設定してください。|현재 비밀번호와 다른 비밀번호를 설정하세요.|Elige una contraseña distinta de la actual.
authLinkExpired|リンクの有効期限が切れました。新しいリンクを取得してください。|링크가 만료되었습니다. 새 링크를 요청하세요.|El enlace ha caducado. Solicita uno nuevo.
authRateLimited|試行回数が多すぎます。数分待ってから再試行してください。|시도 횟수가 너무 많습니다. 몇 분 후 다시 시도하세요.|Demasiados intentos. Espera unos minutos y vuelve a intentarlo.
authNetworkError|接続できませんでした。通信状態を確認して再試行してください。|연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도하세요.|No se pudo conectar. Comprueba tu conexión y reintenta.
authTryAgain|操作を完了できませんでした。再試行してください。|요청을 완료하지 못했습니다. 다시 시도하세요.|No se pudo completar la solicitud. Reintenta.
settlementLimit|最大 {amount} まで記録できます。|최대 {amount}까지 기록할 수 있습니다.|Puedes registrar hasta {amount}.
avatarReadError|画像を開けませんでした。PNG、JPEG、WebP、GIF を選択してください。|이미지를 열지 못했습니다. PNG, JPEG, WebP 또는 GIF를 선택하세요.|No se pudo abrir la imagen. Elige un archivo PNG, JPEG, WebP o GIF.
avatarSizeError|10 MB 未満の画像を選択してください。|10 MB 미만의 이미지를 선택하세요.|Elige una imagen de menos de 10 MB.
examplePreview|表示例|예시 미리보기|Vista ilustrativa
workspace|ワークスペース|작업 공간|Espacio de trabajo
allSpaces|すべてのスペース|모든 공간|Todos los espacios
allSpacesCopy|すべてのスペースをまとめて確認。よく使うものを固定できます。|모든 공간을 한곳에서 확인하고 자주 쓰는 공간을 고정하세요.|Encuentra todos tus espacios y fija los que más usas.
overview|概要|개요|Resumen
transactions|取引|거래 내역|Movimientos
settings|設定|설정|Ajustes
addTransaction|取引を追加|거래 추가|Añadir movimiento
logout|ログアウト|로그아웃|Cerrar sesión
account|アカウント|계정|Cuenta
accountSession|ログイン状態|로그인 세션|Sesión de la cuenta
logoutSettingsCopy|この端末のログイン状態を管理します。|이 기기의 로그인 세션을 관리하세요.|Gestiona la sesión de este dispositivo.
logoutQuestion|Splitlie からログアウトしますか？|Splitlie에서 로그아웃할까요?|¿Cerrar sesión en Splitlie?
logoutConfirmCopy|ログイン画面に戻ります。保存済みの帳簿データは削除されません。|로그인 화면으로 돌아갑니다. 저장된 장부 데이터는 삭제되지 않습니다.|Volverás a la pantalla de acceso. Los datos guardados no se eliminarán.
loggingOut|ログアウト中…|로그아웃 중…|Cerrando sesión…
avatarSaveError|写真はこの端末に保存されましたが、他のメンバーに同期できませんでした。|사진은 이 기기에 저장되었지만 다른 멤버에게 동기화되지 않았습니다.|La foto se guardó en este dispositivo, pero no se pudo sincronizar con los demás miembros.
loading|読み込み中…|불러오는 중…|Cargando…
loadingYourMoney|財務データを読み込み中…|재무 데이터를 불러오는 중…|Cargando tus datos…
personal|個人|개인|Personal
sharedSpace|共有スペース|공유 공간|Espacio compartido
personalSpace|{name} の個人スペース|{name}의 개인 공간|Espacio personal de {name}
createOrJoin|スペースを作成・参加|공간 만들기 또는 참여|Crear o unirse a un espacio
spentThisMonth|今月の支出|이번 달 지출|Gastos de este mes
sharedSpending|今月の共有支出|이번 달 공유 지출|Gastos compartidos del mes
income|収入|수입|Ingresos
net|差引残高|순액|Saldo neto
thisMonth|今月|이번 달|Este mes
spendingHeroCopy|今月これまでに記録した支出です。|이번 달 현재까지 기록한 지출입니다.|Tus gastos registrados hasta ahora este mes.
budgetNotSet|予算未設定|예산 미설정|Sin presupuesto
setYourBudget|予算を設定|예산 설정하기|Define tu presupuesto
setBudgetUnlockCopy|今月の安心して使える金額を確認できます。|이번 달 사용 가능한 금액을 확인하세요.|Activa el importe disponible para gastar de este mes.
setBudgetAction|予算を設定|예산 설정|Definir presupuesto
incomeMinusExpenses|収入から支出を差し引いた金額|수입에서 지출을 뺀 금액|Ingresos menos gastos
latest|最新|최근|Reciente
recentTransactions|最近の取引|최근 거래|Movimientos recientes
loadingTransactions|取引を読み込み中…|거래를 불러오는 중…|Cargando movimientos…
noTransactions|取引はまだありません。|아직 거래가 없습니다.|Aún no hay movimientos.
addFirst|最初の支出または収入を追加してください。|첫 지출 또는 수입을 추가하세요.|Añade tu primer gasto o ingreso.
allActivity|{space} のすべての取引。|{space}의 모든 활동입니다.|Toda la actividad de {space}.
sharedActivity|{space} の共有取引。|{space}의 공유 활동입니다.|Actividad compartida de {space}.
searchTransactions|取引を検索|거래 검색|Buscar movimientos
transactionFilters|取引の絞り込み|거래 필터|Filtros de movimientos
filterMonth|月で絞り込み|월별 필터|Filtrar por mes
filterCategory|カテゴリで絞り込み|카테고리별 필터|Filtrar por categoría
allMonths|すべての月|모든 월|Todos los meses
allCategories|すべてのカテゴリ|모든 카테고리|Todas las categorías
clear|クリア|초기화|Limpiar
settingsFor|{space} の設定。|{space}의 설정입니다.|Ajustes de {space}.
manageSpace|{space} とメンバーを管理します。|{space} 및 멤버를 관리하세요.|Gestiona {space} y sus miembros.
personalSpaceLabel|個人スペース|개인 공간|Espacio personal
spaceType|スペースの種類|공간 유형|Tipo de espacio
shared|共有|공유|Compartido
currency|通貨|통화|Moneda
multiCurrency|複数通貨|다중 통화|Varias monedas
currencyOverview|通貨の概要|통화 한눈에 보기|Monedas de un vistazo
currencyOverviewCopy|元の通貨で購入を入力。Splitlie はスペース通貨の換算額を固定して保存します。|구매 당시 통화로 입력하세요. Splitlie가 공간 통화의 환산 금액을 고정해 저장합니다.|Registra las compras en su moneda original. Splitlie guarda un valor fijo en la moneda del espacio.
baseCurrency|基準通貨|기준 통화|Moneda base
baseCurrencyInfo|基準通貨について|기준 통화 안내|Sobre la moneda base
baseCurrencyHelp|予算、安心して使える金額、残高、分担額はこの通貨で計算されます。|예산, 사용 가능 금액, 잔액 및 분담액은 이 통화로 계산됩니다.|Los presupuestos, el disponible para gastar, los saldos y los repartos se calculan en esta moneda.
baseCurrencyRevalueHelp|変更すると、記録済みの換算額、分担、精算、予定額が本日のレートで再評価されます。元の金額は変わりません。|변경하면 기존 환산 금액, 분담, 정산 및 계획이 오늘 환율로 재평가됩니다. 원래 거래 금액은 유지됩니다.|Al cambiarla se recalculan importes, repartos, liquidaciones y planes al tipo de hoy. Los importes originales se conservan.
baseCurrencyOwnerOnly|基準通貨を変更できるのは所有者のみです。|공간 소유자만 기준 통화를 변경할 수 있습니다.|Solo el propietario puede cambiar la moneda base.
saveCurrency|保存|저장|Guardar
changeCurrency|通貨を変更|통화 변경|Cambiar moneda
changingCurrency|変更中…|변경 중…|Cambiando…
changeBaseCurrencyQuestion|基準通貨を {currency} に変更しますか？|기준 통화를 {currency}(으)로 변경할까요?|¿Cambiar la moneda base a {currency}?
changeBaseCurrencyCopy|既存の金額を {from} から {to} に、1 {from} = {rate} {to} で再評価します。元の金額と通貨は保持されます。|기존 금액을 {from}에서 {to}(으)로 1 {from} = {rate} {to} 환율로 재평가합니다. 원래 금액과 통화는 유지됩니다.|Los valores se recalcularán de {from} a {to} con 1 {from} = {rate} {to}. Los importes y monedas originales se conservarán.
baseCurrencyChangeError|基準通貨を変更できませんでした。|기준 통화를 변경하지 못했습니다.|No se pudo cambiar la moneda base.
multiCurrencyReady|外貨取引を記録する準備ができています。|첫 외화 거래를 기록할 준비가 되었습니다.|Todo listo para tu primera operación en otra moneda.
currenciesSupported|対応通貨|지원 통화|monedas compatibles
convertedThisMonth|今月 {count} 件換算|이번 달 {count}건 환산|{count} conversiones este mes
filterCurrency|通貨で絞り込み|통화별 필터|Filtrar por moneda
allCurrencies|すべての通貨|모든 통화|Todas las monedas
personalLedger|個人の帳簿|개인 장부|Registro personal
privateMoney|自分だけの財務|나만의 재무|Tu dinero privado
privateMoneyCopy|このスペースの取引は個人の帳簿にのみ記録され、他のメンバーとは共有されません。|이 공간의 거래는 개인 장부에만 기록되며 다른 멤버에게 공유되지 않습니다.|Los movimientos de este espacio son privados y no se comparten con otros miembros.
language|言語|언어|Idioma
sharedTransaction|共有取引|공유 거래|Movimiento compartido
personalTransaction|個人取引|개인 거래|Movimiento personal
editTransaction|取引を編集|거래 수정|Editar movimiento
expense|支出|지출|Gasto
amount|金額|금액|Importe
description|内容|내용|Descripción
descriptionExample|例：スーパーで買い物|예: 마트 장보기|Ej.: compra en el supermercado
category|カテゴリ|카테고리|Categoría
date|日付|날짜|Fecha
close|閉じる|닫기|Cerrar
cancel|キャンセル|취소|Cancelar
transactionCurrency|取引通貨|거래 통화|Moneda del movimiento
spaceAccountingAmount|スペース通貨（{currency}）で記録|공간 통화({currency})로 기록|Registrado en la moneda del espacio ({currency})
converting|換算中…|환산 중…|Convirtiendo…
ratePreview|レート · 1 {from} = {rate} {to} · {date}|환율 · 1 {from} = {rate} {to} · {date}|Tipo previsto · 1 {from} = {rate} {to} · {date}
lockedRate|固定レート · 1 {from} = {rate} {to} · {date}|고정 환율 · 1 {from} = {rate} {to} · {date}|Tipo fijado · 1 {from} = {rate} {to} · {date}
accountingEquivalent|スペース換算額：{amount}|공간 환산액: {amount}|Valor en el espacio: {amount}
originalAmount|元の金額|원래 금액|Importe original
spaceAmount|スペース換算額|공간 환산액|Importe del espacio
conversionComplete|換算額を固定済み|환산 고정됨|Conversión fijada
conversionPending|換算待ち|환산 대기 중|Conversión pendiente
rateUsed|1 {from} = {rate} {to}|1 {from} = {rate} {to}|1 {from} = {rate} {to}
rateDate|レート日 · {date}|환율 날짜 · {date}|Fecha del tipo · {date}
refreshRate|レートを更新|환율 새로고침|Actualizar tipo
fxUnavailable|レートを取得できません。接続を確認して再試行してください。|환율을 가져오지 못했습니다. 연결을 확인하고 다시 시도하세요.|Tipo de cambio no disponible. Comprueba la conexión y reintenta.
fxRequired|保存する前に有効なレートが必要です。|거래를 저장하려면 유효한 환율이 필요합니다.|Se necesita un tipo válido antes de guardar el movimiento.
sharedFxPending|共有の外貨取引はデータベース更新後に利用できます。個人取引は利用可能です。|공유 외화 거래는 데이터베이스 업그레이드 후 지원됩니다. 개인 거래는 지금 사용할 수 있습니다.|Las operaciones compartidas en otras monedas estarán disponibles tras actualizar la base de datos. Las personales ya funcionan.
saveTransaction|取引を保存|거래 저장|Guardar movimiento
saveChanges|変更を保存|변경 사항 저장|Guardar cambios
saving|保存中…|저장 중…|Guardando…
paid|支払済み|지불 완료|Pagado
upcoming|支払予定|예정|Pendiente
status|状態|상태|Estado
quickAdd|クイック入力|빠른 추가|Entrada rápida
quickAddHelp|金額か短いメモを入力し、候補を選択してください。|금액이나 간단한 메모를 입력하고 제안을 선택하세요.|Escribe un importe o una nota breve y elige una sugerencia.
quickAddPlaceholder|例：12.80 または 昼食 $18|예: 12.80 또는 점심 $18|Ej.: 12.80 o Comida $18
fillDetails|項目に反映|세부 정보 채우기|Completar datos
analyzingTransaction|解析中…|분석 중…|Analizando…
voiceInput|音声入力|음성 입력|Entrada por voz
stopListening|音声入力を停止|음성 입력 중지|Detener escucha
voiceListening|聞き取り中…金額と用途を話してください。|듣는 중…금액과 용도를 말하세요.|Escuchando…di el importe y el concepto.
voiceUnsupported|このブラウザーは音声入力に対応していません。文字で入力できます。|이 브라우저는 음성 입력을 지원하지 않습니다. 직접 입력할 수 있습니다.|Este navegador no admite voz. Puedes escribir la frase.
voiceError|聞き取れませんでした。もう一度話すか、文字で入力してください。|잘 듣지 못했습니다. 다시 말하거나 직접 입력하세요.|No se entendió bien. Reintenta o escribe el texto.
quickAddReady|保存できます。変更する場合は詳細を開いてください。|저장할 준비가 되었습니다. 수정하려면 세부 정보를 여세요.|Listo para guardar. Abre los detalles para hacer cambios.
quickAddReview|一部の項目を確認する必要があります。保存前に確認してください。|일부 정보가 불명확합니다. 저장 전에 강조된 항목을 확인하세요.|Algunos datos son ambiguos. Revísalos antes de guardar.
quickAddAmountMissing|「昼食 $18 今日」のように金額を含めてください。|예: “오늘 점심 $18”처럼 금액을 포함하세요.|Incluye un importe, por ejemplo «Comida $18 hoy».
quickAddEmpty|最初に取引内容を入力または話してください。|먼저 거래를 입력하거나 말하세요.|Primero escribe o dicta un movimiento.
recognizedTransaction|認識した取引|인식된 거래|Movimiento reconocido
editDetails|詳細を編集|세부 정보 수정|Editar detalles
collapseDetails|詳細を閉じる|세부 정보 숨기기|Ocultar detalles
manualEntry|詳細入力|추가 옵션|Más opciones
manualEntryHelp|日付、通貨、状態などを入力します。|날짜, 통화, 상태 등의 세부 정보입니다.|Fecha, moneda, estado y otros datos.
smartDefaults|入力候補|추천 기본값|Valores sugeridos
suggestedCategories|おすすめ|추천|Sugerencias
addAgain|もう一度追加|다시 추가|Añadir de nuevo
addAgainHelp|最近の取引を今日の日付で再利用します。|최근 거래를 오늘 날짜로 다시 사용하세요.|Reutiliza un movimiento reciente con la fecha de hoy.
whereItWent|支出の内訳|지출 내역|En qué se gastó
spendingBreakdown|支出カテゴリ|지출 카테고리|Desglose de gastos
notEnoughSpendingData|支出を数件記録すると内訳が表示されます。|지출을 몇 건 더 기록하면 카테고리별 내역이 표시됩니다.|Registra algunos gastos para ver el desglose por categorías.
yourWeek|今週の振り返り|이번 주|Tu semana
weeklyRecap|週間まとめ|주간 요약|Resumen semanal
noPreviousWeekComparison|前週との比較はまだありません|아직 지난주 비교가 없습니다|Aún no hay comparación semanal
lessThanLastWeek|前週より {percent}% 少ない|지난주보다 {percent}% 적음|{percent}% menos que la semana pasada
moreThanLastWeek|前週より {percent}% 多い|지난주보다 {percent}% 많음|{percent}% más que la semana pasada
topCategory|最多カテゴリ|최다 카테고리|Categoría principal
largestChange|最大の変化|가장 큰 변화|Mayor cambio
budgetStatus|予算の状況|예산 상태|Estado del presupuesto
categoriesOnTrack|カテゴリが予算内|개 카테고리가 예산 이내|categorías dentro del presupuesto
noCategoryBudgets|カテゴリ予算未設定|카테고리 예산 없음|Sin presupuestos por categoría
notEnoughData|データ不足|데이터 부족|Datos insuficientes
worthNoticing|気になる変化|주목할 변화|A destacar
moneySignals|消費のサイン|소비 신호|Señales de gasto
signalsLearning|まだ大きな変化はありません|아직 특별한 변화가 없습니다|Nada inusual por ahora
signalsLearningCopy|支出の履歴が増えると変化が表示されます。|지출 기록이 쌓이면 변화가 표시됩니다.|Las señales aparecerán cuando haya más historial de gastos.
budgetPaceSignal|{category} の予算ペース|{category} 예산 추이|Ritmo del presupuesto de {category}
budgetPaceSignalCopy|{percent}% 使用 · 残り {days} 日|{percent}% 사용 · {days}일 남음|{percent}% utilizado y {days} días restantes.
spendingSpikeSignal|{category} が増加|{category} 지출 증가|{category} ha aumentado
spendingSpikeSignalCopy|先月より {percent}% 多い|지난달보다 {percent}% 많음|{percent}% más que el mes pasado.
positiveChangeSignal|{category} が改善|{category}에서 좋은 변화|Buen avance en {category}
positiveChangeSignalCopy|先月より {amount} 少ない|지난달보다 {amount} 적음|{amount} menos que el mes pasado.
categoryChangeSignal|{category} の変化|{category} 변화|Cambio en {category}
categoryChangeSignalCopy|前週より {amount} {direction}|지난주보다 {amount} {direction}|{amount} {direction} que la semana pasada.
higher|多い|많음|más
lower|少ない|적음|menos
weeklyCheckIn|週間チェックイン|주간 체크인|Revisión semanal
checkInComplete|振り返り完了|검토 완료|Revisión completada
reviewYourWeek|今週のお金を振り返る|이번 주 재무 돌아보기|Revisa tu dinero esta semana
weeklyCheckInCopy|毎日の作業ではなく、気軽な週1回の習慣。|매일 할 일이 아닌 가벼운 주간 습관입니다.|Un hábito semanal ligero, no otra tarea diaria.
completeCheckIn|チェックインを完了|체크인 완료|Completar revisión
weekStreak|{count} 週連続|{count}주 연속|{count} semanas seguidas
monthlyReflection|月の振り返り|월간 돌아보기|Reflexión mensual
howSpendingFeels|今月の支出をどう感じていますか？|이번 달 지출을 어떻게 느끼나요?|¿Cómo te sientes con los gastos de este mes?
good|良い|좋음|Bien
okay|普通|보통|Regular
tooMuch|多すぎる|너무 많음|Demasiado
thisWeek|今週|이번 주|Esta semana
spentThisWeek|今週の支出|이번 주 지출|gastado esta semana
belowWeeklyAverage|最近の週平均より {amount} 少ない|최근 주간 평균보다 {amount} 적음|{amount} menos que tu media semanal reciente
aboveWeeklyAverage|最近の週平均より {amount} 多い|최근 주간 평균보다 {amount} 많음|{amount} más que tu media semanal reciente
buildingBaseline|支出の基準を作成中|지출 기준을 만드는 중|Creando tu referencia de gasto
buildingBaselineCopy|記録を続けると、意味のある変化が見つかります。|거래를 계속 기록하면 의미 있는 변화를 확인할 수 있습니다.|Sigue registrando movimientos para detectar cambios relevantes.
meaningfulChanges|主な変化|의미 있는 변화|Cambios relevantes
noMeaningfulChanges|今週は大きな変化はありませんでした。|이번 주에는 큰 변화가 없었습니다.|No hubo cambios destacados esta semana.
belowRecentAverage|最近の平均より {amount} 少ない|최근 평균보다 {amount} 적음|{amount} menos que la media reciente
aboveRecentAverage|最近の平均より {amount} 多い|최근 평균보다 {amount} 많음|{amount} más que la media reciente
viewWeeklyRecap|週間まとめを見る|주간 요약 보기|Ver resumen semanal
recentWeeklyPattern|最近の週ごとの傾向|최근 주간 추이|Patrón semanal reciente
weekNumber|第 {count} 週|{count}주차|Semana {count}
largestPurchase|最大の買い物|가장 큰 구매|Mayor compra
moneySignal|消費のサイン|소비 신호|Señal de gasto
categoryRunningHigher|{category} が増えています|{category} 지출이 늘고 있습니다|{category} está aumentando
categoryStayedLower|{category} は少なめでした|{category} 지출이 낮게 유지되었습니다|{category} se mantuvo por debajo
categoryMoreFrequent|{category} の頻度が増加|{category} 구매 빈도 증가|{category} fue más frecuente
frequencyComparison|今週 {current} 回 · 最近の傾向 {baseline} 回|이번 주 {current}건 · 최근 추이 {baseline}건|{current} compras esta semana · patrón reciente {baseline}
smallPurchasesAddedUp|少額の買い物が積み重なりました|소액 구매가 쌓였습니다|Las compras pequeñas se acumularon
smallPurchaseSummary|{count} 回 · 合計 {amount}|{count}건 · 총 {amount}|{count} compras · {amount} en total
onePurchaseChangedTotal|1件の買い物が今週の総額に影響|한 구매가 이번 주 합계에 큰 영향|Una compra cambió el total semanal
whatChanged|変わったこと|변화한 점|Qué cambió
whatContributed|要因|기여한 요인|Qué influyó
comparedWithPattern|通常の傾向との比較|평소 추이와 비교|Comparado con tu patrón
frequencyDetail|今週は {current} 回、最近の傾向は約 {baseline} 回です。|이번 주 {current}건, 최근 추이는 약 {baseline}건입니다.|{current} compras esta semana; el patrón reciente es de unas {baseline}.
valueDetail|今週 {current}、最近の平均 {baseline}。|이번 주 {current}, 최근 평균 {baseline}.|{current} esta semana; la media reciente es {baseline}.
yourReflection|あなたの振り返り|나의 돌아보기|Tu reflexión
youSaid|あなたの回答：|내 답변:|Tu respuesta:
howSpendingFelt|今週の支出はどう感じましたか？|이번 주 지출은 어땠나요?|¿Cómo te sentiste con los gastos de esta semana?
comfortable|余裕がある|여유로움|Cómodo
aboutRight|ちょうど良い|적당함|Adecuado
higherThanLiked|思ったより多い|생각보다 많음|Más de lo deseado
whatContributedFeeling|その気持ちに影響したことは？|그 느낌에 영향을 준 것은 무엇인가요?|¿Qué influyó en esa sensación?
addContext|背景を追加|상황 추가|Añadir contexto
contextSelected|{count} 個選択|{count}개 선택됨|{count} seleccionados
viewStreakCalendar|連続記録カレンダー|연속 기록 달력 보기|Ver calendario de racha
diningOut|外食|외식|Comer fuera
socialActivities|交際|모임|Actividades sociales
shoppingReason|買い物|쇼핑|Compras
transportationReason|交通|교통|Transporte
travelReason|旅行|여행|Viajes
unexpectedExpense|予想外の支出|예상치 못한 지출|Gasto imprevisto
otherReason|その他|기타|Otro
checkInSaved|今週の回答を保存しました。|이번 주 기록이 저장되었습니다.|Guardado para esta semana.
checkInCompleteCopy|今週の振り返りは完了しました。|이번 주 돌아보기가 완료되었습니다.|La reflexión de esta semana está completada.
checkInStreak|現在の連続記録|현재 연속 기록|Racha actual
week|週|주|semana
weeks|週|주|semanas
recentEightWeeks|最近8週間|최근 8주|Últimas 8 semanas
notCompleted|未完了|미완료|Sin completar
monthlyReflectionReady|{month} の振り返りができました|{month} 돌아보기 준비 완료|Tu reflexión de {month} está lista
buildingMonthlyPattern|月ごとの傾向を作成中|월간 추이를 만드는 중|Creando tu patrón mensual
belowPreviousMonth|先月より {percent}% 少ない|지난달보다 {percent}% 적음|{percent}% menos que el mes pasado
abovePreviousMonth|先月より {percent}% 多い|지난달보다 {percent}% 많음|{percent}% más que el mes pasado
patternsFound|{count} 件の主な傾向|의미 있는 패턴 {count}개|{count} patrones relevantes encontrados
viewMonth|{month} を見る|{month} 보기|Ver {month}
recurringPatterns|繰り返す傾向|반복 패턴|Patrones recurrentes
paidHelp|支払済みで、残高に反映されています。|이미 지불했으며 잔액에 반영되었습니다.|Ya pagado e incluido en tu saldo.
upcomingHelp|未払いです。今月末まで安心して使える金額から確保されます。|아직 지불하지 않았습니다. 이번 달 말까지 사용 가능 금액에서 예약됩니다.|Aún no pagado. Se reserva del disponible hasta fin de mes.
safeToSpend|安心して使える金額|사용 가능한 금액|Disponible para gastar
availableBalance|利用可能残高|사용 가능 잔액|Saldo disponible
reservedObligations|確保済みの支払額|예약된 지출|Obligaciones reservadas
safePositive|月末までの支払予定を差し引いた金額。|월말까지 예정된 지출을 제외한 금액입니다.|Disponible tras las obligaciones pendientes hasta fin de mes.
safeNegative|支払予定が利用可能残高を {amount} 超えています。|예정 지출이 사용 가능 잔액을 {amount} 초과합니다.|Los gastos pendientes superan tu saldo disponible en {amount}.
noUpcoming|月末までの支払予定はありません。|월말까지 예정된 지출이 없습니다.|No hay obligaciones pendientes antes de fin de mes.
due|支払日 {date}|납기 {date}|Vence {date}
viewBreakdown|内訳を見る|내역 보기|Ver desglose
dueSoon|まもなく支払日|납기 임박|Vence pronto
upcomingBills|支払予定の請求|예정 청구서|Facturas pendientes
upcomingBillsCopy|{count} 件の定期支払に確認が必要です。|확인이 필요한 정기 청구서 {count}건입니다.|{count} facturas periódicas requieren atención.
manage|管理|관리|Gestionar
overdue|期限超過|기한 초과|Vencido
dueOn|支払日|납기|Vencimiento
skipThisMonth|今月はスキップ|이번 달 건너뛰기|Omitir este mes
markPaid|支払済みにする|지불 완료로 표시|Marcar como pagado
recurringActionError|定期支払を更新できませんでした。|정기 청구서를 업데이트하지 못했습니다.|No se pudo actualizar esta factura periódica.
monthlyBudgets|月次予算|월별 예산|Presupuestos mensuales
budgetCopy|安心して使える金額を変えずにカテゴリ上限を設定。|사용 가능 금액을 변경하지 않고 카테고리 한도를 계획하세요.|Define límites por categoría sin cambiar el disponible para gastar.
addBudget|予算を追加|예산 추가|Añadir presupuesto
budgetCategory|予算カテゴリ|예산 카테고리|Categoría del presupuesto
budgetAmount|月の上限|월 한도|Límite mensual
saveBudget|予算を保存|예산 저장|Guardar presupuesto
spent|支出|지출|Gastado
remaining|残り|남은 금액|Restante
categoryFood|食事|식사|Comida
categoryGroceries|食料品・日用品|식료품·생필품|Supermercado
categoryHousing|住居|주거|Vivienda
categoryTransportation|交通|교통|Transporte
categoryShopping|買い物|쇼핑|Compras
categoryEntertainment|娯楽|여가|Ocio
categoryHealth|健康|건강|Salud
categoryEducation|教育|교육|Educación
categoryIncome|収入|수입|Ingresos
categoryOther|その他|기타|Otros
whoPaid|支払った人は？|누가 지불했나요?|¿Quién pagó?
whoPaidHelp|実際に支払ったメンバーを選んでください。|실제로 지불한 멤버를 선택하세요.|Elige al miembro que realizó el pago.
loadingMembers|メンバーを読み込み中…|멤버를 불러오는 중…|Cargando miembros…
you|あなた|나|Tú
splitExpense|この支出を分担しますか？|이 지출을 나눌까요?|¿Repartir este gasto?
splitOptional|分担は任意です。|분담은 선택 사항입니다.|El reparto es opcional.
noSplitNote|共有の帳簿に記録されますが、メンバー間の貸し借りは発生しません。|공유 장부에 기록되지만 멤버 간 빚은 발생하지 않습니다.|Se registra en el espacio compartido, pero no genera deudas entre miembros.
sharedIncomeNote|共有収入は分担せず記録します。|공유 수입은 분담 없이 기록됩니다.|Los ingresos compartidos se registran sin reparto.
dontSplit|分担しない|나누지 않음|No repartir
equal|均等|균등|Igual
percentage|割合|비율|Porcentaje
custom|個別|직접 설정|Personalizado
whoParticipated|参加した人は？|누가 참여했나요?|¿Quién participó?
participantHelp|選択したメンバーのみ分担に含まれます。|선택된 멤버만 분담에 포함됩니다.|Solo los miembros seleccionados se incluyen en el reparto.
selectAll|すべて選択|모두 선택|Seleccionar todos
selectedCount|{count} 人選択|{count}명 선택됨|{count} seleccionados
selectParticipant|少なくとも1人の参加者を選んでください。|분담할 참여자를 한 명 이상 선택하세요.|Selecciona al menos un participante.
totalAllocated|割当済み合計|배분된 합계|Total asignado
leftToAssign|残り {amount} を割当|{amount} 배분 남음|Faltan {amount} por asignar
overTotal|合計を {amount} 超過|합계보다 {amount} 초과|{amount} por encima del total
percentageAllocated|割当済み割合|배분된 비율|Porcentaje asignado
percentageLeft|残り {amount}%|{amount}% 배분 남음|Falta asignar {amount}%
percentageOver|{amount}% 超過|{amount}% 초과|{amount}% por encima del total
percentageMustEqual100|割合の合計は100%にしてください。|비율 합계는 100%여야 합니다.|Los porcentajes deben sumar 100%.
transaction|取引|거래|Movimiento
transactionDetails|取引の詳細|거래 상세|Detalles del movimiento
closeDetails|詳細を閉じる|상세 닫기|Cerrar detalles
noDate|日付なし|날짜 없음|Sin fecha
member|メンバー|멤버|Miembro
paidBy|支払者|지불자|Pagado por
splitMethod|分担方法|분담 방식|Método de reparto
participant|参加者|참여자|Participante
share|分担額|분담액|Parte
settlementLocked|精算履歴に含まれるため、この取引は編集・削除できません。|정산 내역에 포함된 거래는 수정하거나 삭제할 수 없습니다.|Este movimiento forma parte del historial de liquidaciones y no se puede editar ni eliminar.
edit|編集|수정|Editar
deleteTransaction|取引を削除|거래 삭제|Eliminar movimiento
done|完了|완료|Listo
thisTransaction|この取引|이 거래|este movimiento
deleteTransactionQuestion|取引を削除しますか？|거래를 삭제할까요?|¿Eliminar movimiento?
deleteTransactionCopy|「{description}」と分担情報を完全に削除します。元に戻せません。|“{description}” 및 분담 정보가 영구 삭제됩니다. 되돌릴 수 없습니다.|Se eliminarán «{description}» y sus repartos de forma permanente. No se puede deshacer.
deleting|削除中…|삭제 중…|Eliminando…
deletePermanently|完全に削除|영구 삭제|Eliminar definitivamente
deleteBudget|予算を削除|예산 삭제|Eliminar presupuesto
noMatches|一致する取引がありません。|일치하는 거래가 없습니다.|No hay movimientos coincidentes.
changeFilters|検索条件や絞り込みを変更してください。|검색어 또는 필터를 변경해 보세요.|Prueba a cambiar la búsqueda o los filtros.
clearFilters|絞り込みを解除|필터 초기화|Limpiar filtros
totalSpending|支出合計|총 지출|Gastos totales
totalIncome|収入合計|총 수입|Ingresos totales
monthlyBudget|月次予算|월 예산|Presupuesto mensual
monthlyBudgetAmount|月次予算の総額|총 월 예산|Presupuesto mensual total
totalBudgetCopy|今月の支出上限を1つ設定します。|이번 달 총 지출 한도를 설정하세요.|Define un límite total de gasto para este mes.
fixedExpenses|固定費|고정 지출|Gastos fijos
fixedExpensesCopy|家賃、通信費、サブスクリプションなど毎月の費用。|월세, 통신비, 구독료 등 매월 반복되는 비용입니다.|Costes mensuales recurrentes como alquiler, teléfono y suscripciones.
addFixedExpense|固定費を追加|고정 지출 추가|Añadir gasto fijo
fixedExpenseName|支出名|지출 이름|Nombre del gasto
fixedExpenseExample|例：家賃や通信費|예: 월세 또는 통신비|Ej.: alquiler o teléfono
dueDay|支払日|납기일|Día de vencimiento
saveFixedExpense|固定費を保存|고정 지출 저장|Guardar gasto fijo
noFixedExpenses|固定費はまだありません。|아직 고정 지출이 없습니다.|Aún no hay gastos fijos.
monthlyDueDay|毎月 {day} 日が支払日|매월 {day}일 납기|Vence el día {day} de cada mes
deleteFixedExpense|固定費を削除|고정 지출 삭제|Eliminar gasto fijo
deleteFixedExpenseQuestion|この固定費を削除しますか？|이 고정 지출을 삭제할까요?|¿Eliminar este gasto fijo?
deleteFixedExpenseCopy|「{name}」を完全に削除し、予算に含めなくなります。|“{name}”이 영구 삭제되고 예산에서 제외됩니다.|«{name}» se eliminará permanentemente y dejará de incluirse en tu presupuesto.
budgetLoadError|予算データを読み込めませんでした。再試行してください。|예산 데이터를 불러오지 못했습니다. 다시 시도하세요.|No se pudieron cargar todos los datos del presupuesto. Reintenta.
budgetSaveError|月次予算を保存できませんでした。|월 예산을 저장하지 못했습니다.|No se pudo guardar el presupuesto mensual.
fixedExpenseSaveError|固定費を保存できませんでした。|고정 지출을 저장하지 못했습니다.|No se pudo guardar este gasto fijo.
fixedExpenseDeleteError|固定費を削除できませんでした。|고정 지출을 삭제하지 못했습니다.|No se pudo eliminar este gasto fijo.
safeFormulaCopy|月次予算から固定費とこれまでの支出を差し引きます。|월 예산에서 고정 지출과 현재까지 지출을 뺀 금액입니다.|Presupuesto mensual menos gastos fijos y gastos registrados.
completedReadOnly|完了 · 閲覧専用|완료 · 읽기 전용|Completado · Solo lectura
sharedWith|共有メンバー|공유 멤버|Compartido con
members|メンバー|멤버|Miembros
inviteMember|メンバーを招待|멤버 초대|Invitar miembro
noActiveMembers|有効なメンバーが見つかりません。|활성 멤버가 없습니다.|No hay miembros activos.
spaceOwner|スペース所有者|공간 소유자|Propietario del espacio
sharedMember|共有メンバー|공유 멤버|Miembro compartido
owner|所有者|소유자|Propietario
betweenMembers|メンバー間|멤버 간|Entre miembros
balances|残高|잔액|Saldos
calculatingBalances|残高を計算中…|잔액 계산 중…|Calculando saldos…
allSettled|すべて精算済み。|모두 정산되었습니다.|Todo liquidado.
nobodyOwes|現在、貸し借りはありません。|현재 빚진 금액이 없습니다.|Ahora mismo nadie debe nada.
youOwe|{name} に支払う金額|{name}에게 지불할 금액|Debes a {name}
owesYou|{name} から受け取る金額|{name}에게 받을 금액|{name} te debe
owesMember|{from} から {to} への支払額|{from}이 {to}에게 지불할 금액|{from} debe a {to}
outstandingSharedBalance|未精算の共有残高|미정산 공유 잔액|Saldo compartido pendiente
recordPayment|支払いを記録|지불 기록|Registrar pago
recordReceived|受け取りを記録|수령 기록|Registrar cobro
moneyPaidBack|返済した金額|상환한 금액|Dinero devuelto
recentSettlements|最近の精算|최근 정산|Liquidaciones recientes
reversal|取消記録|취소 기록|Reversión
reversed|取消済み|취소됨|Revertido
recordedBy|記録者|기록자|Registrado por
reason|理由|이유|Motivo
reverse|取り消す|취소 처리|Revertir
spaceName|スペース名|공간 이름|Nombre del espacio
saveName|名前を保存|이름 저장|Guardar nombre
peopleInSpace|スペースのメンバー|공간 멤버|Personas del espacio
noMembers|メンバーが見つかりません。|멤버가 없습니다.|No hay miembros.
checking|確認中…|확인 중…|Comprobando…
remove|削除|제거|Quitar
invitePeople|メンバーを招待|사람 초대|Invitar personas
addAnotherMember|メンバーを追加|멤버 추가|Añadir otro miembro
invitePeopleCopy|この帳簿を共有するパートナー、同居人、友人などを招待します。|장부를 공유할 파트너, 룸메이트, 친구 등을 초대하세요.|Invita a tu pareja, compañeros de piso, amigos u otras personas que compartan este registro.
emailAddress|メールアドレス|이메일 주소|Dirección de correo
inviteExpiryCopy|指定したメールアドレスのみ利用でき、7日で期限が切れます。|이 이메일만 사용할 수 있으며 7일 후 만료됩니다.|El enlace solo funciona para este correo y caduca en 7 días.
creating|作成中…|만드는 중…|Creando…
createInviteLink|招待リンクを作成|초대 링크 만들기|Crear enlace de invitación
inviteLink|招待リンク|초대 링크|Enlace de invitación
copied|コピー済み|복사됨|Copiado
copy|コピー|복사|Copiar
recentInvitations|最近の招待|최근 초대|Invitaciones recientes
revoking|無効化中…|철회 중…|Revocando…
revoke|無効にする|철회|Revocar
spaceLifecycle|スペースの管理|공간 관리|Ciclo del espacio
completedSpace|完了したスペース|완료된 공간|Espacio completado
finishOrRemove|スペースを完了・削除|공간 완료 또는 삭제|Completar o eliminar espacio
completedSpaceCopy|すべての記録を履歴に閲覧専用で保存しています。|모든 기록이 읽기 전용으로 이력에 보존됩니다.|Todo se conserva como un registro de solo lectura en el historial.
finishSpaceCopy|旅行や共同生活が終わったら、スペースを完了して履歴に保存します。|여행이나 공동 생활이 끝나면 공간을 완료하여 이력에 보존하세요.|Cuando termine el viaje o esta etapa, completa el espacio para conservarlo en el historial.
completeSpace|スペースを完了|공간 완료|Completar espacio
completeSpaceRecordCopy|取引、残高、メンバー、精算を閲覧専用で保存します。|모든 거래, 잔액, 멤버 및 정산을 읽기 전용으로 보존합니다.|Conserva movimientos, saldos, miembros y liquidaciones en modo de solo lectura.
deleteSpaceCopy|このスペースと関連する取引、分担、精算、招待、メンバー記録を削除します。|이 공간과 관련 거래, 분담, 정산, 초대 및 멤버 기록을 삭제합니다.|Elimina este espacio y todos sus movimientos, repartos, liquidaciones, invitaciones y miembros.
budget|予算|예산|Presupuesto
budgetPlanning|予算の計画|예산 계획|Planificación del presupuesto
budgetPlanningCopy|月の上限と毎月の固定費をまとめて管理します。|월 한도와 정기 고정 지출을 한곳에서 관리하세요.|Gestiona el límite mensual y los gastos fijos en un solo lugar.
manageBudget|予算を管理|예산 관리|Gestionar presupuesto
budgetMonth|予算の月|예산 월|Mes del presupuesto
previousMonth|前月|이전 달|Mes anterior
nextMonth|翌月|다음 달|Mes siguiente
budgetUsed|予算使用額|사용한 예산|Presupuesto utilizado
budgetUsedPercent|予算の {percent}% を確保・使用|예산의 {percent}% 예약 또는 사용|{percent}% del presupuesto reservado o gastado
budgetOverBy|予算を {amount} 超過|예산 {amount} 초과|Exceso de {amount} sobre el presupuesto
editFixedExpense|固定費を編集|고정 지출 수정|Editar gasto fijo
notSplit|分担なし|분담 없음|Sin reparto
splitEquallyCount|均等分担 · {count} 人|균등 분담 · {count}명|Reparto igual · {count} personas
percentageSplitCount|割合で分担 · {count} 人|비율 분담 · {count}명|Por porcentaje · {count} personas
customSplitCount|個別分担 · {count} 人|직접 분담 · {count}명|Personalizado · {count} personas
split|分担|분담|Reparto
yourShare|あなたの分担額|내 분담액|Tu parte
viewDetails|詳細を見る|상세 보기|Ver detalles
viewSplit|分担を見る|분담 보기|Ver reparto
hideSplit|分担を閉じる|분담 숨기기|Ocultar reparto
settled|精算済み|정산됨|Liquidado
splitDetails|分担の詳細|분담 상세|Detalles del reparto
sharedBalance|共有残高|공유 잔액|Saldo compartido
recordSettlement|精算を記録|정산 기록|Registrar liquidación
recordPaidCopy|{name} に支払った金額を記録します。|{name}에게 지불한 금액을 기록하세요.|Registra el dinero que pagaste a {name}.
recordReceivedCopy|{name} から受け取った金額を記録します。|{name}에게 받은 금액을 기록하세요.|Registra el dinero recibido de {name}.
from|支払元|보낸 사람|De
to|受取先|받는 사람|A
outstandingBalance|未精算残高|미정산 잔액|Saldo pendiente
partialRepaymentHelp|全額または一部の返済を記録できます。|전액 또는 일부 상환을 기록할 수 있습니다.|Puedes registrar un pago total o parcial.
note|メモ|메모|Nota
optional|任意|선택 사항|Opcional
recording|記録中…|기록 중…|Registrando…
settlementNoteExample|例：現金、銀行振込|예: 현금, 계좌 이체|Ej.: efectivo, transferencia
settlementCorrection|精算の訂正|정산 수정|Corrección de liquidación
reverseSettlementQuestion|この精算を取り消しますか？|이 정산을 취소할까요?|¿Revertir esta liquidación?
restoredAmount|残高に戻る金額|잔액에 복원되는 금액|Importe devuelto al saldo
reversalCopy|元の記録は残ります。取消記録を関連付けて残高を復元し、履歴を保持します。|원래 기록은 유지됩니다. 연결된 취소 기록으로 잔액을 복원하고 이력을 보존합니다.|El registro original se conserva. Una reversión vinculada restaura el saldo y mantiene el historial.
reversalReason|取消理由|취소 사유|Motivo de reversión
reversalReasonExample|例：支払いを誤って入力した|예: 지불을 잘못 입력함|Ej.: el pago se introdujo por error
reversing|取消中…|취소 중…|Revirtiendo…
reverseSettlement|精算を取り消す|정산 취소|Revertir liquidación
balanceBreakdown|残高の内訳|잔액 내역|Desglose del saldo
outstandingNetBalance|未精算の差引残高|미정산 순잔액|Saldo neto pendiente
balanceExplanation|全員の支出と返済を相殺し、共有残高を整理しています。|모든 멤버의 지출과 상환을 상계하여 공유 잔액을 단순화합니다.|Los saldos compartidos se simplifican compensando los gastos y las devoluciones de todos.
noSourceActivity|元の取引がありません。|원본 활동이 없습니다.|No hay actividad de origen disponible.
settlementReversal|精算の取消|정산 취소|Reversión de liquidación
repayment|返済|상환|Devolución
added|加算|추가됨|Añadido
reduced|減算|줄어듦|Reducido
owes|{from} から {to} への支払額|{from}이 {to}에게 지불할 금액|{from} debe a {to}
createInvitation|招待を作成|초대 만들기|Crear invitación
invitationReady|招待の準備完了|초대 준비 완료|Invitación lista
invitationReadyCopy|このリンクを {email} に送信してください。|이 링크를 {email}에게 보내세요.|Envía este enlace a {email}.
expiresAt|有効期限：{date}。|만료일: {date}.|Caduca el {date}.
invitationModalCopy|メールアドレスに紐づく招待リンクを作成。7日後に期限が切れます。|이메일에 연결된 초대 링크를 만듭니다. 7일 후 만료됩니다.|Crea un enlace vinculado al correo. Caduca en 7 días.
inviteRestrictedCopy|{email} のみ利用できます。|{email}만 이 링크를 사용할 수 있습니다.|Solo {email} puede usar este enlace.
invitationStatus|{status} · 有効期限 {date}|{status} · 만료 {date}|{status} · Caduca {date}
pending|保留|대기 중|Pendiente
accepted|承認済み|수락됨|Aceptada
revoked|無効化済み|철회됨|Revocada
expired|期限切れ|만료됨|Caducada
legacyOpenLink|旧公開リンク|기존 공개 링크|Enlace público antiguo
completedInvitesClosed|このスペースは完了済みで閲覧専用のため、招待できません。|이 공간은 완료된 읽기 전용 공간으로 초대할 수 없습니다.|El espacio está completado y es de solo lectura. Las invitaciones están cerradas.
ownerInvitesOnly|招待リンクを作成できるのは所有者のみです。|소유자만 초대 링크를 만들 수 있습니다.|Solo el propietario puede crear invitaciones.
membership|メンバー資格|멤버십|Pertenencia
leaveSharedSpace|共有スペースを退出|공유 공간 나가기|Salir del espacio compartido
leaveSpaceCopy|{space} を退出します。過去の活動は共有の帳簿に残ります。|{space}에서 나갑니다. 이전 활동은 공유 장부에 유지됩니다.|Sal de {space}. Tu actividad anterior se conservará en el registro compartido.
leaveThisSpace|このスペースを退出|이 공간 나가기|Salir de este espacio
balanceCheckBeforeLeave|退出前に未精算残高を確認します。|나가기 전에 미정산 잔액을 확인합니다.|Se comprobará tu saldo pendiente antes de salir.
leaveSpace|スペースを退出|공간 나가기|Salir del espacio
completeSpaceQuestion|{space} を完了しますか？|{space}을(를) 완료할까요?|¿Completar {space}?
completeSpaceConfirmCopy|履歴に移動し、閲覧専用になります。すべての情報は保持されます。現在、この操作は元に戻せません。|이력으로 이동하여 읽기 전용이 됩니다. 모든 정보는 유지됩니다. 현재 이 작업은 되돌릴 수 없습니다.|Se moverá al historial y será de solo lectura. Se conservará toda la información. Actualmente no se puede deshacer.
deleteSpaceQuestion|{space} を完全に削除しますか？|{space}을(를) 영구 삭제할까요?|¿Eliminar {space} definitivamente?
deleteSpaceConfirmCopy|スペースと関連するすべての記録を完全に削除します。復元できません。|공간과 모든 관련 기록이 영구 삭제됩니다. 복구할 수 없습니다.|Se eliminará el espacio y todos sus registros relacionados. No se puede recuperar.
loadTransactionsError|取引を読み込めませんでした。再試行してください。|거래를 불러오지 못했습니다. 다시 시도하세요.|No se pudieron cargar los movimientos. Reintenta.
loadMembersError|共有メンバーを読み込めませんでした。|공유 공간 멤버를 불러오지 못했습니다.|No se pudieron cargar los miembros.
loadSplitsError|取引の分担詳細を読み込めませんでした。|거래 분담 상세를 불러오지 못했습니다.|No se pudieron cargar los detalles del reparto.
verifySettlementsError|精算履歴を確認できませんでした。|정산 이력을 확인하지 못했습니다.|No se pudo verificar el historial de liquidaciones.
deleteTransactionError|この取引を削除できませんでした。|이 거래를 삭제하지 못했습니다.|No se pudo eliminar este movimiento.
settlementMembersOnly|この残高に関わる2人のメンバーのみ精算を記録できます。|이 잔액과 관련된 두 멤버만 정산을 기록할 수 있습니다.|Solo los dos miembros implicados pueden registrar una liquidación.
positiveAmountRequired|0より大きい金額を入力してください。|0보다 큰 금액을 입력하세요.|Introduce un importe mayor que cero.
settlementDateRequired|精算日を選択してください。|정산 날짜를 선택하세요.|Elige una fecha de liquidación.
reversalReasonRequired|短い取消理由を入力してください。|간단한 취소 사유를 입력하세요.|Indica un motivo breve para la reversión.
reverseSettlementError|精算を取り消せませんでした。|정산을 취소하지 못했습니다.|No se pudo revertir la liquidación.
removeMember|メンバーを削除|멤버 제거|Quitar miembro
completing|完了処理中…|완료 중…|Completando…
leaving|退出中…|나가는 중…|Saliendo…
removing|削除中…|제거 중…|Quitando…
backToHome|ホームに戻る|홈으로 돌아가기|Volver al inicio
backToLogin|ログインに戻る|로그인으로 돌아가기|Volver al acceso
createAccount|アカウントを作成|계정 만들기|Crea tu cuenta
welcomeBack|おかえりなさい|다시 오신 것을 환영합니다|Bienvenido de nuevo
startOwnMoney|自分のお金を管理しよう。|나의 재무 관리를 시작하세요.|Empieza con tu propio dinero.
signInMoney|財務スペースにログイン。|재무 공간에 로그인하세요.|Accede a tu dinero.
signupCopy|個人スペースは自動で作成されます。共有は必要なときだけ。|개인 공간이 자동으로 만들어집니다. 공유는 필요할 때만 사용하세요.|Tu espacio personal se crea automáticamente. Comparte solo cuando lo necesites.
loginCopy|個人または共有スペースを続けて利用します。|개인 또는 공유 공간을 계속 사용하세요.|Continúa con tus espacios personales o compartidos.
logIn|ログイン|로그인|Iniciar sesión
signUp|登録|가입|Registrarse
continueWithGoogle|Google で続ける|Google로 계속하기|Continuar con Google
connectingGoogle|Google に接続中…|Google 연결 중…|Conectando con Google…
orContinueWithEmail|またはメールで続ける|또는 이메일로 계속하기|O continuar con correo
name|名前|이름|Nombre
yourName|あなたの名前|이름|Tu nombre
email|メールアドレス|이메일|Correo electrónico
password|パスワード|비밀번호|Contraseña
passwordPlaceholder|6文字以上|6자 이상|Al menos 6 caracteres
pleaseWait|お待ちください…|잠시 기다려 주세요…|Espera…
createAccountButton|アカウントを作成|계정 만들기|Crear cuenta
forgotPassword|パスワードを忘れた場合|비밀번호를 잊으셨나요?|¿Olvidaste la contraseña?
accountRecovery|アカウントの復旧|계정 복구|Recuperación de cuenta
resetPassword|パスワードを再設定。|비밀번호를 재설정하세요.|Restablece tu contraseña.
resetPasswordCopy|メールアドレスを入力すると、安全な再設定リンクを送信します。|이메일을 입력하면 안전한 재설정 링크를 보내드립니다.|Introduce tu correo y te enviaremos un enlace seguro.
sendResetLink|再設定リンクを送信|재설정 링크 보내기|Enviar enlace
resetEmailSent|リンクを送信しました。メールを確認してください。|링크를 보냈습니다. 이메일을 확인하세요.|Enlace enviado. Revisa tu correo.
secureAccount|アカウントを保護|계정 보호|Protege tu cuenta
chooseNewPassword|新しいパスワードを設定。|새 비밀번호를 설정하세요.|Elige una nueva contraseña.
newPasswordCopy|新しいパスワードを入力し、確認してください。|새 비밀번호를 입력하고 확인하세요.|Introduce y confirma la nueva contraseña.
newPassword|新しいパスワード|새 비밀번호|Nueva contraseña
confirmPassword|パスワードを確認|비밀번호 확인|Confirmar contraseña
updatePassword|パスワードを更新|비밀번호 업데이트|Actualizar contraseña
passwordUpdated|パスワードを更新しました。|비밀번호가 업데이트되었습니다.|Contraseña actualizada.
passwordMismatch|パスワードが一致しません。|비밀번호가 일치하지 않습니다.|Las contraseñas no coinciden.
passwordLength|パスワードは6文字以上にしてください。|비밀번호는 6자 이상이어야 합니다.|La contraseña debe tener al menos 6 caracteres.
enterEmail|メールアドレスを入力してください。|이메일을 입력하세요.|Introduce tu correo.
enterEmailPassword|メールアドレスとパスワードを入力してください。|이메일과 비밀번호를 입력하세요.|Introduce tu correo y contraseña.
enterName|名前を入力してください。|이름을 입력하세요.|Introduce tu nombre.
supabaseNotConnected|Supabase に接続されていません。.env を確認してください。|Supabase에 연결되지 않았습니다. .env 파일을 확인하세요.|Supabase no está conectado. Revisa el archivo .env.
accountCreatedSignedIn|アカウントを作成し、ログインしました。|계정이 만들어졌으며 로그인되었습니다.|Cuenta creada. Ya has iniciado sesión.
accountCreatedConfirm|アカウントを作成しました。メールを確認してからログインしてください。|계정이 만들어졌습니다. 이메일 확인 후 로그인하세요.|Cuenta creada. Confirma tu correo y luego inicia sesión.
somethingWentWrong|問題が発生しました。|문제가 발생했습니다.|Algo salió mal.
pinSpace|スペースを固定|공간 고정|Fijar espacio
unpinSpace|固定を解除|고정 해제|Desfijar espacio
pinned|固定済み|고정됨|Fijado
pinnedSpaces|固定したスペース|고정된 공간|Espacios fijados
otherSpaces|その他のスペース|다른 공간|Otros espacios
defaultPinned|標準で固定|기본 고정|Fijado por defecto
personalAlwaysPinned|個人スペースは常に固定されます|개인 공간은 항상 고정됩니다|El espacio personal siempre está fijado
completed|完了|완료|Completado
history|履歴|이력|Historial
lastUpdated|最終更新 {date}|최근 수정 {date}|Actualizado el {date}
currentSpace|現在のスペース|현재 공간|Espacio actual
openSpace|スペースを開く|공간 열기|Abrir espacio
viewHistory|履歴を見る|이력 보기|Ver historial
back|戻る|뒤로|Volver
sharedSpaces|共有スペース|공유 공간|Espacios compartidos
startSharingTitle|必要なときだけ共有しよう。|필요할 때만 공유를 시작하세요.|Comparte solo cuando tenga sentido.
startSharingCopy|パートナー、同居人、友人とのスペースを作成。個人の帳簿は独立したままです。|파트너, 룸메이트 또는 친구를 위한 공간을 만드세요. 개인 장부는 별도로 유지됩니다.|Crea un espacio para tu pareja, compañeros o amigos. Lo personal sigue separado.
spaceNameExample|例：304号室|예: 304호|Ej.: Piso 304
sharedSpaceNameRequired|共有スペースの名前を入力してください。|공유 공간 이름을 입력하세요.|Pon un nombre al espacio compartido.
createSharedSpaceError|共有スペースを作成できませんでした。|공유 공간을 만들지 못했습니다.|No se pudo crear el espacio compartido.
createSharedSpace|共有スペースを作成|공유 공간 만들기|Crear espacio compartido
inviteLinkComingSoon|招待リンクは近日公開|초대 링크 곧 지원|Los enlaces de invitación llegarán pronto
joinWithInviteLink|招待リンクで参加|초대 링크로 참여|Unirse con un enlace
splitlyHome|Splitlie ホーム|Splitlie 홈|Inicio de Splitlie
getStarted|始める|시작하기|Empezar
landingKicker|個人と共有のお金を、ひとつに|개인과 공유 재무를 함께|Dinero personal y compartido, juntos
landingTitle|日々のお金が、もっと明確に。|일상의 재무를 더 명확하게.|Un lugar más claro para tu dinero diario.
landingCopy|自分の支出を記録し、必要なときに共有して、いつでも残高を理解できます。|내 지출을 기록하고 필요할 때 공유하며 잔액을 항상 파악하세요.|Registra tus gastos, compártelos cuando lo necesites y entiende siempre tu saldo.
alreadyHaveAccount|すでにアカウントを持っている|이미 계정이 있습니다|Ya tengo una cuenta
sharedExpenses|共有支出|공유 지출|Gastos compartidos
clearBalances|明確な残高|명확한 잔액|Saldos claros
landingProductPreview|製品の動的プレビュー|제품 미리보기|Vista animada del producto
homeExpenses|家庭の支出|가정 지출|Gastos del hogar
addExpense|支出を追加|지출 추가|Añadir gasto
yourBalance|あなたの残高|내 잔액|Tu saldo
youAreOwed|受取予定|받을 금액|te deben
recentActivity|最近の活動|최근 활동|Actividad reciente
today|今日|오늘|Hoy
yesterday|昨日|어제|Ayer
utilities|光熱費|공과금|Suministros
coffee|コーヒー|커피|Café
sampleDate|9月12日|9월 12일|12 sept.
balanceUpdated|残高を更新しました|잔액 업데이트됨|Saldo actualizado
sampleOwedBalance|Alex から $42.10 受取予定|Alex에게 받을 금액 $42.10|Alex te debe $42.10
splitEqually|均等に分担|균등 분담|Repartir por igual
peopleCount|{count} 人|{count}명|{count} personas
startPersonal|個人から始める|개인부터 시작|Empieza por lo personal
startPersonalCopy|登録したらすぐに帳簿を使えます。|가입하면 바로 장부를 사용할 수 있습니다.|Tu registro está listo en cuanto te unes.
shareWhenNeeded|必要なときに共有|필요할 때 공유|Comparte cuando lo necesites
shareWhenNeededCopy|旅行、家庭、パートナーのためのスペースを作成。|여행, 가정 또는 파트너를 위한 공간을 만드세요.|Crea un espacio para un viaje, tu hogar o tu pareja.
seeFullStory|すべての記録を確認|전체 기록 확인|Ve toda la historia
seeFullStoryCopy|残高の元となる取引を確認できます。|모든 잔액의 원본 활동을 확인할 수 있습니다.|Cada saldo enlaza con la actividad que lo origina.
invitation|招待|초대|Invitación
signInToJoin|ログインして共有スペースに参加。|로그인하여 공유 공간에 참여하세요.|Inicia sesión para unirte al espacio.
signInJoinCopy|この招待は Splitlie アカウントと紐づいています。ログインまたは登録後に再び開いてください。|초대는 Splitlie 계정에 연결됩니다. 로그인하거나 가입한 뒤 이 링크를 다시 여세요.|La invitación está vinculada a una cuenta de Splitlie. Accede o regístrate y vuelve a abrirla.
continueToSignIn|ログインへ進む|로그인으로 계속|Ir al acceso
joinedEyebrow|参加完了|참여 완료|Ya estás dentro
sharedSpaceJoined|共有スペースに参加しました。|공유 공간에 참여했습니다.|Te has unido al espacio.
sharedSpaceAdded|共有スペースをアカウントに追加しました。|공유 공간이 계정에 추가되었습니다.|El espacio se ha añadido a tu cuenta.
openSharedSpace|共有スペースを開く|공유 공간 열기|Abrir espacio compartido
invitationExpired|招待の期限が切れました。所有者に新しいリンクを依頼してください。|초대가 만료되었습니다. 소유자에게 새 링크를 요청하세요.|La invitación ha caducado. Pide un enlace nuevo al propietario.
invitationRevoked|招待は無効化されました。所有者に新しいリンクを依頼してください。|초대가 철회되었습니다. 소유자에게 새 링크를 요청하세요.|La invitación se ha revocado. Pide un enlace nuevo al propietario.
invitationUsed|この招待はすでに使用済みです。|이미 사용된 초대입니다.|Esta invitación ya se ha usado.
sharedSpaceInvitation|共有スペースへの招待|공유 공간 초대|Invitación a un espacio
joinSpaceTitle|{space} に参加。|{space}에 참여하세요.|Únete a {space}.
invitedTogether|共同でお金を管理する招待が届きました。|함께 재무를 관리하도록 초대받았습니다.|Te han invitado a gestionar dinero en común.
checkingInvitation|招待を確認中…|초대 확인 중…|Comprobando invitación…
invitationFor|この招待は {email} 宛です。有効期限は {date}。|이 초대는 {email}용이며 {date}에 만료됩니다.|Esta invitación es para {email} y caduca el {date}.
acceptInvitationCopy|招待を承認して、スペースをアカウントに追加します。|초대를 수락하여 공간을 계정에 추가하세요.|Acepta para añadir el espacio a tu cuenta.
joining|参加中…|참여 중…|Uniéndote…
acceptInvitation|招待を承認|초대 수락|Aceptar invitación
invitationUnavailable|招待を利用できません|초대를 사용할 수 없음|Invitación no disponible
notNow|今はしない|나중에|Ahora no
invitationCheckError|招待を確認できませんでした。|초대를 확인하지 못했습니다.|No se pudo comprobar la invitación.
invitationInvalidEmail|この招待は無効か、別のメールアドレスのものです。|초대가 유효하지 않거나 다른 이메일에 속합니다.|Esta invitación no es válida o pertenece a otro correo.
invitationInvalid|この招待リンクは無効です。|유효하지 않은 초대 링크입니다.|El enlace de invitación no es válido.
invitationAcceptError|招待を承認できませんでした。|초대를 수락하지 못했습니다.|No se pudo aceptar la invitación.
`

export const additionalLocales = { ja: {}, ko: {}, es: {} }
for (const row of messages.trim().split('\n')) {
  const [key, ja, ko, es] = row.split('|')
  if (!key || !ja || !ko || !es) throw new Error(`Invalid locale row: ${key}`)
  if (key in additionalLocales.ja) throw new Error(`Duplicate locale message: ${key}`)
  additionalLocales.ja[key] = ja
  additionalLocales.ko[key] = ko
  additionalLocales.es[key] = es
}
