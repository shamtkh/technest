export const handleImageChange = async (e, setForm) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    await addImageFiles(files, setForm)
    e.target.value = ''
}

export const handleImagePaste = async (e, setForm) => {
    const files = Array.from(e.clipboardData?.items || [])
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter(Boolean)
    if (!files.length) return
    e.preventDefault()
    await addImageFiles(files, setForm)
}

async function addImageFiles(files, setForm) {
    const images = await Promise.all(files.slice(0, 5).map(resizeImage))
    setForm((prev) => ({ ...prev, images: [...prev.images, ...images].slice(0, 5) }))
}

async function resizeImage(file) {
    const image = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    const width = Math.min(300, image.width)

    canvas.width = width
    canvas.height = (image.height * width) / image.width
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL('image/jpeg', 0.5)
}
