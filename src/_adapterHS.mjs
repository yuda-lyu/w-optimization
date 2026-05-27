import get from 'lodash-es/get.js'
import sortBy from 'lodash-es/sortBy.js'
import isnum from 'wsemi/src/isnum.mjs'
import ispint from 'wsemi/src/ispint.mjs'
import cint from 'wsemi/src/cint.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import arrHas from 'wsemi/src/arrHas.mjs'
import _modifyParameter from './_modifyParameter.mjs'


//_adapterHS, Harmony Search meta-optimizer 工廠
//用於把 HS 機制(memory + Harmony Memory Consideration + Pitch Adjustment)作為「**控制器**」接入任意
//最佳化方法之 funXxxBefore / funXxxAfter 兩個自適應接口。
//
//演算法對映: 對齊 omlHS 之 runHMCImpro 邏輯(7 HMC + 12 PA), 共享 memory state(streaming-friendly)
//
//schema: caller 提供, 列出要 adapt 的超參數 (格式同 dps: { name, values })
//  - 數值型參數: values = 預先離散化的數列, 例 w.rang(0, 2, 21) = [0, 0.1, ..., 2.0]
//  - 列舉型參數: values = enum 陣列, 例 ['1R2RR', '1B2RR', ...]
//
//opt:
//  Ns:              number, Harmony Memory Size, 預設 10
//  hsHMCR:          number, Memory Consideration Rate [0, 1], 預設 0.9
//  hsPAR:           number, Pitch Adjustment Rate [0, 1], 預設 0.3
//  hsHMC:           string, HMC 模式 ('Original' / '2M' / '2MB' / '3M' / '3MB' / '4M' / '4MB' Consideration), 預設 'Original'
//  hsPA:            string, PA  模式 ('Constant1/2/3' / 'Linear0.1/0.2/0.3' / 'Exponent0.1/0.2/0.3' / 'Global Space' / 'Available Space' / 'Modified Global Best'), 預設 'Linear0.1'
//  ModeOutLimit:    string, 'Mapping' / 'Limit' / 'Random', 預設 'Mapping'
//
//API:
//  suggest()                    —抽一組 params 物件(初始化階段 Ns 次走隨機, 之後走 HMC+PA)
//  feedback(params, fitness)    —用 fitness 更新 memory(若比最差好則替換)
//  getMemory()                  —讀目前 memory (除錯/觀察用)
//  getSchema()                  —讀目前 schema (除錯/觀察用)
function _adapterHS(schema, opt = {}) {

    //Ns
    let Ns = get(opt, 'Ns', '')
    if (!ispint(Ns)) {
        Ns = 10
    }
    Ns = cint(Ns)

    //hsHMCR
    let hsHMCR = get(opt, 'hsHMCR', '')
    if (!isnum(hsHMCR)) {
        hsHMCR = 0.9
    }
    hsHMCR = cdbl(hsHMCR)

    //hsPAR
    let hsPAR = get(opt, 'hsPAR', '')
    if (!isnum(hsPAR)) {
        hsPAR = 0.3
    }
    hsPAR = cdbl(hsPAR)

    //hsHMC
    let hsHMC = get(opt, 'hsHMC', '')
    let hmcList = ['Original', '2M Consideration', '2MB Consideration', '3M Consideration', '3MB Consideration', '4M Consideration', '4MB Consideration']
    if (!arrHas(hsHMC, hmcList)) {
        hsHMC = 'Original'
    }

    //hsPA
    let hsPA = get(opt, 'hsPA', '')
    let paList = ['Constant1', 'Constant2', 'Constant3', 'Linear0.1', 'Linear0.2', 'Linear0.3', 'Exponent0.1', 'Exponent0.2', 'Exponent0.3', 'Global Space', 'Available Space', 'Modified Global Best']
    if (!arrHas(hsPA, paList)) {
        hsPA = 'Linear0.1'
    }

    //ModeOutLimit
    let ModeOutLimit = get(opt, 'ModeOutLimit', '')
    if (!arrHas(ModeOutLimit, ['Mapping', 'Limit', 'Random'])) {
        ModeOutLimit = 'Mapping'
    }

    //Ns 最低需求檢查(對齊 omlHS)
    let hmcNsMin = {
        'Original': 1,
        '2M Consideration': 2,
        '2MB Consideration': 2,
        '3M Consideration': 3,
        '3MB Consideration': 3,
        '4M Consideration': 4,
        '4MB Consideration': 4,
    }
    if (Ns < hmcNsMin[hsHMC]) {
        throw new Error(`Ns[${Ns}] is less than the minimum[${hmcNsMin[hsHMC]}] required by hsHMC[${hsHMC}]`)
    }

    //Nd = schema 維度數
    let Nd = schema.length

    //memory: Ns 個個體, 每個含 ind[] (各 schema item 的 idx) + fitness
    //初始為空, suggest 階段 1 收滿 Ns 個後 sortBy
    let memory = []
    let initFilled = 0 //已收幾個 init 個體
    let proposedInd = null //待 feedback 之當前提案 ind 向量

    //pickMemoryIdxDiff: 從 memory 抽一個不在 excludes 內之 idx
    let pickMemoryIdxDiff = (excludes = []) => {
        let excSet = new Set(excludes)
        let ia = randomIntRange(0, Ns - 1)
        let safety = 0
        while (excSet.has(ia)) {
            ia = randomIntRange(0, Ns - 1)
            safety++
            if (safety > Ns * 10) break
        }
        return ia
    }

    //hmcImpro: 對單一 schema item i, 從 memory 抽 ind (依 hsHMC 模式)
    //memory 已 sortBy fitness, 故 memory[0] 為最佳
    let hmcImpro = (i) => {
        let j = 0
        if (hsHMC === 'Original') {
            let k = randomIntRange(0, Ns - 1)
            j = memory[k].ind[i]
        }
        else if (hsHMC === '2M Consideration') {
            let ia = randomIntRange(0, Ns - 1)
            let ib = pickMemoryIdxDiff([ia])
            j = Math.round(0.6 * memory[ia].ind[i] + 0.6 * memory[ib].ind[i])
        }
        else if (hsHMC === '2MB Consideration') {
            let ia = 0
            let ib = pickMemoryIdxDiff([ia])
            j = Math.round(0.6 * memory[ia].ind[i] + 0.6 * memory[ib].ind[i])
        }
        else if (hsHMC === '3M Consideration') {
            let ia = randomIntRange(0, Ns - 1)
            let ib = pickMemoryIdxDiff([ia])
            let ic = pickMemoryIdxDiff([ia, ib])
            j = Math.round(-0.4 * memory[ia].ind[i] + 0.5 * memory[ib].ind[i] + 0.7 * memory[ic].ind[i])
        }
        else if (hsHMC === '3MB Consideration') {
            let ia = 0
            let ib = pickMemoryIdxDiff([ia])
            let ic = pickMemoryIdxDiff([ia, ib])
            j = Math.round(-0.4 * memory[ia].ind[i] + 0.5 * memory[ib].ind[i] + 0.7 * memory[ic].ind[i])
        }
        else if (hsHMC === '4M Consideration') {
            let ia = randomIntRange(0, Ns - 1)
            let ib = pickMemoryIdxDiff([ia])
            let ic = pickMemoryIdxDiff([ia, ib])
            let id = pickMemoryIdxDiff([ia, ib, ic])
            j = Math.round(0.2 * memory[ia].ind[i] - 0.6 * memory[ib].ind[i] + 0.5 * memory[ic].ind[i] + 0.7 * memory[id].ind[i])
        }
        else if (hsHMC === '4MB Consideration') {
            let ia = 0
            let ib = pickMemoryIdxDiff([ia])
            let ic = pickMemoryIdxDiff([ia, ib])
            let id = pickMemoryIdxDiff([ia, ib, ic])
            j = Math.round(0.2 * memory[ia].ind[i] - 0.6 * memory[ib].ind[i] + 0.5 * memory[ic].ind[i] + 0.7 * memory[id].ind[i])
        }
        return j
    }

    //paAdjust: 對單一 schema item i, 對 j 做 Pitch Adjustment (依 hsPA 模式)
    let paAdjust = (i, j) => {
        let n = schema[i].values.length

        if (hsPA === 'Constant1') {
            let im = 1
            return (Math.random() < 0.5) ? j + im : j - im
        }
        else if (hsPA === 'Constant2') {
            let im = randomIntRange(1, 2)
            return (Math.random() < 0.5) ? j + im : j - im
        }
        else if (hsPA === 'Constant3') {
            let im = randomIntRange(1, 3)
            return (Math.random() < 0.5) ? j + im : j - im
        }
        else if (hsPA === 'Linear0.1') {
            let im = randomIntRange(1, Math.round(0.1 * n) + 1)
            return (Math.random() < 0.5) ? j + im : j - im
        }
        else if (hsPA === 'Linear0.2') {
            let im = randomIntRange(1, Math.round(0.2 * n) + 1)
            return (Math.random() < 0.5) ? j + im : j - im
        }
        else if (hsPA === 'Linear0.3') {
            let im = randomIntRange(1, Math.round(0.3 * n) + 1)
            return (Math.random() < 0.5) ? j + im : j - im
        }
        else if (hsPA === 'Exponent0.1') {
            let im = Math.floor(Math.pow(0.1 * n + 1, Math.random()))
            return (Math.random() < 0.5) ? j + im : j - im
        }
        else if (hsPA === 'Exponent0.2') {
            let im = Math.floor(Math.pow(0.2 * n + 1, Math.random()))
            return (Math.random() < 0.5) ? j + im : j - im
        }
        else if (hsPA === 'Exponent0.3') {
            let im = Math.floor(Math.pow(0.3 * n + 1, Math.random()))
            return (Math.random() < 0.5) ? j + im : j - im
        }
        else if (hsPA === 'Global Space') {
            return randomIntRange(0, n - 1)
        }
        else if (hsPA === 'Available Space') {
            //從 memory 該變數 ind 的 [min, max] 範圍內隨機
            let iMax = memory[0].ind[i]
            let iMin = memory[0].ind[i]
            for (let k = 1; k < Ns; k++) {
                if (iMax < memory[k].ind[i]) iMax = memory[k].ind[i]
                if (iMin > memory[k].ind[i]) iMin = memory[k].ind[i]
            }
            if (Math.random() < 0.5) {
                let lo = Math.min(j, iMax)
                let hi = Math.max(j, iMax)
                return randomIntRange(lo, hi)
            }
            else {
                let lo = Math.min(j, iMin)
                let hi = Math.max(j, iMin)
                return randomIntRange(lo, hi)
            }
        }
        else if (hsPA === 'Modified Global Best') {
            //取目前最佳之該變數 ind
            return memory[0].ind[i]
        }
        return j
    }

    //indToParams: ind 向量 → params 物件
    let indToParams = (ind) => {
        let params = {}
        schema.forEach((s, i) => {
            params[s.name] = s.values[ind[i]]
        })
        return params
    }

    //paramsToInd: params 物件 → ind 向量
    let paramsToInd = (params) => {
        return schema.map((s) => s.values.indexOf(params[s.name]))
    }

    return {

        //suggest: 階段 1 (initFilled < Ns) 隨機填滿 memory; 階段 2 用 HMC + PA 產生新和聲
        suggest() {

            if (initFilled < Ns) {
                //階段 1: 隨機初始化, 收 Ns 個 fitness 後才能進入 HMC/PA 階段
                proposedInd = schema.map((s) => randomIntRange(0, s.values.length - 1))
                return indToParams(proposedInd)
            }

            //階段 2: 用 HMC + PA 產生新和聲
            proposedInd = []
            for (let i = 0; i < Nd; i++) {

                let n = schema[i].values.length
                let j = 0

                if (Math.random() < hsHMCR) {
                    //HMC: 從 memory 取
                    j = hmcImpro(i)

                    //PAR: Pitch Adjustment
                    if (Math.random() < hsPAR) {
                        j = paAdjust(i, j)
                    }
                }
                else {
                    //1 - HMCR: 完全隨機
                    j = randomIntRange(0, n - 1)
                }

                //Limit
                j = _modifyParameter(j, n - 1, ModeOutLimit)

                proposedInd.push(j)
            }

            return indToParams(proposedInd)
        },

        //feedback: 階段 1 收集 init 個體填 memory; 階段 2 若新和聲比最差好則替換
        feedback(params, fitness) {

            let inputInd = (proposedInd !== null) ? proposedInd : paramsToInd(params)

            if (initFilled < Ns) {
                //階段 1: 填 memory
                memory.push({ ind: inputInd, fitness })
                initFilled++
                if (initFilled === Ns) {
                    //memory 收滿 → sortBy fitness, memory[0] 最佳, memory[Ns-1] 最差
                    memory = sortBy(memory, 'fitness')
                }
            }
            else {
                //階段 2: 比 memory 最差好則替換
                if (memory[Ns - 1].fitness > fitness) {
                    memory[Ns - 1] = { ind: inputInd, fitness }
                    memory = sortBy(memory, 'fitness')
                }
            }

            proposedInd = null
        },

        getMemory: () => memory,
        getSchema: () => schema,
    }
}


export default _adapterHS
