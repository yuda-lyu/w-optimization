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
import _genSolution from './_genSolution.mjs'
import _isSameSolution from './_isSameSolution.mjs'
import _dynamicValue from './_dynamicValue.mjs'
import _pickByWeights from './_pickByWeights.mjs'
import _localSearch from './_localSearch.mjs'


async function omlACO(dps, funFit, opt = {}) {
    //Ant Colony Optimization, 蟻群最佳化

    //Nl, 最大總迴圈數
    let Nl = get(opt, 'Nl', '')
    if (!ispint(Nl)) {
        Nl = 10000
    }
    Nl = cint(Nl)

    //Na, 螞蟻數
    let Na = get(opt, 'Na', '')
    if (!ispint(Na)) {
        Na = 40
    }
    Na = cint(Na)

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

    //UseRepeat, 是否使用再搜尋策略 (達門檻重產 1..Na-1)
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

    //ModeOutLimit (ACO本身原本沒有此opt, 因LocalSearch helper需要傳入故補上)
    let ModeOutLimit = get(opt, 'ModeOutLimit', '')
    if (!arrHas(ModeOutLimit, ['mapping', 'limit', 'random'])) {
        ModeOutLimit = 'mapping'
    }

    //UseForcedExplore, 是否每代強制重產後半族群Na/2..Na-1 (ACO特有內建探索, VB原碼此分支always-on)
    let UseForcedExplore = get(opt, 'UseForcedExplore', '')
    if (!isbol(UseForcedExplore)) {
        UseForcedExplore = true
    }

    //funGetBetter, 當有更優解出現時呼叫函數
    let funGetBetter = get(opt, 'funGetBetter')

    //funEndLoop, 每次主迴圈結束後呼叫函數
    let funEndLoop = get(opt, 'funEndLoop')

    //funGenerationBefore, 每代開頭之自適應接口(可覆寫本代要用的超參數)
    //收 { params, iGeneration, iContinue, iExecute, bestFitness }, 可回傳 { params: { ... 覆寫的 keys } } 或 undefined
    //params 預設為 _dynamicValue 算出來的 acoExploitationRate / acoAlpha / acoRo 加上 ModeOutLimit / LocalSearchMethod
    let funGenerationBefore = get(opt, 'funGenerationBefore')

    //funGenerationAfter, 每代結束後之自適應回饋接口
    //收 { params, iGeneration, iContinue, iExecute, childrenBestFitness, bestFitness }, 不需回傳
    let funGenerationAfter = get(opt, 'funGenerationAfter')

    //acoExploitationRateStart, 初始開發率 (小=開發, 大=探索)
    let acoExploitationRateStart = get(opt, 'acoExploitationRateStart', '')
    if (!isnum(acoExploitationRateStart)) {
        acoExploitationRateStart = 0.8
    }
    acoExploitationRateStart = cdbl(acoExploitationRateStart)

    //acoExploitationRateEnd, 最終開發率
    let acoExploitationRateEnd = get(opt, 'acoExploitationRateEnd', '')
    if (!isnum(acoExploitationRateEnd)) {
        acoExploitationRateEnd = 0.8
    }
    acoExploitationRateEnd = cdbl(acoExploitationRateEnd)

    //acoExploitationRateDynamic, 動態開發率
    let acoExploitationRateDynamic = get(opt, 'acoExploitationRateDynamic', '')
    if (!isnum(acoExploitationRateDynamic)) {
        acoExploitationRateDynamic = 0
    }
    acoExploitationRateDynamic = cdbl(acoExploitationRateDynamic)

    //acoAlphaStart, 初始全域費洛蒙更新係數
    let acoAlphaStart = get(opt, 'acoAlphaStart', '')
    if (!isnum(acoAlphaStart)) {
        acoAlphaStart = 0.1
    }
    acoAlphaStart = cdbl(acoAlphaStart)

    //acoAlphaEnd, 最終全域費洛蒙更新係數
    let acoAlphaEnd = get(opt, 'acoAlphaEnd', '')
    if (!isnum(acoAlphaEnd)) {
        acoAlphaEnd = 0.1
    }
    acoAlphaEnd = cdbl(acoAlphaEnd)

    //acoAlphaDynamic, 動態全域費洛蒙更新係數
    let acoAlphaDynamic = get(opt, 'acoAlphaDynamic', '')
    if (!isnum(acoAlphaDynamic)) {
        acoAlphaDynamic = 0
    }
    acoAlphaDynamic = cdbl(acoAlphaDynamic)

    //acoRoStart, 初始區域費洛蒙更新係數
    let acoRoStart = get(opt, 'acoRoStart', '')
    if (!isnum(acoRoStart)) {
        acoRoStart = 0.1
    }
    acoRoStart = cdbl(acoRoStart)

    //acoRoEnd, 最終區域費洛蒙更新係數
    let acoRoEnd = get(opt, 'acoRoEnd', '')
    if (!isnum(acoRoEnd)) {
        acoRoEnd = 0.1
    }
    acoRoEnd = cdbl(acoRoEnd)

    //acoRoDynamic, 動態區域費洛蒙更新係數
    let acoRoDynamic = get(opt, 'acoRoDynamic', '')
    if (!isnum(acoRoDynamic)) {
        acoRoDynamic = 0
    }
    acoRoDynamic = cdbl(acoRoDynamic)

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
    let stopNl = 0 //停止時迴圈數
    let stopExecutions = 0 //停止時核心分析次數

    let ants = []

    //pheromone[i][j] = 第i個變數的第j個ind的費洛蒙值; 初始全0
    let pheromone = []
    for (let i = 0; i < Nd; i++) {
        pheromone.push(new Array(dps[i].n).fill(0))
    }

    //pheromoneUpdate, 對應AE_ACO_Pheromone_UpdatingRule, 更新ant[k]路徑上的費洛蒙
    let pheromoneUpdate = (ant, rRatio) => {
        //rPheromone: fitness越小, 費洛蒙越大
        let rPheromone
        if (ant.fitness >= 1) {
            rPheromone = ant.fitness
        }
        else {
            rPheromone = Math.exp(ant.fitness) / Math.exp(1)
        }
        rPheromone = 1 / rPheromone

        for (let i = 0; i < Nd; i++) {
            let j = ant.ps[i].ind
            pheromone[i][j] = (1 - rRatio) * pheromone[i][j] + rRatio * rPheromone
        }
    }

    //初始化族群: 隨機產生Na隻螞蟻, 各做Local Updating Rule
    if (true) {

        for (let k = 0; k < Na; k++) {
            let _s = _genSolution(dps)
            let s = await calcFitness(_s, 'init')
            ants.push(s)
            pheromoneUpdate(s, acoRoStart) //初始用acoRoStart當Local ratio
        }

        //sortBy
        ants = sortBy(ants, 'fitness')

        //Global Updating Rule (對最佳螞蟻路徑)
        pheromoneUpdate(ants[0], acoAlphaStart)

        //push
        hists.push(cloneDeep(ants[0]))

        //bestSolution
        bestSolution = cloneDeep(ants[0])

    }

    //runBehavior, 對應AE_ACO_Behavior: 每隻螞蟻循費洛蒙產生新路徑
    let runBehavior = async (acoExploitationRate, acoAlpha, acoRo) => {

        for (let k = 0; k < Na; k++) {

            for (let i = 0; i < Nd; i++) {

                //計算沒費洛蒙的節點數
                let pn = pheromone[i].length
                let noPheromoneN = 0
                for (let j = 0; j < pn; j++) {
                    if (pheromone[i][j] === 0) {
                        noPheromoneN++
                    }
                }

                let j

                if (Math.random() < acoExploitationRate) {
                    //Exploitation 開發: 選有費洛蒙的節點(按權重)
                    if (noPheromoneN === pn) {
                        //全部都沒費洛蒙 → 隨機任一
                        j = randomIntRange(0, pn - 1)
                    }
                    else {
                        //至少有1點有費洛蒙 → 按權重加權挑選
                        j = _pickByWeights(pheromone[i], Math.random())
                    }
                }
                else {
                    //Exploration 探索: 選沒費洛蒙的節點
                    if (noPheromoneN === pn || noPheromoneN === 0) {
                        //全部沒/全部有費洛蒙 → 隨機任一
                        j = randomIntRange(0, pn - 1)
                    }
                    else {
                        //收集沒費洛蒙的節點清單, 隨機選一
                        let excList = []
                        for (let jj = 0; jj < pn; jj++) {
                            if (pheromone[i][jj] === 0) {
                                excList.push(jj)
                            }
                        }
                        j = excList[randomIntRange(0, excList.length - 1)]
                    }
                }

                ants[k].ps[i].ind = j
                ants[k].ps[i].value = dps[i].values[j]
            }

            //calcFitness
            let s = await calcFitness(ants[k], 'behavior')
            ants[k] = s
        }

        //Local Updating Rule (對每隻螞蟻)
        for (let k = 0; k < Na; k++) {
            pheromoneUpdate(ants[k], acoRo)
        }

        //Move Best Location
        ants = sortBy(ants, 'fitness')

        //Global Updating Rule (對最佳螞蟻)
        pheromoneUpdate(ants[0], acoAlpha)
    }

    //搜尋
    let i = -1
    while (true) {
        i++

        //params: 本代要用的超參數, 預設由 _dynamicValue + opt 提供, 外部可透過 funGenerationBefore 覆寫
        let params = {
            acoExploitationRate: _dynamicValue(acoExploitationRateStart, acoExploitationRateEnd, acoExploitationRateDynamic, iContinue, NContiguous),
            acoAlpha: _dynamicValue(acoAlphaStart, acoAlphaEnd, acoAlphaDynamic, iContinue, NContiguous),
            acoRo: _dynamicValue(acoRoStart, acoRoEnd, acoRoDynamic, iContinue, NContiguous),
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

        //把覆寫後的 params 賦值回 closure 變數(讓既有 strategyImmigration / strategyLocalSearch / strategyRepeat / forcedExplore 自動讀)
        ModeOutLimit = params.ModeOutLimit
        LocalSearchMethod = params.LocalSearchMethod
        let acoExploitationRate = params.acoExploitationRate
        let acoAlpha = params.acoAlpha
        let acoRo = params.acoRo

        //Behavior
        await runBehavior(acoExploitationRate, acoAlpha, acoRo)

        //antsBestFitness for adapter feedback: 抓本代 LS 之前的最佳 fitness
        //避免 strategyLocalSearch 改善 ants[0] 後讓 adapter 把 LS 功勞算到 params 頭上
        let antsBestFitnessForFeedback = ants[0].fitness

        //push history
        hists.push(cloneDeep(ants[0]))

        //bestSolution
        if (bestSolution.fitness > ants[0].fitness) {

            //update
            bestSolution = cloneDeep(ants[0])

            //funGetBetter
            if (isfun(funGetBetter)) {
                funGetBetter(cloneDeep(bestSolution), i)
            }

            iContinue = 0
        }
        else {
            iContinue += 1
        }

        //strategyImmigration, 移民策略, 對應AE_ACO_Strategy_Immigration
        let strategyImmigration = async () => {

            //由後往前處理, 不變更當前最佳螞蟻ants[0], 故k是從Na-1至1
            for (let k = Na - 1; k >= 1; k--) {
                if (_isSameSolution(ants[k - 1], ants[k])) {
                    let _s = _genSolution(dps)
                    let s = await calcFitness(_s, 'strategyImmigration')
                    ants[k] = s
                    pheromoneUpdate(s, acoRo)
                }
            }

            //sortBy
            ants = sortBy(ants, 'fitness')

        }
        if (UseImmigration) {
            await strategyImmigration()
        }

        //strategyLocalSearch, 局部搜尋策略
        let strategyLocalSearch = async () => {

            //依LocalSearchMethod分派局部搜尋
            let s = await _localSearch(LocalSearchMethod, ants[0], dps, funFit, calcFitness, ModeOutLimit)

            //check
            if (s.fitness >= ants[0].fitness) {
                return
            }

            //update
            ants[0] = s

        }
        await strategyLocalSearch()

        //strategyRepeat, 對應VB原碼Repeat雙分支
        //達門檻: 重產 ant[1..Na-1] + 重置iContinue + iRepeat++
        //否則: 重產 ant[Na/2..Na-1] (ACO特有強制探索, 可關)
        if (UseRepeat && iContinue >= NContiguous && iRepeat < NRepeat) {

            for (let k = 1; k <= Na - 1; k++) {
                let _s = _genSolution(dps)
                let s = await calcFitness(_s, 'strategyRepeat')
                ants[k] = s
                pheromoneUpdate(s, acoRo)
            }
            ants = sortBy(ants, 'fitness')
            iContinue = 0
            iRepeat += 1

        }
        else if (UseForcedExplore) {

            //強制重產後半族群作為探索, 不重置iContinue
            let kStart = Math.floor(Na / 2)
            for (let k = kStart; k <= Na - 1; k++) {
                let _s = _genSolution(dps)
                let s = await calcFitness(_s, 'strategyForcedExplore')
                ants[k] = s
                pheromoneUpdate(s, acoRo)
            }
            ants = sortBy(ants, 'fitness')

        }

        //stopMode
        if (i >= Nl) {
            stopMode = `stop by Nl[${Nl}]`
        }
        else if (iContinue >= NContiguous) {
            stopMode = `stop by iContinue[${iContinue}] >= NContiguous[${NContiguous}]`
        }
        else if (iExecute >= NCore) {
            stopMode = `stop by iExecute[${iExecute}] >= NCore[${NCore}]`
        }

        //funGenerationAfter, 自適應回饋接口
        //放在 stop 判斷之前, 確保末代 suggest() 也有配對 feedback()
        if (isfun(funGenerationAfter)) {
            await funGenerationAfter({
                params: cloneDeep(params),
                iGeneration: i,
                iContinue,
                iExecute,
                childrenBestFitness: antsBestFitnessForFeedback,
                bestFitness: bestSolution.fitness,
            })
        }

        //stop
        if (isestr(stopMode)) {
            stopNl = i
            stopExecutions = iExecute
            break
        }

        //funEndLoop
        if (isfun(funEndLoop)) {
            funEndLoop(cloneDeep(ants), cloneDeep(bestSolution), i)
        }

    }

    //r
    let r = {
        bestSolution,
        hists,
        stopMode,
        stopNl,
        stopIteration: stopNl, //跨演算法通用別名 (omlDE/RGA: stopNg / omlHS: stopNi / omlPSO/ACO: stopNl)
        stopExecutions,
    }

    return r
}


export default omlACO
