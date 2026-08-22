import { PROPERTY_NAME } from '../../constants'
import type { Memo } from '../../types/memo'
import { formatDateTime } from '../date'
import { buildSingleMemoPdfTitle } from '../pdfFileName'
import { createPdfBuilder } from './pdfLayout'

export async function generateMemoPdf(memo: Memo): Promise<{
  bytes: Uint8Array
  fileName: string
}> {
  const builder = await createPdfBuilder()

  builder.title('メモ報告')
  builder.gap(2)
  builder.title(PROPERTY_NAME, 18)
  builder.gap(10)
  builder.field('登録日時', formatDateTime(memo.createdAt))
  builder.field('状態', memo.status)
  builder.field('棟', memo.building)
  builder.field('階', memo.floor)
  builder.field('場所', memo.location)
  builder.field('区分', memo.category)
  builder.gap(8)
  builder.heading('本文', 12)
  builder.body(memo.body)
  builder.gap(8)
  builder.field('登録者', memo.author)
  builder.field('更新日時', formatDateTime(memo.updatedAt))
  builder.gap(10)
  await builder.drawPhotos(
    memo.photos.map((photo) => photo.url),
    170,
  )

  builder.drawPageNumbers()
  const bytes = await builder.doc.save()
  return {
    bytes,
    fileName: `${buildSingleMemoPdfTitle({
      propertyName: PROPERTY_NAME,
      building: memo.building,
      location: memo.location,
      createdAt: memo.createdAt,
    })}.pdf`,
  }
}
