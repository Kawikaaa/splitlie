import ModalSurface from '../components/ModalSurface'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  BadgeDollarSign,
  Camera,
  Check,
  Copy,
  Globe,
  Info,
  Link,
  LogOut,
  Move,
  Trash2,
  Pencil,
  UserMinus,
  UserRound,
  Users,
  X,
  ZoomIn,
} from '../icons'

import {
  createSpaceInvitation,
  fetchActiveSpaceMemberRows,
  fetchMemberSpaceBalance,
  fetchMySpaceBalance,
  fetchProfilesByIds,
  fetchProfileAvatar,
  fetchSpaceInvitations,
  leaveSharedSpace as leaveSharedSpaceRequest,
  removeSpaceMember,
  revokeSpaceInvitation,
  completeSharedSpace,
  deleteSharedSpacePermanently,
  rebaseSpaceCurrency,
  renameSharedSpace,
  updateProfileAvatar,
} from '../data/ledgerApi'
import ConfirmActionModal from '../components/ConfirmActionModal'
import AppSelect from '../components/AppSelect'
import AvatarImage from '../components/AvatarImage'
import { supabase } from '../lib/supabase'
import { saveProfileDisplayName } from '../lib/profileDisplayName'
import { getLanguageLocale, LANGUAGE_OPTIONS, useLanguage } from '../i18n/LanguageContext'
import { SUPPORTED_CURRENCIES } from '../services/currency/currencyService'
import { getExchangeRate } from '../services/currency/exchangeRateService'

function money(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Math.abs(Number(value) || 0))
}

const AVATAR_CROP_VIEW_SIZE = 280

