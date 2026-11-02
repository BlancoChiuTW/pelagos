// 檔案匯入（M03）：CSV／GeoJSON → 欄（columns）＋列（rows），再由使用者做欄位對應
export interface Table { columns: string[]; rows: string[][] }

/** 簡易 CSV（支援雙引號欄位、逗號／Tab 分隔） */
export function parseCsv(text: string): Table {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim())
  const sep = lines[0]?.includes('\t') ? '\t' : ','
  const split = (line: string) => {
    const out: string[] = []
    let cur = '', q = false
    for (const ch of line) {
      if (ch === '"') q = !q
      else if (ch === sep && !q) { out.push(cur.trim()); cur = '' }
      else cur += ch
    }
    out.push(cur.trim())
    return out
  }
  const [head, ...body] = lines.map(split)
  return { columns: head ?? [], rows: body }
}

/** GeoJSON Point → 表格（經緯度＋所有 properties） */
export function parseGeoJson(text: string): Table {
  const fc = JSON.parse(text) as { features?: { geometry?: { type: string; coordinates: number[] }; properties?: Record<string, unknown> }[] }
  const feats = (fc.features ?? []).filter((f) => f.geometry?.type === 'Point')
  const keys = [...new Set(feats.flatMap((f) => Object.keys(f.properties ?? {})))]
  return {
    columns: ['longitude', 'latitude', ...keys],
    rows: feats.map((f) => [String(f.geometry!.coordinates[0]), String(f.geometry!.coordinates[1]), ...keys.map((k) => String(f.properties?.[k] ?? ''))]),
  }
}

/** 依欄名猜欄位對應（使用者可改） */
export function guessMapping(cols: string[]) {
  const find = (re: RegExp) => cols.findIndex((c) => re.test(c.toLowerCase()))
  return { lon: find(/^(lon|lng|longitude|經度|x)/), lat: find(/^(lat|latitude|緯度|y)/), label: find(/(name|vessel|船|label|id)/), value: find(/(speed|value|tons|魚量|速)/) }
}
