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
import randomIntsNdpRange from 'wsemi/src/randomIntsNdpRange.mjs'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import _defSolution from './_defSolution.mjs'
import _genSolution from './_genSolution.mjs'
import _modifyParameter from './_modifyParameter.mjs'
import _isSameSolution from './_isSameSolution.mjs'
import _dynamicValue from './_dynamicValue.mjs'
import _localSearch from './_localSearch.mjs'


async function omlDE(dps, funFit, opt = {}) {
    //Differential Evolution, 差分演化法

    //Ng, 總世代數
    let Ng = get(opt, 'Ng', '')
    if (!ispint(Ng)) {
        Ng = 10000
    }
    Ng = cint(Ng)

    //Np, 族群個體數
    let Np = get(opt, 'Np', '')
    if (!ispint(Np)) {
        Np = 40
    }
    Np = cint(Np)

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

    //LocalSearchMethod, 局部搜尋方法 ('None' = 不做局部搜尋)
    let LocalSearchMethod = get(opt, 'LocalSearchMethod', '')
    if (!arrHas(LocalSearchMethod, ['None', 'Neighbor', 'TA', 'SA', 'OneGold', 'Gold', 'NelderMead'])) {
        LocalSearchMethod = 'NelderMead'
    }

    //funGetBetter, 當有更優解出現時呼叫函數
    let funGetBetter = get(opt, 'funGetBetter')

    //funGenerationBefore, 每代開頭之自適應接口(可覆寫本代要用的超參數)
    //收 { params, iGeneration, iContinue, iExecute, bestFitness }, 可回傳 { params: { ... 覆寫的 keys } } 或 undefined
    //params 預設為 _dynamicValue 算出來的 deCrossoverFactor / deF / deLanda 加上 deMutation / ModeOutLimit / LocalSearchMethod
    //外部可基於 ctx 用 ACO / Bayesian / RL 等任意方法決定本代用什麼參數
    let funGenerationBefore = get(opt, 'funGenerationBefore')

    //funGenerationAfter, 每代結束後之自適應回饋接口
    //收 { params, iGeneration, iContinue, iExecute, childrenBestFitness, bestFitness }, 不需回傳
    //外部可基於本代 fitness 做 ACO pheromone 更新等學習動作
    let funGenerationAfter = get(opt, 'funGenerationAfter')

    //deCrossoverFactorStart, 初始交配因子
    let deCrossoverFactorStart = get(opt, 'deCrossoverFactorStart', '')
    if (!isnum(deCrossoverFactorStart)) {
        deCrossoverFactorStart = 0.6
    }
    deCrossoverFactorStart = cdbl(deCrossoverFactorStart)

    //deCrossoverFactorEnd, 最終交配因子
    let deCrossoverFactorEnd = get(opt, 'deCrossoverFactorEnd', '')
    if (!isnum(deCrossoverFactorEnd)) {
        deCrossoverFactorEnd = 0.6
    }
    deCrossoverFactorEnd = cdbl(deCrossoverFactorEnd)

    //deCrossoverFactorDynamic, 動態交配因子
    let deCrossoverFactorDynamic = get(opt, 'deCrossoverFactorDynamic', '')
    if (!isnum(deCrossoverFactorDynamic)) {
        deCrossoverFactorDynamic = 0
    }
    deCrossoverFactorDynamic = cdbl(deCrossoverFactorDynamic)

    //deFStart, 初始縮放因子F
    let deFStart = get(opt, 'deFStart', '')
    if (!isnum(deFStart)) {
        deFStart = 0
    }
    deFStart = cdbl(deFStart)

    //deFEnd, 最終縮放因子F
    let deFEnd = get(opt, 'deFEnd', '')
    if (!isnum(deFEnd)) {
        deFEnd = 1
    }
    deFEnd = cdbl(deFEnd)

    //deFDynamic, 動態縮放因子F
    let deFDynamic = get(opt, 'deFDynamic', '')
    if (!isnum(deFDynamic)) {
        deFDynamic = 1
    }
    deFDynamic = cdbl(deFDynamic)

    //deLandaStart, 初始縮放因子Landa
    let deLandaStart = get(opt, 'deLandaStart', '')
    if (!isnum(deLandaStart)) {
        deLandaStart = 0
    }
    deLandaStart = cdbl(deLandaStart)

    //deLandaEnd, 最終縮放因子Landa
    let deLandaEnd = get(opt, 'deLandaEnd', '')
    if (!isnum(deLandaEnd)) {
        deLandaEnd = 0
    }
    deLandaEnd = cdbl(deLandaEnd)

    //deLandaDynamic, 動態縮放因子Landa
    let deLandaDynamic = get(opt, 'deLandaDynamic', '')
    if (!isnum(deLandaDynamic)) {
        deLandaDynamic = 0
    }
    deLandaDynamic = cdbl(deLandaDynamic)

    //deMutation, 突變運算子
    let deMutation = get(opt, 'deMutation', '')
    if (!arrHas(deMutation, ['1R2RR', '1B2RR', '1R2BR', '1R4RRRR', '1B4RRRR', '1R4BRRR', '1S4BSRR'])) {
        deMutation = '1B2RR'
    }

    //Np最低需求檢查, 確保operCrossover內inds取值不會undefined
    let mutationNpMin = {
        '1R2RR': 3,
        '1B2RR': 2,
        '1R2BR': 2,
        '1R4RRRR': 5,
        '1B4RRRR': 4,
        '1R4BRRR': 4,
        '1S4BSRR': 4,
    }
    if (Np < mutationNpMin[deMutation]) {
        throw new Error(`Np[${Np}] is less than the minimum[${mutationNpMin[deMutation]}] required by deMutation[${deMutation}]`)
    }

    let iRepeat = 0 //初始化再搜尋次數
    let iContinue = 0 //初始化現在連續世代數
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
    let stopNg = 0 //停止時世代數
    let stopExecutions = 0 //停止時核心分析次數

    let parents = []
    let children = []

    //初始化族群
    if (true) {

        for (let k = 0; k < Np; k++) {

            //_genSolution
            let _s = _genSolution(dps)

            //calcFitness
            let s = await calcFitness(_s, 'init')

            //push
            parents.push(s)

        }

        //sortBy
        parents = sortBy(parents, 'fitness')

        //push
        hists.push(cloneDeep(parents[0]))

        //bestSolution
        bestSolution = cloneDeep(parents[0])

    }

    //operCrossover
    let operCrossover = (dps, parents, k, opt = {}) => {

        let deMutation = get(opt, 'deMutation', '')
        let deCrossoverFactor = get(opt, 'deCrossoverFactor', '')
        let deF = get(opt, 'deF', '')
        let deLanda = get(opt, 'deLanda', '')
        let ModeOutLimit = get(opt, 'ModeOutLimit', '')

        let ir1 = null
        let ir2 = null
        let ir3 = null
        let ir4 = null
        let ir5 = null

        //s
        let s = _defSolution(dps)

        //inds
        let inds = randomIntsNdpRange(0, Np - 1, Np)

        if (deMutation === '1R2RR') {
            ir1 = inds[0]
            ir2 = inds[1]
            ir3 = inds[2]
        }
        else if (deMutation === '1B2RR') {
            ir1 = 0
            ir2 = inds[0]
            ir3 = inds[1]
        }
        else if (deMutation === '1R2BR') {
            ir1 = inds[0]
            ir2 = 0
            ir3 = inds[1]
        }
        else if (deMutation === '1R4RRRR') {
            ir1 = inds[0]
            ir2 = inds[1]
            ir3 = inds[2]
            ir4 = inds[3]
            ir5 = inds[4]
        }
        else if (deMutation === '1B4RRRR') {
            ir1 = 0
            ir2 = inds[0]
            ir3 = inds[1]
            ir4 = inds[2]
            ir5 = inds[3]
        }
        else if (deMutation === '1R4BRRR') {
            ir1 = inds[0]
            ir2 = 0
            ir3 = inds[1]
            ir4 = inds[2]
            ir5 = inds[3]
        }
        else if (deMutation === '1S4BSRR') {
            ir1 = k
            ir2 = 0
            ir3 = k
            ir4 = inds[2]
            ir5 = inds[3]
        }
        else {
            throw new Error(`invalid deMutation[${deMutation}]`)
        }

        //cp
        let cp = '3p'
        if (size(deMutation) === 7) {
            cp = '5p'
        }

        //ind
        let ind = randomIntRange(0, Nd - 1)

        //各設計變數
        for (let i = 0; i < Nd; i++) {

            //crossover
            if (Math.random() < deCrossoverFactor || i === ind) {

                //mutation j
                let j = null
                if (cp === '3p') {
                    j = Math.round(
                        parents[ir1].ps[i].ind +
                        deF * (parents[ir2].ps[i].ind - parents[ir3].ps[i].ind)
                    )
                }
                else {
                    j = Math.round(
                        parents[ir1].ps[i].ind +
                        deF * (parents[ir2].ps[i].ind - parents[ir3].ps[i].ind) +
                        deLanda * (parents[ir4].ps[i].ind - parents[ir5].ps[i].ind)
                    )
                }

                //_modifyParameter
                j = _modifyParameter(j, dps[i].n - 1, ModeOutLimit)

                //update
                s.ps[i].ind = j
                s.ps[i].value = dps[i].values[j]

            }
            else {

                //Parameter
                s.ps[i].ind = parents[k].ps[i].ind
                s.ps[i].value = parents[k].ps[i].value

            }
        }

        return s
    }

    //搜尋
    let i = -1
    while (true) {
        i++

        //params: 本代要用的超參數, 預設由 _dynamicValue 算出, 外部可透過 funGenerationBefore 覆寫
        let params = {
            deCrossoverFactor: _dynamicValue(deCrossoverFactorStart, deCrossoverFactorEnd, deCrossoverFactorDynamic, iContinue, NContiguous),
            deF: _dynamicValue(deFStart, deFEnd, deFDynamic, iContinue, NContiguous),
            deLanda: _dynamicValue(deLandaStart, deLandaEnd, deLandaDynamic, iContinue, NContiguous),
            deMutation,
            ModeOutLimit,
            LocalSearchMethod,
        }

        //funGenerationBefore: 自適應接口, 讓外部覆寫本代要用的超參數
        if (isfun(funGenerationBefore)) {
            let r = await funGenerationBefore({
                params: cloneDeep(params),
                iGeneration: i,
                iContinue,
                iExecute,
                bestFitness: bestSolution.fitness,
            })
            if (r && r.params) {
                params = { ...params, ...r.params }
            }
        }

        //childrenBestFitness for adapter feedback: 追蹤本代「raw offspring」最佳 fitness
        //避開兩個訊號失真問題:
        //  H2: survivor selection (line 405-410) 會把上代 parents 保留進 children 陣列,
        //      若本代 offspring 全比 parents 差, children[0] 反映的是「上代 parent 的好」,
        //      不是「本代 params 的成果」, adapter 會把 parent credit 誤算給 params
        //  H3: strategyLocalSearch 會改善 children[0], 若直接用 children[0].fitness,
        //      adapter 會把 LS 功勞算到 params 頭上
        //rawOffspringBest 只看 operCrossover 直接產出的 s.fitness, 不受 survivor / LS 干擾
        let childrenBestFitnessForFeedback = Infinity

        for (let k = 0; k < Np; k++) {

            //operCrossover
            let _s = operCrossover(dps, parents, k, params)

            //calcFitness
            let s = await calcFitness(_s, 'operCrossover')

            //追蹤 raw offspring 最佳 fitness (用於 adapter feedback)
            if (s.fitness < childrenBestFitnessForFeedback) {
                childrenBestFitnessForFeedback = s.fitness
            }

            //update children[k]
            if (parents[k].fitness > s.fitness) {
                children[k] = s
            }
            else {
                children[k] = cloneDeep(parents[k])
            }

        }

        //sortBy
        children = sortBy(children, 'fitness')

        //push
        hists.push(cloneDeep(children[0]))

        //bestSolution
        if (bestSolution.fitness > children[0].fitness) {

            //update
            bestSolution = cloneDeep(children[0])

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
        //若出現更優最佳解, 考量效能故不再更新hists與bestSolution, 待下個世代時再更新
        let strategyRepeat = async() => {

            //由前往後處理, 不變更當前最佳解children[0], 故k是從1至Np-1
            for (let k = 1; k <= Np - 1; k++) {

                //_genSolution
                let _s = _genSolution(dps)

                //calcFitness
                let s = await calcFitness(_s, 'strategyRepeat')

                //update
                children[k] = s

            }

            //sortBy
            children = sortBy(children, 'fitness')

            //重產非最佳解未必會有更優最佳解, 仍須重置iContinue避免再搜尋策略弱化
            iContinue = 0

            //次數增加
            iRepeat += 1

        }
        if (UseRepeat && iContinue >= NContiguous && iRepeat < NRepeat) {
            await strategyRepeat()
        }

        //strategyImmigration, 移民策略
        //若出現更優最佳解, 考量效能故不再更新hists與bestSolution, 待下個世代時再更新
        let strategyImmigration = async () => {

            //由後往前處理, 不變更當前最佳解children[0], 故k是從Np-1至1, 因僅處理1次故仍有機率出現重複個體
            //比對ind陣列是否相同(對齊VB AE_Compare), 而非僅比fitness — 後者過鬆會把fitness相同但ind不同之個體誤判
            for (let k = Np - 1; k >= 1; k--) {
                if (_isSameSolution(children[k - 1], children[k])) {

                    //_genSolution
                    let _s = _genSolution(dps)

                    //calcFitness
                    let s = await calcFitness(_s, 'strategyImmigration')

                    //update
                    children[k] = s

                }

            }

            //sortBy
            children = sortBy(children, 'fitness')

        }
        if (UseImmigration) {
            await strategyImmigration()
        }

        //strategyLocalSearch, 局部搜尋策略
        //若出現更優最佳解, 考量效能故不再更新hists與bestSolution, 待下個世代時再更新
        let strategyLocalSearch = async () => {

            //依LocalSearchMethod分派局部搜尋(用本代params, 可被funGenerationBefore覆寫)
            let s = await _localSearch(params.LocalSearchMethod, children[0], dps, funFit, calcFitness, params.ModeOutLimit)

            //check
            if (s.fitness >= children[0].fitness) {
                return
            }

            //update
            children[0] = s

        }
        await strategyLocalSearch()

        //stopMode
        if (i >= Ng) {
            stopMode = `stop by Ng[${Ng}]`
        }
        else if (iContinue >= NContiguous) {
            stopMode = `stop by iContinue[${iContinue}] >= NContiguous[${NContiguous}]`
        }
        else if (iExecute >= NCore) {
            stopMode = `stop by iExecute[${iExecute}] >= NCore[${NCore}]`
        }

        //funGenerationAfter, 自適應回饋接口(收 ctx 含 params 與 childrenBestFitness)
        //放在 stop 判斷之前, 確保末代 suggest() 也有配對 feedback()
        if (isfun(funGenerationAfter)) {
            await funGenerationAfter({
                params: cloneDeep(params),
                iGeneration: i,
                iContinue,
                iExecute,
                childrenBestFitness: childrenBestFitnessForFeedback,
                bestFitness: bestSolution.fitness,
            })
        }

        //stop
        if (isestr(stopMode)) {
            stopNg = i
            stopExecutions = iExecute
            break
        }

        //update parents
        parents = cloneDeep(children)

    }

    //r
    let r = {
        bestSolution,
        hists,
        stopMode,
        stopNg,
        stopIteration: stopNg, //跨演算法通用別名 (omlDE/RGA: stopNg / omlHS: stopNi / omlPSO/ACO: stopNl)
        stopExecutions,
    }

    return r
}


export default omlDE
