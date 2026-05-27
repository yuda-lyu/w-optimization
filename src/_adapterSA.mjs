import get from 'lodash-es/get.js'
import isnum from 'wsemi/src/isnum.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import arrHas from 'wsemi/src/arrHas.mjs'
import _modifyParameter from './_modifyParameter.mjs'


//_adapterSA, Simulated Annealing meta-optimizer 工廠
//用於把 SA 機制(單點軌跡 + 溫度退火)作為「**控制器**」接入任意最佳化方法之
//funXxxBefore / funXxxAfter 兩個自適應接口。
//
//演算法對映: 對齊 omlSA 之單點搜尋邏輯(隨機鄰點 + 改善必接受降溫 / 惡化機率接受)
//
//schema: caller 提供, 列出要 adapt 的超參數 (格式同 dps: { name, values })
//
//opt:
//  saInitialTemperature: number, 初始溫度, 預設 1
//                        提示: 溫度應跟 fitness 量級匹配, 例 fitness ≈ 1000 時建議 T ≈ 10-100
//  saAlpha:              number, 溫度衰減率 (改善時 T = α·T), 預設 0.9
//  ModeOutLimit:         string, 'mapping' / 'limit' / 'random', 預設 'mapping'
//
//API:
//  suggest()                    —抽一組 params 物件(第 1 次為隨機初始, 之後為當前點之鄰點)
//  feedback(params, fitness)    —SA 接受判定: 改善必接受+降溫; 惡化機率接受 exp(-ΔF/T)
//  getCurrent()                 —讀目前 current point (除錯/觀察用)
//  getBestEver()                —讀歷史最佳 (除錯/觀察用)
//  getTemperature()             —讀目前溫度
//  getSchema()                  —讀目前 schema
function _adapterSA(schema, opt = {}) {

    //saInitialTemperature
    let saInitialTemperature = get(opt, 'saInitialTemperature', '')
    if (!isnum(saInitialTemperature)) {
        saInitialTemperature = 1
    }
    saInitialTemperature = cdbl(saInitialTemperature)

    //saAlpha
    let saAlpha = get(opt, 'saAlpha', '')
    if (!isnum(saAlpha)) {
        saAlpha = 0.9
    }
    saAlpha = cdbl(saAlpha)

    //ModeOutLimit
    let ModeOutLimit = get(opt, 'ModeOutLimit', '')
    if (!arrHas(ModeOutLimit, ['mapping', 'limit', 'random'])) {
        ModeOutLimit = 'mapping'
    }

    //Nd = schema 維度數
    let Nd = schema.length

    //state
    let temperature = saInitialTemperature
    let current = {
        ind: schema.map((s) => randomIntRange(0, s.values.length - 1)),
        fitness: null,
    }
    let proposed = null //待 caller feedback 之鄰點 ind 向量, null 表示尚未進入 SA 主迴圈
    let bestEver = null

    //indToParams: ind 向量 → params 物件
    let indToParams = (ind) => {
        let params = {}
        schema.forEach((s, i) => {
            params[s.name] = s.values[ind[i]]
        })
        return params
    }

    //pickNeighbor: 從 current.ind 隨機選一個變數 ±1, 對應 omlSA / omlTA 之 RandPickNeighbor
    let pickNeighbor = () => {
        let ind = [...current.ind]
        let i = randomIntRange(0, Nd - 1)
        let k = (Math.random() < 0.5) ? -1 : 1
        let j = ind[i] + k
        j = _modifyParameter(j, schema[i].values.length - 1, ModeOutLimit)
        ind[i] = j
        return ind
    }

    return {

        //suggest: 第 1 次 yield current (初始隨機 ind); 之後 yield current 之鄰點
        suggest() {
            if (current.fitness === null) {
                //第 1 次: yield current (尚未算 fitness)
                proposed = null
                return indToParams(current.ind)
            }
            //後續: 隨機鄰點
            proposed = pickNeighbor()
            return indToParams(proposed)
        },

        //feedback: 用 SA 接受機制更新 current(改善必接受+降溫; 惡化機率接受)
        feedback(params, fitness) {
            if (proposed === null) {
                //第 1 次: 設 current.fitness
                current.fitness = fitness
                bestEver = { ind: [...current.ind], fitness }
                return
            }

            //後續: SA 接受判定
            let delta = fitness - current.fitness
            if (delta < 0) {
                //改善 → 必接受, 降溫
                current = { ind: proposed, fitness }
                temperature = saAlpha * temperature
            }
            else {
                //惡化 → 機率接受 exp(-ΔF/T)
                if (Math.random() < Math.exp(-delta / temperature)) {
                    current = { ind: proposed, fitness }
                }
                //else: 拒絕, current 保持不變
            }

            //更新歷史最佳
            if (bestEver.fitness > current.fitness) {
                bestEver = { ind: [...current.ind], fitness: current.fitness }
            }

            proposed = null
        },

        getCurrent: () => ({ ind: [...current.ind], fitness: current.fitness }),
        getBestEver: () => bestEver ? { ind: [...bestEver.ind], fitness: bestEver.fitness } : null,
        getTemperature: () => temperature,
        getSchema: () => schema,
    }
}


export default _adapterSA
