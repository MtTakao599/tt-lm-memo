import { APP_NAME, PROPERTY_NAME } from '../../constants'
import type { Memo, TabId } from '../../types/memo'
import { getTabLabel } from '../../data/tabs'
import { formatDateTime } from '../date'
import { buildHandoverPdfTitle } from '../pdfFileName'
import { createPdfBuilder } from './pdfLayout'

export async function generateMemoListPdf(
  memos: Memo[],
  tab: TabId,
  filtered: boolean,
): Promise<{
  bytes: Uint8Array
  fileName: string
}> {
  const builder = await createPdfBuilder()
  const printedAt = formatDateTime(new Date().toISOString())
  const target = `${getTabLabel(tab)}${filtered ? '（絞り込みあり）' : ''}`

  builder.title(APP_NAME)
  builder.gap(2)
  builder.title(PROPERTY_NAME, 18)
  builder.gap(10)
  builder.field('対象', target)
  builder.field('出力日時', printedAt)
  builder.field('件数', `${memos.length}件`)
  builder.gap(8)

  if (memos.length === 0) {
    builder.note('該当するメモはありません')
  } else {
    for (const [index, memo] of memos.entries()) {
      builder.ensureSpace(96)
      builder.heading(`メモ ${index + 1}`)
      builder.field('棟', memo.building)
      builder.field('階', memo.floor)
      builder.field('場所', memo.location)
      builder.field('区分', memo.category)
      builder.field('状態', memo.status)
      builder.field('引き継ぎ', memo.handover ? 'ON' : 'OFF')
      builder.gap(4)
      builder.heading('本文', 12)
      builder.body(memo.body)
      builder.gap(6)
      builder.field('登録者', memo.author)
      builder.field('登録日時', formatDateTime(memo.createdAt))
      builder.field('更新日時', formatDateTime(memo.updatedAt))
      builder.gap(8)
      await builder.drawPhotos(
        memo.photos.map((photo) => photo.url),
        140,
      )
      builder.gap(10)
    }
  }

  builder.drawPageNumbers()
  const bytes = await builder.doc.save()
  return {
    bytes,
    fileName: `${buildHandoverPdfTitle()}.pdf`,
  }
}
