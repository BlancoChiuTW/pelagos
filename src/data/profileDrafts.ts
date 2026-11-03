import { create } from 'zustand'
import type { VesselProfile } from '../sim/profile'

// 僅保留本次工作階段；不將未儲存內容混入正式主檔。
export const useProfileDrafts = create<{
  drafts: Record<string, VesselProfile>
  put: (id: string, draft: VesselProfile) => void
  clear: (id: string) => void
}>(set => ({
  drafts: {},
  put: (id, draft) => set(s => ({ drafts: { ...s.drafts, [id]: draft } })),
  clear: id => set(s => { const drafts = { ...s.drafts }; delete drafts[id]; return { drafts } }),
}))
