import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'

type PdfCommand =
  | { type: 'ping' }
  | { type: 'compress'; bytes: ArrayBuffer; level: 'light' | 'medium' | 'strong' }
  | { type: 'merge'; files: ArrayBuffer[] }
  | { type: 'split'; bytes: ArrayBuffer; ranges: string }
  | { type: 'watermark'; bytes: ArrayBuffer; text: string; color: string; size: number }

const ctx = self as unknown as {
  postMessage(message: unknown, transfer?: Transferable[]): void
  onmessage: ((event: MessageEvent<{ id: string; payload: PdfCommand }>) => void) | null
}

function ok(id: string, result: unknown, transfer?: Transferable[]) {
  ctx.postMessage({ id, ok: true, result }, transfer ?? [])
}

function fail(id: string, error: unknown) {
  ctx.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) })
}

function hexToRgbTuple(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6)
  const num = parseInt(full, 16)
  return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 }
}

function parseRanges(input: string, total: number): number[][] {
  const groups: number[][] = []
  const parts = input.split(',').map((s) => s.trim())
  for (const part of parts) {
    if (!part) continue
    const [startStr, endStr] = part.split('-')
    const start = Math.max(1, parseInt(startStr || ''))
    const end = endStr ? Math.min(total, parseInt(endStr)) : start
    if (isNaN(start) || start > total) continue
    const pages: number[] = []
    for (let i = start; i <= end; i++) pages.push(i - 1)
    if (pages.length) groups.push(pages)
  }
  return groups
}

ctx.onmessage = async (event) => {
  const { id, payload } = event.data

  try {
    if (payload.type === 'ping') {
      ok(id, { pong: true })
      return
    }

    if (payload.type === 'compress') {
      const doc = await PDFDocument.load(payload.bytes, { ignoreEncryption: true, updateMetadata: false })
      const out = await doc.save({
        useObjectStreams: payload.level !== 'light',
        addDefaultPage: false,
        objectsPerTick: payload.level === 'strong' ? 200 : 50,
      })
      ok(id, out.buffer as ArrayBuffer, [out.buffer as ArrayBuffer])
      return
    }

    if (payload.type === 'merge') {
      const merged = await PDFDocument.create()
      for (const bytes of payload.files) {
        const doc = await PDFDocument.load(bytes)
        const pages = await merged.copyPages(doc, doc.getPageIndices())
        pages.forEach((page) => merged.addPage(page))
      }
      const out = await merged.save()
      ok(id, out.buffer as ArrayBuffer, [out.buffer as ArrayBuffer])
      return
    }

    if (payload.type === 'split') {
      const doc = await PDFDocument.load(payload.bytes)
      const groups = parseRanges(payload.ranges, doc.getPageCount())
      if (!groups.length) throw new Error('页码范围格式错误')

      const files: Array<{ name: string; bytes: ArrayBuffer }> = []
      const transfers: Transferable[] = []
      for (let i = 0; i < groups.length; i++) {
        const newDoc = await PDFDocument.create()
        const pages = await newDoc.copyPages(doc, groups[i]!)
        pages.forEach((page) => newDoc.addPage(page))
        const out = await newDoc.save()
        files.push({ name: `split_${i + 1}.pdf`, bytes: out.buffer as ArrayBuffer })
        transfers.push(out.buffer as ArrayBuffer)
      }
      ok(id, files, transfers)
      return
    }

    if (payload.type === 'watermark') {
      const doc = await PDFDocument.load(payload.bytes)
      const pages = doc.getPages()
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const color = hexToRgbTuple(payload.color)
      for (const page of pages) {
        const { width, height } = page.getSize()
        page.drawText(payload.text, {
          x: width / 2 - (payload.text.length * payload.size * 0.3),
          y: height / 2,
          size: payload.size,
          font,
          color: rgb(color.r, color.g, color.b),
          opacity: 0.3,
          rotate: degrees(-45),
        })
      }
      const out = await doc.save()
      ok(id, out.buffer as ArrayBuffer, [out.buffer as ArrayBuffer])
      return
    }

    throw new Error('不支持的 PDF 命令')
  } catch (error) {
    fail(id, error)
  }
}