export default function Settings({
  activeSpace,
  user,
  onLeftSpace,
  onMemberRemoved,
  onSpaceCompleted,
  onSpaceDeleted,
  onSpaceRenamed,
  onLogout,
}) {
  const { t, language, setLanguage } = useLanguage()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)

  const [creatingInvite, setCreatingInvite] =
    useState(false)

  const [inviteLink, setInviteLink] =
    useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteExpiresAt, setInviteExpiresAt] = useState('')
  const [invitations, setInvitations] = useState([])
  const [revokingInviteId, setRevokingInviteId] = useState('')

  const [copied, setCopied] =
    useState(false)

  const [leaving, setLeaving] =
    useState(false)

  const [removingUserId, setRemovingUserId] =
    useState(null)

  const [error, setError] =
    useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [lifecycleBusy, setLifecycleBusy] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [spaceName, setSpaceName] = useState(activeSpace?.name || '')
  const [baseCurrency, setBaseCurrency] = useState(activeSpace?.currency || 'USD')
  const [currencySaving, setCurrencySaving] = useState(false)
  const [currencyInfoOpen, setCurrencyInfoOpen] = useState(false)
  const currencyInfoRef = useRef(null)
  const avatarInputRef = useRef(null)
  const avatarCropDragRef = useRef(null)
  const avatarCropGuideRef = useRef(null)
  const [avatarCropViewSize, setAvatarCropViewSize] = useState(AVATAR_CROP_VIEW_SIZE)
  const avatarStorageKey = `splitlie-avatar-${user?.id || user?.email || 'guest'}`
  const [avatarUrl, setAvatarUrl] = useState(() => window.localStorage.getItem(avatarStorageKey) || '')
  const [avatarCrop, setAvatarCrop] = useState(null)
  const [avatarCropZoom, setAvatarCropZoom] = useState(1)
  const [avatarCropPosition, setAvatarCropPosition] = useState({ x: 0, y: 0 })
  const [avatarSaving, setAvatarSaving] = useState(false)
  const savedDisplayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || ''
  const [displayName, setDisplayName] = useState(savedDisplayName)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  useEffect(() => {
    setDisplayName(savedDisplayName)
  }, [user?.id, savedDisplayName])

  async function handleSaveDisplayName(event) {
    event.preventDefault()
    if (nameSaving || displayName.trim() === savedDisplayName) return
    if (!displayName.trim() || displayName.trim().length > 50) {
      setNameError(t('displayNameRequired'))
      return
    }
    setNameSaving(true)
    setNameError('')
    setNameSaved(false)
    try {
      const result = await saveProfileDisplayName(supabase, user?.id, displayName)
      if (result.error) {
        setNameError(t(result.profileSaved ? 'displayNameSyncError' : 'displayNameSaveError'))
        return
      }
      setDisplayName(result.displayName)
      setNameSaved(true)
      setMembers(current => current.map(member => member.user_id === user?.id
        ? { ...member, display_name: result.displayName } : member))
    } catch {
      setNameError(t('displayNameSaveError'))
    } finally {
      setNameSaving(false)
    }
  }

  useEffect(() => {
    if (!avatarCrop || !avatarCropGuideRef.current) return
    const guide = avatarCropGuideRef.current
    const measure = () => {
      setAvatarCropViewSize(guide.getBoundingClientRect().width)
      setAvatarCropPosition({ x: 0, y: 0 })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(guide)
    measure()
    return () => observer.disconnect()
  }, [avatarCrop])

  const isShared =
    activeSpace?.type === 'shared'
  const isCompleted = activeSpace?.status === 'completed'

  useEffect(() => {
    setInviteLink('')
    setInviteEmail('')
    setInviteExpiresAt('')
    setCopied(false)
    setError('')
    setLeaving(false)
    setRemovingUserId(null)
    setConfirmation(null)
    setSpaceName(activeSpace?.name || '')
    setBaseCurrency(activeSpace?.currency || 'USD')
    setRenaming(false)
    setCurrencySaving(false)
    setCurrencyInfoOpen(false)

    if (
      !activeSpace?.id ||
      !isShared
    ) {
      setMembers([])
      return
    }

    loadMembers()
    loadInvitations()
  }, [
    activeSpace?.id,
    isShared,
  ])

  useEffect(() => {
    function closeCurrencyInfo(event) {
      if (currencyInfoRef.current && !currencyInfoRef.current.contains(event.target)) {
        setCurrencyInfoOpen(false)
      }
    }
    document.addEventListener('mousedown', closeCurrencyInfo)
    function closeOnEscape(event) {
      if (event.key === 'Escape' && currencyInfoRef.current?.contains(document.activeElement)) {
        setCurrencyInfoOpen(false)
        currencyInfoRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeCurrencyInfo); document.removeEventListener('keydown', closeOnEscape) }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function hydrateAvatar() {
      const localAvatar = window.localStorage.getItem(avatarStorageKey) || ''
      setAvatarUrl(localAvatar)
      if (!user?.id) return

      const { data, error: profileError } = await fetchProfileAvatar(user.id)
      if (cancelled) return

      if (profileError) {
        setError(profileError.message || t('avatarSaveError'))
        return
      }

      let remoteAvatar = data?.avatar_url || ''

      // Migrate avatars saved by older releases from this device into the profile.
      if (!remoteAvatar && localAvatar) {
        const { data: savedProfile, error: saveError } = await updateProfileAvatar(user.id, localAvatar)
        if (cancelled) return
        if (saveError) {
          setError(saveError.message || t('avatarSaveError'))
          return
        }
        remoteAvatar = savedProfile?.avatar_url || localAvatar
      }

      if (remoteAvatar) {
        window.localStorage.setItem(avatarStorageKey, remoteAvatar)
      } else {
        window.localStorage.removeItem(avatarStorageKey)
      }
      setAvatarUrl(remoteAvatar)
      window.dispatchEvent(new Event('splitlie-avatar-change'))
    }

    hydrateAvatar()
    return () => { cancelled = true }
  }, [avatarStorageKey, user?.id, t])

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { setError(t('avatarReadError')); return }
    if (file.size > 10 * 1024 * 1024) { setError(t('avatarSizeError')); return }
    setError('')

    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        setAvatarCrop({
          src: reader.result,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        })
        setAvatarCropZoom(1)
        setAvatarCropPosition({ x: 0, y: 0 })
      }
      image.onerror = () => setError(t('avatarReadError'))
      image.src = reader.result
    }
    reader.onerror = () => setError(t('avatarReadError'))
    reader.readAsDataURL(file)
  }

  function avatarCropMetrics(zoom = avatarCropZoom) {
    if (!avatarCrop) return { scale: 1, width: avatarCropViewSize, height: avatarCropViewSize, maxX: 0, maxY: 0 }
    const scale = Math.max(avatarCropViewSize / avatarCrop.naturalWidth, avatarCropViewSize / avatarCrop.naturalHeight) * zoom
    const width = avatarCrop.naturalWidth * scale
    const height = avatarCrop.naturalHeight * scale
    return {
      scale,
      width,
      height,
      maxX: Math.max(0, (width - avatarCropViewSize) / 2),
      maxY: Math.max(0, (height - avatarCropViewSize) / 2),
    }
  }

  function clampAvatarCropPosition(position, zoom = avatarCropZoom) {
    const { maxX, maxY } = avatarCropMetrics(zoom)
    return {
      x: Math.max(-maxX, Math.min(maxX, position.x)),
      y: Math.max(-maxY, Math.min(maxY, position.y)),
    }
  }

  function moveAvatarCrop(event) {
    const drag = avatarCropDragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const next = { x: drag.originX + event.clientX - drag.pointerX, y: drag.originY + event.clientY - drag.pointerY }
    setAvatarCropPosition(clampAvatarCropPosition(next))
  }

  function stopAvatarCropDrag(event) {
    if (event && avatarCropDragRef.current?.pointerId !== event.pointerId) return
    if (event?.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    avatarCropDragRef.current = null
  }

  async function saveCroppedAvatar() {
    if (!avatarCrop || avatarSaving) return
    setAvatarSaving(true)
    setError('')
    try {
      const image = new Image()
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = avatarCrop.src
      })
      const { scale, width, height } = avatarCropMetrics()
      const imageLeft = (avatarCropViewSize - width) / 2 + avatarCropPosition.x
      const imageTop = (avatarCropViewSize - height) / 2 + avatarCropPosition.y
      const sourceX = -imageLeft / scale
      const sourceY = -imageTop / scale
      const sourceSize = avatarCropViewSize / scale
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas is unavailable')
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 256, 256)
      const nextAvatar = canvas.toDataURL('image/webp', .84)
      window.localStorage.setItem(avatarStorageKey, nextAvatar)
      setAvatarUrl(nextAvatar)
      window.dispatchEvent(new Event('splitlie-avatar-change'))
      const { error: avatarError } = await updateProfileAvatar(user.id, nextAvatar)
      if (avatarError) setError(avatarError.message || t('avatarSaveError'))
      setAvatarCrop(null)
    } catch {
      setError(t('avatarSaveError'))
    } finally {
      setAvatarSaving(false)
    }
  }

  async function removeAvatar() {
    const previousAvatar = avatarUrl
    window.localStorage.removeItem(avatarStorageKey)
    setAvatarUrl('')
    window.dispatchEvent(new Event('splitlie-avatar-change'))
    const { error: avatarError } = await updateProfileAvatar(user.id, null)
    if (avatarError) {
      if (previousAvatar) window.localStorage.setItem(avatarStorageKey, previousAvatar)
      setAvatarUrl(previousAvatar)
      window.dispatchEvent(new Event('splitlie-avatar-change'))
      setError(avatarError.message || t('avatarSaveError'))
    }
  }

  async function requestBaseCurrencyChange() {
    if (!activeSpace?.id || currencySaving || isCompleted || baseCurrency === activeSpace.currency) return
    setCurrencySaving(true)
    setError('')
    try {
      const quote = await getExchangeRate({
        fromCurrency: activeSpace.currency || 'USD',
        toCurrency: baseCurrency,
      })
      setConfirmation({
        type: 'rebase-currency',
        currency: baseCurrency,
        rate: quote.rate,
        date: quote.date,
        title: t('changeBaseCurrencyQuestion', { currency: baseCurrency }),
        description: t('changeBaseCurrencyCopy', {
          from: activeSpace.currency || 'USD',
          to: baseCurrency,
          rate: Number(quote.rate).toFixed(6),
        }),
      })
    } catch (currencyError) {
      setError(currencyError.message || t('baseCurrencyChangeError'))
      setBaseCurrency(activeSpace.currency || 'USD')
    }
    setCurrencySaving(false)
  }

  async function loadMembers() {
    setLoading(true)
    setError('')

    const {
      data: memberRows,
      error: memberError,
    } = await fetchActiveSpaceMemberRows(activeSpace.id)

    if (memberError) {
      setLoading(false)
      setMembers([])
      setError(
        memberError.message
      )
      return
    }

    const userIds =
      (memberRows ?? []).map(
        (member) =>
          member.user_id
      )

    if (
      userIds.length === 0
    ) {
      setLoading(false)
      setMembers([])
      return
    }

    const {
      data: profiles,
      error: profileError,
    } = await fetchProfilesByIds(userIds)

    setLoading(false)

    if (profileError) {
      setMembers([])
      setError(
        profileError.message
      )
      return
    }

    const profileMap =
      new Map(
        (profiles ?? []).map(
          (profile) => [
            profile.id,
            profile,
          ]
        )
      )

    const combined =
      (memberRows ?? []).map(
        (member) => ({
          ...member,

          display_name:
            profileMap.get(
              member.user_id
            )?.display_name ||
            'Member',
          avatar_url:
            member.user_id === user?.id
              ? window.localStorage.getItem(avatarStorageKey) || profileMap.get(member.user_id)?.avatar_url || ''
              : profileMap.get(member.user_id)?.avatar_url || '',
        })
      )

    setMembers(combined)
  }

  const currentMembership =
    useMemo(() => {
      return members.find(
        (member) =>
          member.user_id ===
          user?.id
      )
    }, [
      members,
      user?.id,
    ])

  const isOwner =
    currentMembership?.role ===
      'owner' ||
    activeSpace?.created_by ===
      user?.id

  async function loadInvitations() {
    const { data, error: invitationsError } =
      await fetchSpaceInvitations(activeSpace.id)

    if (invitationsError) {
      setInvitations([])
      return
    }

    setInvitations(data ?? [])
  }

  async function createInviteLink() {
    if (
      !isShared ||
      !isOwner ||
      !activeSpace?.id
    ) {
      return
    }

    const email = inviteEmail.trim().toLowerCase()

    if (!email) {
      setError('Enter the email address of the person you want to invite.')
      return
    }

    setCreatingInvite(true)
    setError('')
    setCopied(false)

    const {
      data,
      error: inviteError,
    } = await createSpaceInvitation(
      activeSpace.id,
      email
    )

    setCreatingInvite(false)

    if (inviteError) {
      setError(
        inviteError.message
      )
      return
    }

    let token = null
    let expiresAt = null

    if (
      typeof data === 'string'
    ) {
      token = data
    } else if (
      data?.token
    ) {
      token = data.token
      expiresAt = data.expires_at
    } else if (
      Array.isArray(data) &&
      data[0]?.token
    ) {
      token =
        data[0].token
      expiresAt = data[0].expires_at
    }

    if (!token) {
      setError(
        'The invitation was created, but no invitation token was returned.'
      )
      return
    }

    const link =
      `${window.location.origin}/join/${token}`

    setInviteLink(link)
    setInviteExpiresAt(expiresAt || '')
    await loadInvitations()
  }

  async function revokeInvite(invitationId) {
    setRevokingInviteId(invitationId)
    setError('')

    const { error: revokeError } =
      await revokeSpaceInvitation(invitationId)

    setRevokingInviteId('')

    if (revokeError) {
      setError(revokeError.message || 'Could not revoke this invitation.')
      return
    }

    await loadInvitations()
  }

  async function copyInviteLink() {
    if (!inviteLink) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        inviteLink
      )

      setCopied(true)

      window.setTimeout(
        () => {
          setCopied(false)
        },
        2000
      )
    } catch {
      setError(
        'Could not copy the invite link. You can select and copy it manually.'
      )
    }
  }

  async function saveSpaceName() {
    const nextName = spaceName.trim()
    if (!nextName || nextName === activeSpace.name || !isOwner || isCompleted) return
    setRenaming(true)
    setError('')
    const { error: renameError } = await renameSharedSpace(activeSpace.id, nextName)
    setRenaming(false)
    if (renameError) {
      setError(renameError.message || 'Could not rename this space.')
      return
    }
    await onSpaceRenamed?.(activeSpace.id)
  }

  async function removeMember(member) {
    if (
      !isShared ||
      !isOwner ||
      !activeSpace?.id ||
      !member?.user_id ||
      member.user_id === user?.id ||
      member.role === 'owner' ||
      removingUserId
    ) {
      return
    }

    setRemovingUserId(
      member.user_id
    )

    setError('')

    const {
      data: balanceData,
      error: balanceError,
    } = await fetchMemberSpaceBalance({
      spaceId: activeSpace.id,
      userId: member.user_id,
    })

    if (balanceError) {
      setRemovingUserId(null)

      setError(
        balanceError.message ||
        'Could not check this member’s outstanding balance.'
      )

      return
    }

    const balance =
      Number(balanceData ?? 0)

    const currency =
      activeSpace.currency ||
      'USD'

    const formattedBalance =
      money(
        balance,
        currency
      )

    const memberName =
      member.display_name ||
      'This member'

    let confirmationMessage = ''

    if (balance < -0.009) {
      confirmationMessage =
        `${memberName} still owes ${formattedBalance} in ${activeSpace.name}.\n\n` +
        `Removing this member will NOT erase the balance. Their past transactions, splits, and settlement history will remain in the shared ledger.\n\n` +
        `${memberName} will lose access to this shared space.\n\n` +
        `Are you sure you want to remove them anyway?`
    } else if (balance > 0.009) {
      confirmationMessage =
        `${memberName} is still owed ${formattedBalance} in ${activeSpace.name}.\n\n` +
        `Removing this member will NOT erase the balance. Their past transactions, splits, and settlement history will remain in the shared ledger.\n\n` +
        `${memberName} will lose access to this shared space.\n\n` +
        `Are you sure you want to remove them anyway?`
    } else {
      confirmationMessage =
        `Remove ${memberName} from ${activeSpace.name}?\n\n` +
        `Their balance is settled. Their past transactions, splits, and settlement history will stay in the shared ledger, but they will lose access to this space.`
    }

    setRemovingUserId(null)
    setConfirmation({
      type: 'remove-member',
      title: `Remove ${memberName}?`,
      description: confirmationMessage,
      member,
    })
  }

  async function leaveSharedSpace() {
    if (
      !isShared ||
      !activeSpace?.id ||
      isOwner ||
      leaving
    ) {
      return
    }

    setLeaving(true)
    setError('')

    const {
      data: balanceData,
      error: balanceError,
    } = await fetchMySpaceBalance(
      activeSpace.id
    )

    if (balanceError) {
      setLeaving(false)

      setError(
        balanceError.message ||
        'Could not check your outstanding balance.'
      )

      return
    }

    const balance =
      Number(balanceData ?? 0)

    const currency =
      activeSpace.currency ||
      'USD'

    const formattedBalance =
      money(
        balance,
        currency
      )

    let confirmationMessage = ''

    if (balance < -0.009) {
      confirmationMessage =
        `You still owe ${formattedBalance} in ${activeSpace.name}.\n\n` +
        `Leaving will NOT erase this balance. Your past transactions, splits, and settlement history will remain in the shared ledger.\n\n` +
        `You will lose access to this shared space after leaving.\n\n` +
        `Are you sure you want to leave anyway?`
    } else if (balance > 0.009) {
      confirmationMessage =
        `You are still owed ${formattedBalance} in ${activeSpace.name}.\n\n` +
        `Leaving will NOT erase this balance. Your past transactions, splits, and settlement history will remain in the shared ledger.\n\n` +
        `You will lose access to this shared space after leaving.\n\n` +
        `Are you sure you want to leave anyway?`
    } else {
      confirmationMessage =
        `Leave ${activeSpace.name}?\n\n` +
        `Your balance is settled. Your past transactions, splits, and settlement history will stay in the shared ledger, but you will no longer have access to this space.`
    }

    setLeaving(false)
    setConfirmation({
      type: 'leave-space',
      title: `Leave ${activeSpace.name}?`,
      description: confirmationMessage,
    })
  }

  async function confirmPendingAction() {
    if (!confirmation) return

    setError('')

    if (confirmation.type === 'logout') {
      setLogoutBusy(true)
      await onLogout?.()
      return
    }

    if (confirmation.type === 'rebase-currency') {
      setCurrencySaving(true)
      const { error: currencyError } = await rebaseSpaceCurrency(
        activeSpace.id,
        confirmation.currency,
        confirmation.rate
      )
      setCurrencySaving(false)
      if (currencyError) {
        setError(currencyError.message || t('baseCurrencyChangeError'))
        return
      }
      setConfirmation(null)
      await onSpaceRenamed?.(activeSpace.id)
      return
    }

    if (confirmation.type === 'remove-member') {
      const member = confirmation.member
      setRemovingUserId(member.user_id)

      const { error: removeError } = await removeSpaceMember({
        spaceId: activeSpace.id,
        userId: member.user_id,
      })

      setRemovingUserId(null)

      if (removeError) {
        setError(removeError.message || 'Could not remove this member.')
        return
      }

      setConfirmation(null)
      await loadMembers()
      await onMemberRemoved?.(member.user_id)
      return
    }

    if (confirmation.type === 'complete-space') {
      setLifecycleBusy(true)
      const { error: completeError } = await completeSharedSpace(activeSpace.id)
      setLifecycleBusy(false)
      if (completeError) {
        setError(completeError.message || 'Could not complete this space.')
        return
      }
      setConfirmation(null)
      await onSpaceCompleted?.(activeSpace.id)
      return
    }

    if (confirmation.type === 'delete-space') {
      setLifecycleBusy(true)
      const deletedId = activeSpace.id
      const { error: deleteError } = await deleteSharedSpacePermanently(deletedId)
      setLifecycleBusy(false)
      if (deleteError) {
        setError(deleteError.message || 'Could not permanently delete this space.')
        return
      }
      setConfirmation(null)
      await onSpaceDeleted?.(deletedId)
      return
    }

    setLeaving(true)

    const { error: leaveError } =
      await leaveSharedSpaceRequest(activeSpace.id)

    if (leaveError) {
      setLeaving(false)
      setError(leaveError.message || 'Could not leave this shared space.')
      return
    }

    const leftSpaceId = activeSpace.id
    setConfirmation(null)
    await onLeftSpace?.(leftSpaceId)
    setLeaving(false)
  }

  if (!activeSpace) {
    return null
  }

  const userDisplayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Personal'
  const spaceDisplayName = isShared ? activeSpace.name : t('personalSpace', { name: userDisplayName })

  return (
    <div className="page settings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            {isShared
              ? t('sharedSpace')
              : t('personal')}
          </p>

          <h1>{t('settings')}</h1>

          <p className="muted">
            {isShared
              ? t('manageSpace', { space: spaceDisplayName })
              : t('settingsFor', { space: spaceDisplayName })}
          </p>
        </div>
        <div className="settings-page-space-context">
          <span>{isShared ? <Users size={20} /> : <UserRound size={20} />}</span>
          <div>
            <small>{isShared ? t('sharedSpace') : t('personalSpaceLabel')}</small>
            <strong>{spaceDisplayName}</strong>
          </div>
        </div>
      </header>

      <section className="settings-base-currency-section" id="workspace-settings">
        <div className="settings-base-currency-card">
          <span className="settings-base-currency-icon"><BadgeDollarSign size={25} /></span>
          <div className="settings-base-currency-copy">
            <p className="eyebrow">{t('baseCurrency')}</p>
            <strong>{activeSpace.currency}</strong>
            <p>{t('baseCurrencyHelp')}</p>
          </div>
          <div className="settings-base-currency-actions">
              <div className="settings-currency-control">
                <AppSelect
                  className="settings-currency-select"
                  value={baseCurrency}
                  disabled={currencySaving || isCompleted || !isOwner}
                  onChange={setBaseCurrency}
                  ariaLabel={t('baseCurrency')}
                  options={SUPPORTED_CURRENCIES.map((item) => ({ value: item.code, label: item.code }))}
                />
                {!isCompleted && isOwner && (
                  <button className="settings-currency-save" type="button" onClick={requestBaseCurrencyChange} disabled={currencySaving || baseCurrency === activeSpace.currency}>
                    <Check size={16} />
                    {currencySaving ? t('saving') : baseCurrency === activeSpace.currency ? (t('saved')) : t('saveCurrency')}
                  </button>
                )}
                <div className="settings-currency-info" ref={currencyInfoRef}>
                  <button
                    className="settings-currency-help-button"
                    type="button"
                    aria-label={t('baseCurrencyInfo')}
                    aria-expanded={currencyInfoOpen}
                    onClick={() => setCurrencyInfoOpen((open) => !open)}
                  >
                    <Info size={18} />
                    <span>{t('baseCurrencyInfo')}</span>
                  </button>
                  {currencyInfoOpen && (
                    <div className="settings-info-popover" role="note">
                      <strong>{t('baseCurrency')}</strong>
                      <p>{isOwner ? t('baseCurrencyRevalueHelp') : t('baseCurrencyOwnerOnly')}</p>
                      <p>{t('baseCurrencyHelp')}</p>
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>
      </section>


      <section className="settings-section profile-settings-section" id="profile-settings">
        <div className="profile-settings-avatar">
          <AvatarImage src={avatarUrl} size={32} />
        </div>
        <div className="profile-settings-copy">
          <p className="eyebrow">{t('profile')}</p>
          <h2>{userDisplayName}</h2>
          <p className="muted">{t('profileCopy')}</p>
        </div>
        <div className="profile-settings-actions">
          <button className="primary" type="button" onClick={() => avatarInputRef.current?.click()}>
            <Camera size={16} />
            {t('uploadPhoto')}
          </button>
          {avatarUrl && (
            <button className="secondary" type="button" onClick={removeAvatar}>
              {t('remove')}
            </button>
          )}
          <input ref={avatarInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarUpload} />
        </div>
        <form className="profile-name-form" onSubmit={handleSaveDisplayName}>
          <label htmlFor="profile-display-name">{t('displayNameLabel')}</label>
          <div className="profile-name-controls">
            <input id="profile-display-name" autoComplete="nickname" maxLength={50}
              value={displayName} disabled={nameSaving}
              aria-invalid={Boolean(nameError)} aria-describedby="profile-name-feedback"
              onChange={event => { setDisplayName(event.target.value); setNameError(''); setNameSaved(false) }} />
            <button className="primary" type="submit" disabled={nameSaving || !displayName.trim() || displayName.trim() === savedDisplayName}>
              {nameSaving ? t('saving') : t('saveDisplayName')}
            </button>
          </div>
          <p id="profile-name-feedback" className={nameError ? 'profile-name-error' : 'muted'} role={nameError ? 'alert' : 'status'}>
            {nameError || (nameSaved ? t('displayNameSaved') : t('displayNameHelp'))}
          </p>
        </form>
      </section>

      <section className="settings-section language-settings-section" aria-labelledby="language-settings-title">
        <div className="language-settings-copy">
          <div>
            <h2 id="language-settings-title">{t('language')}<Globe className="language-settings-icon" size={22} aria-hidden="true" /></h2>
            <p className="muted">{t('languageSettingsCopy')}</p>
          </div>
        </div>
        <AppSelect ariaLabel={t('language')} value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
      </section>

      {avatarCrop && (
        <div className="modal-backdrop avatar-crop-backdrop" onMouseDown={() => { if (!avatarSaving) setAvatarCrop(null) }}>
          <ModalSurface as="section" onClose={() => setAvatarCrop(null)} busy={avatarSaving} className="avatar-crop-modal" role="dialog" aria-modal="true" aria-label={t('cropPhoto')} onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button avatar-crop-close" type="button" aria-label={t('close')} disabled={avatarSaving} onClick={() => setAvatarCrop(null)}><X size={18} /></button>
            <p className="eyebrow">{t('profilePhoto')}</p>
            <h2>{t('cropTitle')}</h2>
            <p className="avatar-crop-copy">{t('cropCopy')}</p>
            <div className="avatar-crop-stage-wrap">
              <div
                className="avatar-crop-stage"
                tabIndex={0}
                role="group"
                aria-label={t('cropKeyboard')}
                onKeyDown={(event) => {
                  const delta = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[event.key]
                  if (!delta || avatarSaving) return
                  event.preventDefault()
                  setAvatarCropPosition(position => clampAvatarCropPosition({ x: position.x + delta[0], y: position.y + delta[1] }))
                }}
                onPointerDown={(event) => {
                  if (avatarSaving || avatarCropDragRef.current || (event.pointerType === 'mouse' && event.button !== 0)) return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  avatarCropDragRef.current = { pointerId: event.pointerId, pointerX: event.clientX, pointerY: event.clientY, originX: avatarCropPosition.x, originY: avatarCropPosition.y }
                }}
                onPointerMove={moveAvatarCrop}
                onPointerUp={stopAvatarCropDrag}
                onPointerCancel={stopAvatarCropDrag}
                onLostPointerCapture={stopAvatarCropDrag}
                onBlur={() => { avatarCropDragRef.current = null }}
              >
                <img
                  src={avatarCrop.src}
                  alt=""
                  draggable="false"
                  style={{
                    width: `${avatarCropMetrics().width}px`,
                    height: `${avatarCropMetrics().height}px`,
                    transform: `translate(calc(-50% + ${avatarCropPosition.x}px), calc(-50% + ${avatarCropPosition.y}px))`,
                  }}
                />
                <span ref={avatarCropGuideRef} className="avatar-crop-guide" aria-hidden="true" />
                <span className="avatar-crop-move-hint"><Move size={15} />{t('dragAdjust')}</span>
              </div>
            </div>
            <label className="avatar-crop-zoom">
              <ZoomIn size={17} />
              <span>{t('zoom')}</span>
              <input type="range" min="1" max="3" step="0.01" value={avatarCropZoom} onChange={(event) => { const zoom = Number(event.target.value); setAvatarCropZoom(zoom); setAvatarCropPosition((position) => clampAvatarCropPosition(position, zoom)) }} />
            </label>
            <div className="avatar-crop-actions">
              <button className="secondary" type="button" disabled={avatarSaving} onClick={() => setAvatarCrop(null)}>{t('cancel')}</button>
              <button className="primary" type="button" disabled={avatarSaving} onClick={saveCroppedAvatar}><Check size={16} />{avatarSaving ? (t('saving')) : (t('saveAvatar'))}</button>
            </div>
          </ModalSurface>
        </div>
      )}


      {isShared && isOwner && !isCompleted && (
        <section className="settings-section settings-rename-section">
          <div className="settings-rename-space">
            <label>
              {t('spaceName')}
              <div className="settings-rename-row">
                <input
                  type="text"
                  value={spaceName}
                  maxLength={80}
                  onChange={(event) => setSpaceName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      saveSpaceName()
                    }
                  }}
                />
                <button className="secondary" type="button" onClick={saveSpaceName} disabled={renaming || !spaceName.trim() || spaceName.trim() === activeSpace.name}>
                  <Pencil size={15} />
                  {renaming ? t('saving') : t('saveName')}
                </button>
              </div>
            </label>
          </div>
        </section>
      )}

      {isShared && (
        <>
          <section className="settings-section" id="members-settings">
            <div className="settings-section-heading">
              <div>
                <p className="eyebrow">
                  {t('members')} ·{' '}
                  {members.length}
                </p>

                <h2>
                  {t('peopleInSpace')}
                </h2>
              </div>

              <Users size={20} />
            </div>

            {loading ? (
              <div className="settings-empty">
                {t('loadingMembers')}
              </div>
            ) : members.length ===
              0 ? (
              <div className="settings-empty">
                {t('noMembers')}
              </div>
            ) : (
              <div className="settings-member-list">
                {members.map(
                  (member) => {
                    const memberIsMe =
                      member.user_id ===
                      user?.id

                    const memberIsOwner =
                      member.role ===
                      'owner'

                    const canRemove =
                      isOwner &&
                      !isCompleted &&
                      !memberIsMe &&
                      !memberIsOwner

                    const isRemoving =
                      removingUserId ===
                      member.user_id

                    const name =
                      member.display_name ||
                      t('member')

                    return (
                      <div
                        className="settings-member-row"
                        key={
                          member.user_id
                        }
                      >
                        <div className="settings-member-person">
                          <div className="settings-member-avatar member-profile-avatar">
                            <AvatarImage
                              src={member.avatar_url}
                              size={20}
                              fallback={name.charAt(0).toUpperCase()}
                            />
                          </div>

                          <div>
                            <strong>
                              {name}

                              {memberIsMe
                                ? ` (${t('you')})`
                                : ''}
                            </strong>

                            <span>
                              {memberIsOwner
                                ? t('spaceOwner')
                                : t('sharedMember')}
                            </span>
                          </div>
                        </div>

                        <div className="settings-member-actions">
                          <span className="settings-role-badge">
                            {memberIsOwner
                              ? t('owner')
                              : t('member')}
                          </span>

                          {canRemove && (
                            <button
                              className="settings-remove-member-button"
                              type="button"
                              onClick={() =>
                                removeMember(
                                  member
                                )
                              }
                              disabled={
                                Boolean(
                                  removingUserId
                                )
                              }
                            >
                              <UserMinus
                                size={15}
                              />

                              {isRemoving
                                ? t('checking')
                                : t('remove')}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </section>

          <section className="settings-section">
            <div className="settings-section-heading">
              <div>
                <p className="eyebrow">
                  {t('invitePeople')}
                </p>

                <h2>
                  {t('addAnotherMember')}
                </h2>

                <p className="muted">
                  {t('invitePeopleCopy')}
                </p>
              </div>

              <Link size={20} />
            </div>

            {isOwner && !isCompleted ? (
              <>
                {!inviteLink ? (
                  <div className="settings-invite-form">
                    <label>
                      {t('emailAddress')}
                      <input
                        type="email"
                        placeholder="friend@example.com"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                      />
                    </label>

                    <p className="muted">
                      {t('inviteExpiryCopy')}
                    </p>

                    <button
                      className="primary"
                      type="button"
                      onClick={createInviteLink}
                      disabled={creatingInvite}
                    >
                      <Link size={16} />
                      {creatingInvite ? t('creating') : t('createInviteLink')}
                    </button>
                  </div>
                ) : (
                  <div className="settings-invite-result">
                    <label>
                      {t('inviteLink')}

                      <div className="settings-invite-input">
                        <input
                          type="text"
                          readOnly
                          value={
                            inviteLink
                          }
                          onFocus={(
                            event
                          ) =>
                            event.target.select()
                          }
                        />

                        <button
                          className="secondary"
                          type="button"
                          onClick={
                            copyInviteLink
                          }
                        >
                          {copied ? (
                            <>
                              <Check
                                size={16}
                              />
                              {t('copied')}
                            </>
                          ) : (
                            <>
                              <Copy
                                size={16}
                              />
                              {t('copy')}
                            </>
                          )}
                        </button>
                      </div>
                    </label>

                    <p className="muted">
                      {t('inviteRestrictedCopy', { email: inviteEmail })}
                      {inviteExpiresAt && ` ${t('expiresAt', { date: new Date(inviteExpiresAt).toLocaleString(getLanguageLocale(language)) })}`}
                    </p>
                  </div>
                )}

                {invitations.length > 0 && (
                  <div className="settings-invitation-list">
                    <strong>{t('recentInvitations')}</strong>
                    {invitations.map((invitation) => {
                      const effectiveStatus =
                        invitation.status === 'pending' &&
                        new Date(invitation.expires_at) <= new Date()
                          ? 'expired'
                          : invitation.status

                      return (
                        <div className="settings-invitation-row" key={invitation.id}>
                          <div>
                            <strong>{invitation.invited_email || t('legacyOpenLink')}</strong>
                            <span>
                              {t('invitationStatus', { status: t(effectiveStatus), date: new Date(invitation.expires_at).toLocaleDateString(getLanguageLocale(language)) })}
                            </span>
                          </div>

                          {effectiveStatus === 'pending' && (
                            <button
                              className="secondary"
                              type="button"
                              disabled={revokingInviteId === invitation.id}
                              onClick={() => revokeInvite(invitation.id)}
                            >
                              {revokingInviteId === invitation.id ? t('revoking') : t('revoke')}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="settings-notice">
                {isCompleted
                  ? t('completedInvitesClosed')
                  : t('ownerInvitesOnly')}
              </div>
            )}
          </section>

          {!isOwner && !isCompleted && (
            <section className="settings-section settings-danger-section">
              <div className="settings-section-heading">
                <div>
                  <p className="eyebrow">
                    {t('membership')}
                  </p>

                  <h2>
                    {t('leaveSharedSpace')}
                  </h2>

                  <p className="muted">
                    {t('leaveSpaceCopy', { space: activeSpace.name })}
                  </p>
                </div>

                <LogOut size={20} />
              </div>

              <div className="settings-danger-action">
                <div>
                  <strong>
                    {t('leaveThisSpace')}
                  </strong>

                  <p className="muted">
                    {t('balanceCheckBeforeLeave')}
                  </p>
                </div>

                <button
                  className="settings-leave-button"
                  type="button"
                  onClick={
                    leaveSharedSpace
                  }
                  disabled={leaving}
                >
                  <LogOut size={16} />

                  {leaving
                    ? t('checking')
                    : t('leaveSpace')}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {isShared && isOwner && (
        <section className="settings-section settings-lifecycle-section">
          <div className="settings-section-heading">
            <div>
              <p className="eyebrow">{t('spaceLifecycle')}</p>
              <h2>{isCompleted ? t('completedSpace') : t('finishOrRemove')}</h2>
              <p className="muted">
                {isCompleted
                  ? t('completedSpaceCopy')
                  : t('finishSpaceCopy')}
              </p>
            </div>
            <Archive size={20} />
          </div>

          {!isCompleted && (
            <div className="settings-lifecycle-action">
              <div>
                <strong>{t('completeSpace')}</strong>
                <span>{t('completeSpaceRecordCopy')}</span>
              </div>
              <button className="secondary" type="button" onClick={() => setConfirmation({
                type: 'complete-space',
                title: t('completeSpaceQuestion', { space: activeSpace.name }),
                description: t('completeSpaceConfirmCopy'),
              })}><Archive size={16} /> {t('completeSpace')}</button>
            </div>
          )}

          <div className="settings-lifecycle-action danger">
            <div>
              <strong>{t('deletePermanently')}</strong>
              <span>{t('deleteSpaceCopy')}</span>
            </div>
            <button className="settings-leave-button" type="button" onClick={() => setConfirmation({
              type: 'delete-space',
              title: t('deleteSpaceQuestion', { space: activeSpace.name }),
              description: t('deleteSpaceConfirmCopy'),
            })}><Trash2 size={16} /> {t('deletePermanently')}</button>
          </div>
        </section>
      )}

      {!isShared && (
        <section className="settings-section">
          <div className="settings-section-heading">
            <div>
              <p className="eyebrow">
                {t('personalLedger')}
              </p>

              <h2>
                {t('privateMoney')}
              </h2>

              <p className="muted">
                {t('privateMoneyCopy')}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="settings-section settings-account-section" id="account-settings">
        <div className="settings-section-heading">
          <div>
            <p className="eyebrow">{t('account')}</p>
            <h2>{t('accountSession')}</h2>
            <p className="muted">{t('logoutSettingsCopy')}</p>
          </div>
          <LogOut size={20} />
        </div>

        <div className="settings-danger-action">
          <div>
            <strong>{t('logout')}</strong>
            <p className="muted">{user?.email}</p>
          </div>
          <button
            className="settings-leave-button"
            type="button"
            onClick={() => setConfirmation({
              type: 'logout',
              title: t('logoutQuestion'),
              description: t('logoutConfirmCopy'),
            })}
          >
            <LogOut size={16} /> {t('logout')}
          </button>
        </div>
      </section>

      {error && (
        <div className="auth-message error">
          {error}
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(confirmation)}
        title={confirmation?.title}
        description={confirmation?.description}
        confirmLabel={
          confirmation?.type === 'logout'
            ? t('logout')
          : confirmation?.type === 'delete-space'
            ? t('deletePermanently')
            : confirmation?.type === 'rebase-currency'
              ? t('changeCurrency')
            : confirmation?.type === 'complete-space'
              ? t('completeSpace')
          : confirmation?.type === 'leave-space'
            ? t('leaveSpace')
            : t('removeMember')
        }
        busyLabel={
          confirmation?.type === 'logout'
            ? t('loggingOut')
          : confirmation?.type === 'delete-space'
            ? t('deleting')
            : confirmation?.type === 'rebase-currency'
              ? t('changingCurrency')
            : confirmation?.type === 'complete-space'
              ? t('completing')
          : confirmation?.type === 'leave-space'
            ? t('leaving')
            : t('removing')
        }
        busy={leaving || Boolean(removingUserId) || lifecycleBusy || currencySaving || logoutBusy}
        onCancel={() => {
          if (confirmation?.type === 'rebase-currency') {
            setBaseCurrency(activeSpace.currency || 'USD')
          }
          setConfirmation(null)
        }}
        onConfirm={confirmPendingAction}
      />
    </div>
  )
}
