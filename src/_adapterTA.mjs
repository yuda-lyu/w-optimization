import get from 'lodash-es/get.js'
import isnum from 'wsemi/src/isnum.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import arrHas from 'wsemi/src/arrHas.mjs'
import _modifyParameter from './_modifyParameter.mjs'


//_adapterTA, Threshold Accepting meta-optimizer 工廠
//用於把 TA 機制(單點軌跡 + 門檻接受)作為「**控制器**」接入任意最佳化方法之
//funXxxBefore / funXxxAfter 兩個自適應接口。
//
//演算法對映: 對齊 omlTA 之單點搜尋邏輯(隨機鄰點 + ΔF < threshold 確定性接受)
//streaming 場景採用 Geometric Series 衰減(對齊 omlTA Support 版預設), 不採用 Arithmetic / Trapezoid
//(後兩者需預知總迭代數, 不適合 streaming)
//
//跟 _adapterSA 對比:
//  SA: 惡化機率接受 exp(-ΔF/T), 隨機性
//  TA: 惡化門檻接受 ΔF < threshold, 確定性(同 seed 同結果)
//
//schema: caller 提供, 列出要 adapt 的超參數 (格式同 dps: { name, values })
//
//opt:
//  taThresholdInitial: number, 初始門檻, 預設 1
//                      提示: 門檻應跟 fitness 量級匹配, 例 fitness ≈ 1000 時建議 threshold ≈ 10-100
//  taThresholdRatio:   number, 門檻衰減率 (每代 threshold = ratio · threshold), 預設 0.99
//                      值越小衰減越快; 0.99 平緩, 0.6 快(對齊 omlTA Support 版預設)
//  ModeOutLimit:       string, 'mapping' / 'limit' / 'random', 預設 'mapping'
//
//API:
//  suggest()                    —抽一組 params 物件
//  feedback(params, fitness)    —TA 接受判定: ΔF < threshold 則接受, 否則拒絕
//  getCurrent()                 —讀目前 current point
//  getBestEver()                —讀歷史最佳
//  getThreshold()               —讀目前門檻值
//  getSchema()                  —讀目前 schema
function _adapterTA(schema, opt = {}) {

    //taThresholdInitial
    let taThresholdInitial = get(opt, 'taThresholdInitial', '')
    if (!isnum(taThresholdInitial)) {
        taThresholdInitial = 1
    }
    taThresholdInitial = cdbl(taThresholdInitial)

    //taThresholdRatio
    let taThresholdRatio = get(opt, 'taThresholdRatio', '')
    if (!isnum(taThresholdRatio)) {
        taThresholdRatio = 0.99
    }
    taThresholdRatio = cdbl(taThresholdRatio)

    //ModeOutLimit
    let ModeOutLimit = get(opt, 'ModeOutLimit', '')
    if (!arrHas(ModeOutLimit, ['mapping', 'limit', 'random'])) {
        ModeOutLimit = 'mapping'
    }

    //Nd = schema 維度數
    let Nd = schema.length

    //state
    let currentThreshold = taThresholdInitial
    let current = {
        ind: schema.map((s) => randomIntRange(0, s.values.length - 1)),
        fitness: null,
    }
    let proposed = null //待 caller feedback 之鄰點 ind 向量
    let bestEver = null

    //indToParams: ind 向量 → params 物件
    let indToParams = (ind) => {
        let params = {}
        schema.forEach((s, i) => {
            params[s.name] = s.values[ind[i]]
        })
        return params
    }

    //pickNeighbor: 從 current.ind 隨機選一個變數 ±1
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

        //suggest: 第 1 次 yield current; 之後 yield current 之鄰點
        suggest() {
            if (current.fitness === null) {
                proposed = null
                return indToParams(current.ind)
            }
            proposed = pickNeighbor()
            return indToParams(proposed)
        },

        //feedback: ΔF < threshold 接受, 否則拒絕; threshold 每次衰減 ratio
        feedback(params, fitness) {
            if (proposed === null) {
                //第 1 次: 設 current.fitness
                current.fitness = fitness
                bestEver = { ind: [...current.ind], fitness }
                return
            }

            //TA 門檻接受
            let delta = fitness - current.fitness
            if (delta < currentThreshold) {
                //接受(改善 delta<0 必接受; 惡化 delta<threshold 才接受)
                current = { ind: proposed, fitness }
            }
            //else: 拒絕, current 保持

            //threshold 衰減
            currentThreshold = currentThreshold * taThresholdRatio

            //更新歷史最佳
            if (bestEver.fitness > current.fitness) {
                bestEver = { ind: [...current.ind], fitness: current.fitness }
            }

            proposed = null
        },

        getCurrent: () => ({ ind: [...current.ind], fitness: current.fitness }),
        getBestEver: () => bestEver ? { ind: [...bestEver.ind], fitness: bestEver.fitness } : null,
        getThreshold: () => currentThreshold,
        getSchema: () => schema,
    }
}


export default _adapterTA
