import type { Options } from 'browser-image-compression'
import workerLibUrl from 'browser-image-compression/dist/browser-image-compression.js?url'

type ImageCompression = typeof import('browser-image-compression').default

let imageCompressionPromise: Promise<ImageCompression> | null = null

function loadImageCompression() {
  imageCompressionPromise ??= import('browser-image-compression').then((mod) => mod.default)
  return imageCompressionPromise
}

export async function compressImageFile(file: File, options: Options) {
  const imageCompression = await loadImageCompression()
  const workerOptions = {
    ...options,
    useWebWorker: true,
    libURL: workerLibUrl,
  }

  try {
    return await imageCompression(file, workerOptions)
  } catch (error) {
    return imageCompression(file, { ...options, useWebWorker: false })
  }
}
