/**
 * ATCフライトストリップ風のフライトIDを生成する。
 * 形式: "FS" + 4桁の数字 (例: FS1234, FS0042)
 *
 * @param existingIds - 衝突を避けるための既存IDリスト
 * @returns 一意のフライトID文字列
 */
export function generateFlightId(existingIds: string[] = []): string {
  const existingSet = new Set(existingIds)
  let id: string

  do {
    const num = Math.floor(Math.random() * 10000)
    id = `FS${num.toString().padStart(4, '0')}`
  } while (existingSet.has(id))

  return id
}
