export const handleImageChange = async (e, setForm) => {
    const files = Array.from(e.target.files || []).slice(0, 5)
    if (!files.length) return

    const images = await Promise.all(files.map(resizeImage))
    setForm(prev => ({ ...prev, images }))
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
