import { useRef, useState } from 'react'

export default function BrandLogo({ src, alt, className = '' }) {
  const [processedSrc, setProcessedSrc] = useState(src)
  const [loaded, setLoaded] = useState(false)
  const processed = useRef(false)

  function removeCheckerboard(event) {
    if (processed.current) return
    processed.current = true

    const image = event.currentTarget
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0)

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    for (let index = 0; index < pixels.data.length; index += 4) {
      const red = pixels.data[index]
      const green = pixels.data[index + 1]
      const blue = pixels.data[index + 2]
      const brightness = (red + green + blue) / 3
      const neutral = Math.max(red, green, blue) - Math.min(red, green, blue) < 24

      if (neutral && brightness > 170) {
        pixels.data[index + 3] = 0
      }
    }

    context.putImageData(pixels, 0, 0)
    setProcessedSrc(canvas.toDataURL('image/png'))
  }

  return (
    <span className={`relative inline-flex overflow-hidden ${className}`}>
      <span className={`skeleton absolute inset-0 transition-opacity duration-300 ${loaded ? 'opacity-0' : ''}`} aria-hidden="true" />
      <img
        src={processedSrc}
        alt={alt}
        onLoad={(event) => {
          setLoaded(true)
          removeCheckerboard(event)
        }}
        className="relative h-full w-full object-contain"
      />
    </span>
  )
}
