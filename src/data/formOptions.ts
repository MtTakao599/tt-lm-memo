import type { Status } from '../types/memo'

export const BUILDINGS = [
  'AE棟',
  'AW棟',
  'B棟',
  'C棟',
  'D棟',
  'E棟',
  'F棟',
  'G棟',
  'H棟',
  'I棟',
  'J棟',
  '共用棟',
] as const

export const FLOORS = [
  'B1F',
  '1F',
  '2F',
  '3F',
  '4F',
  '5F',
  '6F',
  '7F',
  '8F',
  '9F',
  '10F',
  '11F',
  '12F',
  '13F',
  '14F',
  'その他',
] as const

export const LOCATIONS = [
  'エントランス',
  '共用廊下',
  'エレベーターホール',
  '駐車場',
  '駐輪場',
  'ゴミ置場',
  '管理センター',
  'その他',
] as const

export const CATEGORIES = [
  '設備',
  '清掃',
  '警備',
  '居住者対応',
  '業者対応',
  'その他',
] as const

export const STATUSES: Status[] = ['未対応', '対応中', '完了']
