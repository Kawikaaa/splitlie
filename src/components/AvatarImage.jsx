import { useEffect, useState } from 'react'
import { UserRound } from '../icons'

export default function AvatarImage({ src, alt = '', size = 22, fallback = null }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) {
    return fallback ?? <UserRound size={size} aria-hidden="true" />
  }

  return <img src={src} alt={alt} onError={() => setFailed(true)} />
}
