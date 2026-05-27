import get from 'lodash-es/get.js'
import isnum from 'wsemi/src/isnum.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import _pickByWeights from './_pickByWeights.mjs'


//_adapterACO, ACO meta-optimizer 工廠
//用於把 ACO 機制(pheromone 加權抽選 + fitness 強化)作為「**控制器**」接入任意最佳化方法之
//funXxxBefore / funXxxAfter 兩個自適應接口。
//
//演算法對映: 對齊 omlACO 之 runBehavior + pheromoneUpdate 邏輯(凸組合公式 + Exploitation/Exploration
//定義同 ACO 標準理論),不採用 VB AE_ACO_Support_* 之累加公式與顛倒命名。
//
//schema: caller 提供, 列出要 adapt 的超參數 (D1 風格 — 完全由 caller 控制顆粒度)
//格式同 dps: { name: string, values: Array }
//  - 數值型參數: values = 預先離散化的數列, 例 w.rang(0, 2, 21) = [0, 0.1, ..., 2.0]
//  - 列舉型參數: values = enum 陣列, 例 ['1R2RR', '1B2RR', ...]
//caller 完全控制離散化顆粒度與候選清單
//
//opt:
//  acoExploitationRate: number, 開發(按 pheromone 加權選有 pheromone 者) vs 探索(隨機選沒 pheromone 者)比例, 預設 0.8
//  acoAlpha:            number, pheromone 更新率(凸組合 (1-α)·old + α·reward), 預設 0.1
//
//API:
//  suggest()                     —抽一組 params 物件, 對應 omlACO 單一螞蟻路徑
//  feedback(params, fitness)     —用 fitness 強化 params 對應之 pheromone 位置
//  getPheromones()               —讀目前 pheromone 二維陣列 (除錯/觀察用)
//  getSchema()                   —讀目前 schema (除錯/觀察用)
function _adapterACO(schema, opt = {}) {

    //acoExploitationRate
    let acoExploitationRate = get(opt, 'acoExploitationRate', '')
    if (!isnum(acoExploitationRate)) {
        acoExploitationRate = 0.8
    }
    acoExploitationRate = cdbl(acoExploitationRate)

    //acoAlpha
    let acoAlpha = get(opt, 'acoAlpha', '')
    if (!isnum(acoAlpha)) {
        acoAlpha = 0.1
    }
    acoAlpha = cdbl(acoAlpha)

    //對每個 schema item 維護 pheromone 陣列(長度 = values 陣列長度)
    let pheromones = schema.map((s) => {
        return new Array(s.values.length).fill(0)
    })

    //idx → 實際值
    let idxToValue = (s, idx) => {
        return s.values[idx]
    }

    //實際值 → idx
    let valueToIdx = (s, value) => {
        return s.values.indexOf(value)
    }

    return {

        //suggest, 按 pheromone 加權抽一組 params(對應 omlACO 之 runBehavior 單一螞蟻邏輯)
        suggest() {

            let params = {}

            schema.forEach((s, i) => {

                let pn = pheromones[i].length

                //計算沒費洛蒙的節點數
                let noPheromoneN = 0
                for (let j = 0; j < pn; j++) {
                    if (pheromones[i][j] === 0) {
                        noPheromoneN++
                    }
                }

                let idx

                if (Math.random() < acoExploitationRate) {
                    //Exploitation 開發: 選有費洛蒙的節點(按權重)
                    if (noPheromoneN === pn) {
                        //全部都沒費洛蒙 → 隨機任一
                        idx = randomIntRange(0, pn - 1)
                    }
                    else {
                        //至少有1點有費洛蒙 → 按權重加權挑選
                        idx = _pickByWeights(pheromones[i], Math.random())
                    }
                }
                else {
                    //Exploration 探索: 選沒費洛蒙的節點
                    if (noPheromoneN === pn || noPheromoneN === 0) {
                        //全部沒 / 全部有費洛蒙 → 隨機任一
                        idx = randomIntRange(0, pn - 1)
                    }
                    else {
                        //收集沒費洛蒙的節點清單, 隨機選一
                        let excList = []
                        for (let jj = 0; jj < pn; jj++) {
                            if (pheromones[i][jj] === 0) {
                                excList.push(jj)
                            }
                        }
                        idx = excList[randomIntRange(0, excList.length - 1)]
                    }
                }

                params[s.name] = idxToValue(s, idx)
            })

            return params
        },

        //feedback, 用本次 fitness 強化 params 對應之 pheromone(對應 omlACO 之 pheromoneUpdate)
        feedback(params, fitness) {

            //rPheromone: fitness 越小, pheromone 強化越大
            let rPheromone
            if (fitness >= 1) {
                rPheromone = 1 / fitness
            }
            else {
                //對齊 omlACO: rPh = exp(fitness)/exp(1), 再取 1/rPh = exp(1)/exp(fitness) = exp(1-fitness)
                rPheromone = Math.exp(1 - fitness)
            }

            schema.forEach((s, i) => {
                let idx = valueToIdx(s, params[s.name])
                if (idx >= 0 && idx < pheromones[i].length) {
                    //凸組合公式(對齊 omlACO 主版, 非 VB Support 版之累加公式)
                    pheromones[i][idx] = (1 - acoAlpha) * pheromones[i][idx] + acoAlpha * rPheromone
                }
            })
        },

        getPheromones: () => pheromones,

        getSchema: () => schema,

    }
}


export default _adapterACO
