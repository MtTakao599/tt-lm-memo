import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from 'pdf-lib'
import fontkit from 'pdf-fontkit'
import { loadJapaneseFontBytes } from './loadJapaneseFont'

export const PAGE_WIDTH = 595.28
export const PAGE_HEIGHT = 841.89
export const PAGE_MARGIN = 48
export const FOOTER_HEIGHT = 32

const TEXT_COLOR = rgb(0.08, 0.08, 0.08)
const MUTED_COLOR = rgb(0.25, 0.25, 0.25)
const PHOTO_FAIL_MESSAGE = '写真を読み込めませんでした'

export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n')
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('')
      continue
    }

    let current = ''
    for (const char of paragraph) {
      const next = current + char
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next
        continue
      }
      if (current) {
        lines.push(current)
        current = char
        continue
      }
      lines.push(char)
      current = ''
    }
    if (current) {
      lines.push(current)
    }
  }

  return lines.length > 0 ? lines : ['']
}

type PhotoSlot =
  | { ok: true; image: PDFImage }
  | { ok: false }

export class PdfBuilder {
  readonly doc: PDFDocument
  readonly font: PDFFont
  private pages: PDFPage[] = []
  private page: PDFPage
  private y: number

  constructor(doc: PDFDocument, font: PDFFont) {
    this.doc = doc
    this.font = font
    this.page = this.addPage()
    this.y = PAGE_HEIGHT - PAGE_MARGIN
  }

  get contentWidth(): number {
    return PAGE_WIDTH - PAGE_MARGIN * 2
  }

  remainingHeight(): number {
    return this.y - (PAGE_MARGIN + FOOTER_HEIGHT)
  }

  ensureSpace(height: number) {
    if (this.remainingHeight() < height) {
      this.startNewPage()
    }
  }

  startNewPage() {
    this.page = this.addPage()
    this.y = PAGE_HEIGHT - PAGE_MARGIN
  }

  gap(height: number) {
    if (this.remainingHeight() < height) {
      this.startNewPage()
      return
    }
    this.y -= height
  }

  title(text: string, size = 26) {
    this.drawLines(text, size, size * 1.35)
  }

  heading(text: string, size = 16) {
    this.ensureSpace(size * 1.8)
    this.drawLines(text, size, size * 1.4)
  }

  body(text: string, size = 13) {
    this.drawLines(text, size, size * 1.5)
  }

  note(text: string, size = 11) {
    this.drawLines(text, size, size * 1.4, MUTED_COLOR)
  }

  field(label: string, value: string, size = 12) {
    const labelWidth = 78
    const valueWidth = this.contentWidth - labelWidth
    const lineHeight = size * 1.4
    const lines = wrapText(value || '—', this.font, size, valueWidth)

    for (let index = 0; index < lines.length; index += 1) {
      this.ensureSpace(lineHeight)
      const baseline = this.y - size
      if (index === 0) {
        this.page.drawText(label, {
          x: PAGE_MARGIN,
          y: baseline,
          size,
          font: this.font,
          color: MUTED_COLOR,
        })
      }
      const line = lines[index]
      if (line) {
        this.page.drawText(line, {
          x: PAGE_MARGIN + labelWidth,
          y: baseline,
          size,
          font: this.font,
          color: TEXT_COLOR,
        })
      }
      this.y -= lineHeight
    }
  }

  async drawPhotos(urls: string[], maxCellHeight = 150) {
    this.heading(urls.length > 0 ? `写真（${urls.length}枚）` : '写真', 12)
    if (urls.length === 0) {
      this.note('写真なし')
      return
    }

    const slots = await Promise.all(urls.map((url) => this.embedPhoto(url)))
    const gap = 10
    const cellWidth = (this.contentWidth - gap) / 2

    for (let index = 0; index < slots.length; index += 2) {
      const left = this.measurePhoto(slots[index], cellWidth, maxCellHeight)
      const right = slots[index + 1]
        ? this.measurePhoto(slots[index + 1], cellWidth, maxCellHeight)
        : null
      const rowHeight = Math.max(left.height, right?.height ?? 0)
      this.ensureSpace(rowHeight + 8)
      this.drawPhotoSlot(left, PAGE_MARGIN)
      if (right) {
        this.drawPhotoSlot(right, PAGE_MARGIN + cellWidth + gap)
      }
      this.y -= rowHeight + 8
    }
  }

  drawPageNumbers() {
    const total = this.pages.length
    const size = 11
    this.pages.forEach((page, index) => {
      const label = `${index + 1} / ${total}`
      const width = this.font.widthOfTextAtSize(label, size)
      page.drawText(label, {
        x: (PAGE_WIDTH - width) / 2,
        y: 22,
        size,
        font: this.font,
        color: MUTED_COLOR,
      })
    })
  }

  private addPage(): PDFPage {
    const page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    this.pages.push(page)
    return page
  }

  private drawLines(
    text: string,
    size: number,
    lineHeight: number,
    color = TEXT_COLOR,
  ) {
    const lines = wrapText(text, this.font, size, this.contentWidth)
    for (const line of lines) {
      this.ensureSpace(lineHeight)
      if (line) {
        this.page.drawText(line, {
          x: PAGE_MARGIN,
          y: this.y - size,
          size,
          font: this.font,
          color,
        })
      }
      this.y -= lineHeight
    }
  }

  private async embedPhoto(url: string): Promise<PhotoSlot> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        return { ok: false }
      }
      const bytes = new Uint8Array(await response.arrayBuffer())
      const image = await this.doc.embedJpg(bytes)
      return { ok: true, image }
    } catch {
      return { ok: false }
    }
  }

  private measurePhoto(
    slot: PhotoSlot,
    maxWidth: number,
    maxHeight: number,
  ): { slot: PhotoSlot; width: number; height: number } {
    if (!slot.ok) {
      return { slot, width: maxWidth, height: 22 }
    }
    const scale = Math.min(
      maxWidth / slot.image.width,
      maxHeight / slot.image.height,
      1,
    )
    return {
      slot,
      width: slot.image.width * scale,
      height: slot.image.height * scale,
    }
  }

  private drawPhotoSlot(
    item: { slot: PhotoSlot; width: number; height: number },
    x: number,
  ) {
    if (!item.slot.ok) {
      this.page.drawText(PHOTO_FAIL_MESSAGE, {
        x,
        y: this.y - 12,
        size: 10,
        font: this.font,
        color: MUTED_COLOR,
      })
      return
    }
    this.page.drawImage(item.slot.image, {
      x,
      y: this.y - item.height,
      width: item.width,
      height: item.height,
    })
  }
}

export async function createPdfBuilder(): Promise<PdfBuilder> {
  const fontBytes = await loadJapaneseFontBytes()
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit as never)

  let font: PDFFont
  try {
    font = await doc.embedFont(fontBytes, { subset: true })
  } catch {
    font = await doc.embedFont(fontBytes, { subset: false })
  }

  return new PdfBuilder(doc, font)
}
