export interface AppTag {
  id: string
  name: string
  /** 6色プリセット hex */
  color: string
  createdAt: string
}

export const TAG_COLORS = [
  '#5B8DEF',
  '#4CAF82',
  '#E87D3E',
  '#C678DD',
  '#E06C75',
  '#ABB2BF',
] as const

export const MAX_TAGS = 12
export const MAX_TAGS_PER_TASK = 3
export const MAX_TAG_NAME_LENGTH = 10
