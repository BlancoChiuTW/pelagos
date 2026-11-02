import { useStore } from '../store'
import { Panel } from './Panel'
import s from './Legend.module.css'

// 色階與 ETL 一致（etl/fetch_ocean.py 的 SST_STOPS／ANOM_STOPS）
const SST = 'linear-gradient(90deg,#081d58 0%,#253494 28.6%,#225ea8 47.6%,#1d91c0 61.9%,#41b6c4 76.2%,#7fcdbb 85.7%,#edf8b1 90.5%,#fec44f 95.2%,#f03b20 100%)'
const ANOM = 'linear-gradient(90deg,rgba(40,110,255,.9),rgba(60,160,255,.55) 33%,rgba(255,255,255,0) 50%,rgba(255,140,70,.55) 67%,rgba(255,60,60,.9))'

export function Legend() {
  const anomaly = useStore((st) => st.layers.anomaly)
  const sst = useStore((st) => st.layers.sst)
  if (!sst && !anomaly) return null
  return anomaly ? (
    <Panel title="海溫異常" en="SST ANOMALY °C" className={s.legend}>
      <div className={s.bar} style={{ background: ANOM }} />
      <div className={s.ticks}><span>−3</span><span>0</span><span>+3</span></div>
    </Panel>
  ) : (
    <Panel title="海表溫度" en="SST °C" className={s.legend}>
      <div className={s.bar} style={{ background: SST }} />
      <div className={s.ticks}><span>10</span><span>16</span><span>20</span><span>23</span><span>26</span><span>28</span><span>31</span></div>
    </Panel>
  )
}
