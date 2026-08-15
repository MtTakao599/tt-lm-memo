import { useEffect, useState } from 'react'

const MOBILE_PHOTO_QUERY = '(max-width: 768px) and (pointer: coarse)'

function matchesMobilePhotoUi() {
  return window.matchMedia(MOBILE_PHOTO_QUERY).matches
}

export function useMobilePhotoUi() {
  const [isMobilePhotoUi, setIsMobilePhotoUi] = useState(matchesMobilePhotoUi)

  useEffect(() => {
    const media = window.matchMedia(MOBILE_PHOTO_QUERY)
    const update = () => setIsMobilePhotoUi(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isMobilePhotoUi
}
