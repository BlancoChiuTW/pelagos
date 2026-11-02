// 船舶主檔欄位（M01）：由船 id 決定的固定假資料；使用者編輯存在 overrides
import type { Vessel } from '../data/types'
import { mulberry32 } from './rng'

export interface VesselProfile {
  regNo: string
  captain: string
  fishingMaster: string
  crew: number
  grossTonnage: number
  built: number
  satPhone: string
}

const SUR = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪']
const GIVEN = ['志明', '建宏', '俊傑', '家豪', '明德', '正雄', '文彬', '國華', '永福', '振興', '信良', '偉成']
const KR = ['Kim Min-su', 'Lee Jae-ho', 'Park Sung-min', 'Choi Dong-hyun', 'Jung Woo-jin']

export function defaultProfile(v: Vessel): VesselProfile {
  let h = 0
  for (const c of v.id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const r = mulberry32(h)
  const p = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  const seiner = v.type === 'purse_seiner'
  return {
    regNo: `CT7-${String(1000 + Math.floor(r() * 8999))}`,
    captain: p(SUR) + p(GIVEN),
    fishingMaster: seiner ? (r() < 0.4 ? p(KR) : p(SUR) + p(GIVEN)) : '—',
    crew: seiner ? 26 + Math.floor(r() * 10) : 18 + Math.floor(r() * 6),
    grossTonnage: seiner ? 1000 + Math.round(r() * 600) : 3000 + Math.round(r() * 2500),
    built: 1998 + Math.floor(r() * 27),
    satPhone: `+870 77${String(Math.floor(r() * 1e7)).padStart(7, '0')}`,
  }
}

export const PROFILE_FIELDS: { key: keyof VesselProfile; label: string; type: 'text' | 'number' }[] = [
  { key: 'regNo', label: '漁船編號', type: 'text' },
  { key: 'captain', label: '船長', type: 'text' },
  { key: 'fishingMaster', label: '漁撈長', type: 'text' },
  { key: 'crew', label: '船員數', type: 'number' },
  { key: 'grossTonnage', label: '總噸位', type: 'number' },
  { key: 'built', label: '建造年', type: 'number' },
  { key: 'satPhone', label: '衛星電話', type: 'text' },
]
