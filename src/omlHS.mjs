import get from 'lodash-es/get.js'
import size from 'lodash-es/size.js'
import map from 'lodash-es/map.js'
import sortBy from 'lodash-es/sortBy.js'
import cloneDeep from 'lodash-es/cloneDeep.js'
import isnum from 'wsemi/src/isnum.mjs'
import isestr from 'wsemi/src/isestr.mjs'
import ispint from 'wsemi/src/ispint.mjs'
import isbol from 'wsemi/src/isbol.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import cint from 'wsemi/src/cint.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import arrHas from 'wsemi/src/arrHas.mjs'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import _defSolution from './_defSolution.mjs'
import _genSolution from './_genSolution.mjs'
import _modifyParameter from './_modifyParameter.mjs'
import _isSameSolution from './_isSameSolution.mjs'
import _dynamicValue from './_dynamicValue.mjs'
import _localSearch from './_localSearch.mjs'


async function omlHS(dps, funFit, opt = {}) {
    //Harmony Search, 和聲搜尋演算法

    //Ni, 最大Improvisation迭代次數
    let Ni = get(opt, 'Ni', '')
    if (!ispint(Ni)) {
        Ni = 10000
    }
    Ni = cint(Ni)

    //Ns, Harmony Memory Size
    let Ns = get(opt, 'Ns', '')
    if (!ispint(Ns)) {
        Ns = 20
    }
    Ns = cint(Ns)

    //Nd, 設計變數總數
    let Nd = size(dps)

    //NContiguous, 最大最佳解連續未更新次數
    let NContiguous = get(opt, 'NContiguous', '')
    if (!ispint(NContiguous)) {
        NContiguous = 100
    }
    NContiguous = cint(NContiguous)

    //NRepeat, 最大再搜尋次數
    let NRepeat = get(opt, 'NRepeat', '')
    if (!ispint(NRepeat)) {
        NRepeat = 1
    }
    NRepeat = cint(NRepeat)

    //NCore, 最大核心執行次數
    let NCore = get(opt, 'NCore', '')
    if (!ispint(NCore)) {
        NCore = 1000000
    }
    NCore = cint(NCore)

    //ModeOutLimit, 設計變數指標超過範圍之處理方式
    let ModeOutLimit = get(opt, 'ModeOutLimit', '')
    if (!arrHas(ModeOutLimit, ['mapping', 'limit', 'random'])) {
        ModeOutLimit = 'mapping'
    }

    //UseRepeat, 是否使用再搜尋策略
    let UseRepeat = get(opt, 'UseRepeat', '')
    if (!isbol(UseRepeat)) {
        UseRepeat = true
    }

    //UseImmigration, 是否使用移民策略
    let UseImmigration = get(opt, 'UseImmigration', '')
    if (!isbol(UseImmigration)) {
        UseImmigration = true
    }

    //UseLocalSearch, 是否使用局部搜尋策略
    let UseLocalSearch = get(opt, 'UseLocalSearch', '')
    if (!isbol(UseLocalSearch)) {
        UseLocalSearch = true
    }

    //LocalSearchMethod, 局部搜尋方法
    let LocalSearchMethod = get(opt, 'LocalSearchMethod', '')
    if (!arrHas(LocalSearchMethod, ['NelderMead', 'Neighbor', 'OneGold', 'Gold', 'SA', 'TA'])) {
        LocalSearchMethod = 'NelderMead'
    }

    //funGetBetter, 當有更優解出現時呼叫函數
    let funGetBetter = get(opt, 'funGetBetter')

    //funEndImpro, 每次improvisation結束後呼叫函數
    let funEndImpro = get(opt, 'funEndImpro')

    //hsHMCRStart, 初始HMCR (Harmony Memory Consideration Rate)
    let hsHMCRStart = get(opt, 'hsHMCRStart', '')
    if (!isnum(hsHMCRStart)) {
        hsHMCRStart = 0.9
    }
    hsHMCRStart = cdbl(hsHMCRStart)

    //hsHMCREnd, 最終HMCR
    let hsHMCREnd = get(opt, 'hsHMCREnd', '')
    if (!isnum(hsHMCREnd)) {
        hsHMCREnd = 0.9
    }
    hsHMCREnd = cdbl(hsHMCREnd)

    //hsHMCRDynamic, 動態HMCR
    let hsHMCRDynamic = get(opt, 'hsHMCRDynamic', '')
    if (!isnum(hsHMCRDynamic)) {
        hsHMCRDynamic = 0
    }
    hsHMCRDynamic = cdbl(hsHMCRDynamic)

    //hsPARStart, 初始PAR (Pitch Adjustment Rate)
    let hsPARStart = get(opt, 'hsPARStart', '')
    if (!isnum(hsPARStart)) {
        hsPARStart = 0.3
    }
    hsPARStart = cdbl(hsPARStart)

    //hsPAREnd, 最終PAR
    let hsPAREnd = get(opt, 'hsPAREnd', '')
    if (!isnum(hsPAREnd)) {
        hsPAREnd = 0.3
    }
    hsPAREnd = cdbl(hsPAREnd)

    //hsPARDynamic, 動態PAR
    let hsPARDynamic = get(opt, 'hsPARDynamic', '')
    if (!isnum(hsPARDynamic)) {
        hsPARDynamic = 0
    }
    hsPARDynamic = cdbl(hsPARDynamic)

    //hsHMC, Harmony Memory Consideration運算子
    let hsHMC = get(opt, 'hsHMC', '')
    let hsHMCList = [
        'Original',
        '2M Consideration',
        '2MB Consideration',
        '3M Consideration',
        '3MB Consideration',
        '4M Consideration',
        '4MB Consideration',
    ]
    if (!arrHas(hsHMC, hsHMCList)) {
        hsHMC = 'Original'
    }

    //hsPA, Pitch Adjustment運算子
    let hsPA = get(opt, 'hsPA', '')
    let hsPAList = [
        'Constant1',
        'Constant2',
        'Constant3',
        'Linear0.1',
        'Linear0.2',
        'Linear0.3',
        'Exponent0.1',
        'Exponent0.2',
        'Exponent0.3',
        'Global Space',
        'Available Space',
        'Modified Global Best',
    ]
    if (!arrHas(hsPA, hsPAList)) {
        hsPA = 'Linear0.1'
    }

    //Ns最低需求檢查, 確保HMC內取memory index不會undefined
    //2M/2MB需2個不重複, 3M/3MB需3個, 4M/4MB需4個
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

    let iRepeat = 0 //初始化再搜尋次數
    let iContinue = 0 //初始化現在連續未更新次數
    let iExecute = 0 //初始化核心分析次數

    //calcFitness
    let calcFitness = async (_s, from) => {
        iExecute++
        let _ps = map(_s.ps, 'value')
        let f = funFit(_ps)
        if (ispm(f)) {
            f = await f
        }
        let s = {
            ps: _s.ps,
            fitness: f,
        }
        return s
    }

    let bestSolution = null //最佳解
    let hists = [] //求解最佳解之紀錄清單
    let stopMode = '' //觸發停止之機制
    let stopNi = 0 //停止時迭代次數
    let stopExecutions = 0 //停止時核心分析次數

    let memory = []

    //初始化harmony memory
    if (true) {

        for (let k = 0; k < Ns; k++) {

            //_genSolution
            let _s = _genSolution(dps)

            //calcFitness
            let s = await calcFitness(_s, 'init')

            //push
            memory.push(s)

        }

        //sortBy
        memory = sortBy(memory, 'fitness')

        //push
        hists.push(cloneDeep(memory[0]))

        //bestSolution
        bestSolution = cloneDeep(memory[0])

    }

    //pickMemoryIdxDiff, 從memory抽一個不在excludes內之idx
    let pickMemoryIdxDiff = (excludes = []) => {
        let excSet = new Set(excludes)
        let ia = randomIntRange(0, Ns - 1)
        let safety = 0
        while (excSet.has(ia)) {
            ia = randomIntRange(0, Ns - 1)
            safety++
            if (safety > Ns * 10) {
                //極端fallback, hmcNsMin已確保有足夠候選
                break
            }
        }
        return ia
    }

    //runHMCImpro, 即興一個新和聲, 對應AE_HS_HMC
    let runHMCImpro = (hsHMCR, hsPAR) => {

        let s = _defSolution(dps)

        for (let i = 0; i < Nd; i++) {

            let j = 0
            let n = dps[i].n

            //HMCR
            if (Math.random() < hsHMCR) {

                //從memory取ind, 依HMC模式
                if (hsHMC === 'Original') {
                    //隨機抽一個memory個體, 直接複製ind
                    let k = randomIntRange(0, Ns - 1)
                    j = memory[k].ps[i].ind
                }
                else if (hsHMC === '2M Consideration') {
                    let ia = randomIntRange(0, Ns - 1)
                    let ib = pickMemoryIdxDiff([ia])
                    let indexa = memory[ia].ps[i].ind
                    let indexb = memory[ib].ps[i].ind
                    j = Math.round(0.6 * indexa + 0.6 * indexb)
                }
                else if (hsHMC === '2MB Consideration') {
                    let ia = 0 //最佳(memory已sortBy)
                    let ib = pickMemoryIdxDiff([ia])
                    let indexa = memory[ia].ps[i].ind
                    let indexb = memory[ib].ps[i].ind
                    j = Math.round(0.6 * indexa + 0.6 * indexb)
                }
                else if (hsHMC === '3M Consideration') {
                    let ia = randomIntRange(0, Ns - 1)
                    let ib = pickMemoryIdxDiff([ia])
                    let ic = pickMemoryIdxDiff([ia, ib])
                    let indexa = memory[ia].ps[i].ind
                    let indexb = memory[ib].ps[i].ind
                    let indexc = memory[ic].ps[i].ind
                    //修正VB原碼疑似typo: 去除冗餘的 +rRatiod*indexd (預設0皆未指定)
                    j = Math.round(-0.4 * indexa + 0.5 * indexb + 0.7 * indexc)
                }
                else if (hsHMC === '3MB Consideration') {
                    let ia = 0
                    let ib = pickMemoryIdxDiff([ia])
                    let ic = pickMemoryIdxDiff([ia, ib])
                    let indexa = memory[ia].ps[i].ind
                    let indexb = memory[ib].ps[i].ind
                    let indexc = memory[ic].ps[i].ind
                    j = Math.round(-0.4 * indexa + 0.5 * indexb + 0.7 * indexc)
                }
                else if (hsHMC === '4M Consideration') {
                    let ia = randomIntRange(0, Ns - 1)
                    let ib = pickMemoryIdxDiff([ia])
                    let ic = pickMemoryIdxDiff([ia, ib])
                    let id = pickMemoryIdxDiff([ia, ib, ic])
                    let indexa = memory[ia].ps[i].ind
                    let indexb = memory[ib].ps[i].ind
                    let indexc = memory[ic].ps[i].ind
                    let indexd = memory[id].ps[i].ind
                    j = Math.round(0.2 * indexa - 0.6 * indexb + 0.5 * indexc + 0.7 * indexd)
                }
                else if (hsHMC === '4MB Consideration') {
                    let ia = 0
                    let ib = pickMemoryIdxDiff([ia])
                    let ic = pickMemoryIdxDiff([ia, ib])
                    let id = pickMemoryIdxDiff([ia, ib, ic])
                    let indexa = memory[ia].ps[i].ind
                    let indexb = memory[ib].ps[i].ind
                    let indexc = memory[ic].ps[i].ind
                    let indexd = memory[id].ps[i].ind
                    j = Math.round(0.2 * indexa - 0.6 * indexb + 0.5 * indexc + 0.7 * indexd)
                }
                else {
                    throw new Error(`invalid hsHMC[${hsHMC}]`)
                }

                //PAR, Pitch Adjustment
                if (Math.random() < hsPAR) {

                    if (hsPA === 'Constant1') {
                        let im = 1
                        j = (Math.random() < 0.5) ? j + im : j - im
                    }
                    else if (hsPA === 'Constant2') {
                        let im = randomIntRange(1, 2)
                        j = (Math.random() < 0.5) ? j + im : j - im
                    }
                    else if (hsPA === 'Constant3') {
                        let im = randomIntRange(1, 3)
                        j = (Math.random() < 0.5) ? j + im : j - im
                    }
                    else if (hsPA === 'Linear0.1') {
                        let im = randomIntRange(1, Math.round(0.1 * n) + 1)
                        j = (Math.random() < 0.5) ? j + im : j - im
                    }
                    else if (hsPA === 'Linear0.2') {
                        let im = randomIntRange(1, Math.round(0.2 * n) + 1)
                        j = (Math.random() < 0.5) ? j + im : j - im
                    }
                    else if (hsPA === 'Linear0.3') {
                        let im = randomIntRange(1, Math.round(0.3 * n) + 1)
                        j = (Math.random() < 0.5) ? j + im : j - im
                    }
                    else if (hsPA === 'Exponent0.1') {
                        let im = Math.floor(Math.pow(0.1 * n + 1, Math.random()))
                        j = (Math.random() < 0.5) ? j + im : j - im
                    }
                    else if (hsPA === 'Exponent0.2') {
                        let im = Math.floor(Math.pow(0.2 * n + 1, Math.random()))
                        j = (Math.random() < 0.5) ? j + im : j - im
                    }
                    else if (hsPA === 'Exponent0.3') {
                        let im = Math.floor(Math.pow(0.3 * n + 1, Math.random()))
                        j = (Math.random() < 0.5) ? j + im : j - im
                    }
                    else if (hsPA === 'Global Space') {
                        j = randomIntRange(0, n - 1)
                    }
                    else if (hsPA === 'Available Space') {
                        //從memory該變數ind的[min, max]範圍內隨機
                        let iMax = memory[0].ps[i].ind
                        let iMin = memory[0].ps[i].ind
                        for (let k = 1; k < Ns; k++) {
                            if (iMax < memory[k].ps[i].ind) iMax = memory[k].ps[i].ind
                            if (iMin > memory[k].ps[i].ind) iMin = memory[k].ps[i].ind
                        }
                        //VB原碼假設j∈[iMin,iMax], 但HMC加權計算後j可能跑出範圍, 此處加swap防呆
                        if (Math.random() < 0.5) {
                            let lo = Math.min(j, iMax)
                            let hi = Math.max(j, iMax)
                            j = randomIntRange(lo, hi)
                        }
                        else {
                            let lo = Math.min(j, iMin)
                            let hi = Math.max(j, iMin)
                            j = randomIntRange(lo, hi)
                        }
                    }
                    else if (hsPA === 'Modified Global Best') {
                        //取目前最佳的該變數ind
                        j = memory[0].ps[i].ind
                    }
                    else {
                        throw new Error(`invalid hsPA[${hsPA}]`)
                    }
                }
            }
            else {
                //1-HMCR: 完全隨機
                j = randomIntRange(0, n - 1)
            }

            //Limit
            j = _modifyParameter(j, n - 1, ModeOutLimit)

            //update
            s.ps[i].ind = j
            s.ps[i].value = dps[i].values[j]
        }

        return s
    }

    //搜尋
    let i = -1
    while (true) {
        i++

        //dynamic HMCR
        let hsHMCR = _dynamicValue(hsHMCRStart, hsHMCREnd, hsHMCRDynamic, iContinue, NContiguous)

        //dynamic PAR
        let hsPAR = _dynamicValue(hsPARStart, hsPAREnd, hsPARDynamic, iContinue, NContiguous)

        //Improvisation, 產生1個新和聲
        let _s = runHMCImpro(hsHMCR, hsPAR)

        //calcFitness
        let s = await calcFitness(_s, 'improvisation')

        //Replace: 若新和聲比memory最差好, 替換memory[Ns-1]
        if (memory[Ns - 1].fitness > s.fitness) {
            memory[Ns - 1] = s
            memory = sortBy(memory, 'fitness')
        }

        //push
        hists.push(cloneDeep(memory[0]))

        //bestSolution
        if (bestSolution.fitness > memory[0].fitness) {

            //update
            bestSolution = cloneDeep(memory[0])

            //funGetBetter
            if (isfun(funGetBetter)) {
                funGetBetter(cloneDeep(bestSolution), i)
            }

            iContinue = 0
        }
        else {
            iContinue += 1
        }

        //strategyRepeat, 再搜尋策略
        //若出現更優最佳解, 考量效能故不再更新hists與bestSolution, 待下個迭代時再更新
        let strategyRepeat = async () => {

            //由前往後處理, 不變更當前最佳解memory[0], 故k是從1至Ns-1
            for (let k = 1; k <= Ns - 1; k++) {

                //_genSolution
                let _s = _genSolution(dps)

                //calcFitness
                let s = await calcFitness(_s, 'strategyRepeat')

                //update
                memory[k] = s

            }

            //sortBy
            memory = sortBy(memory, 'fitness')

            //重產非最佳解未必會有更優最佳解, 仍須重置iContinue避免再搜尋策略弱化
            iContinue = 0

            //次數增加
            iRepeat += 1

        }
        if (UseRepeat && iContinue >= NContiguous && iRepeat < NRepeat) {
            await strategyRepeat()
        }

        //strategyImmigration, 移民策略, 對應AE_HS_Strategy_Immigration
        let strategyImmigration = async () => {

            //由後往前處理, 不變更當前最佳解memory[0], 故k是從Ns-1至1
            for (let k = Ns - 1; k >= 1; k--) {
                if (_isSameSolution(memory[k - 1], memory[k])) {

                    //_genSolution
                    let _s = _genSolution(dps)

                    //calcFitness
                    let s = await calcFitness(_s, 'strategyImmigration')

                    //update
                    memory[k] = s

                }
            }

            //sortBy
            memory = sortBy(memory, 'fitness')

        }

        //strategyLocalSearch, 局部搜尋策略
        let strategyLocalSearch = async () => {

            //依LocalSearchMethod分派局部搜尋
            let improved = await _localSearch(LocalSearchMethod, memory[0], dps, funFit, calcFitness, ModeOutLimit)

            //check
            if (improved.fitness >= memory[0].fitness) {
                return
            }

            //update
            memory[0] = improved

        }

        //Strategy: 每Ns次迭代跑一次(對應VB之 If i Mod Ns = 0)
        if ((i + 1) % Ns === 0) {
            if (UseImmigration) {
                await strategyImmigration()
            }
            if (UseLocalSearch) {
                await strategyLocalSearch()
            }
        }

        //stopMode
        if (i >= Ni) {
            stopMode = `stop by Ni[${Ni}]`
        }
        else if (iContinue >= NContiguous) {
            stopMode = `stop by iContinue[${iContinue}] >= NContiguous[${NContiguous}]`
        }
        else if (iExecute >= NCore) {
            stopMode = `stop by iExecute[${iExecute}] >= NCore[${NCore}]`
        }

        //stop
        if (isestr(stopMode)) {
            stopNi = i
            stopExecutions = iExecute
            break
        }

        //funEndImpro
        if (isfun(funEndImpro)) {
            funEndImpro(cloneDeep(memory), cloneDeep(bestSolution), i)
        }

    }

    //r
    let r = {
        bestSolution,
        hists,
        stopMode,
        stopNi,
        stopExecutions,
    }

    return r
}


export default omlHS
