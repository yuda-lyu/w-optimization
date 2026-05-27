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
// import randomIntsNdpRange from 'wsemi/src/randomIntsNdpRange.mjs'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import _defSolution from './_defSolution.mjs'
import _genSolution from './_genSolution.mjs'
import _modifyParameter from './_modifyParameter.mjs'
import _isSameSolution from './_isSameSolution.mjs'
import _dynamicValue from './_dynamicValue.mjs'
import _pickByWeights from './_pickByWeights.mjs'
import _localSearch from './_localSearch.mjs'


//arrStd, 計算陣列標準差, 對應VB之Std_Long
function arrStd(arr) {
    let n = size(arr)
    if (n === 0) {
        return 0
    }
    let mean = 0
    for (let v of arr) {
        mean += v
    }
    mean /= n
    let sq = 0
    for (let v of arr) {
        sq += (v - mean) * (v - mean)
    }
    return Math.sqrt(sq / n)
}


async function omlRGA(dps, funFit, opt = {}) {
    //Real-coded Genetic Algorithm, 實數編碼基因演算法

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
    if (!arrHas(ModeOutLimit, ['Mapping', 'Limit', 'Random'])) {
        ModeOutLimit = 'Mapping'
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
    //params 預設為 _dynamicValue 算出來的 rgaMutationRate 加上 rgaSelection / rgaCrossover / rgaMutation / rgaElitism / ModeOutLimit / LocalSearchMethod
    let funGenerationBefore = get(opt, 'funGenerationBefore')

    //funGenerationAfter, 每代結束後之自適應回饋接口
    //收 { params, iGeneration, iContinue, iExecute, childrenBestFitness, bestFitness }, 不需回傳
    let funGenerationAfter = get(opt, 'funGenerationAfter')


    //rgaMutationRateStart, 初始突變率
    let rgaMutationRateStart = get(opt, 'rgaMutationRateStart', '')
    if (!isnum(rgaMutationRateStart)) {
        rgaMutationRateStart = 0.05
    }
    rgaMutationRateStart = cdbl(rgaMutationRateStart)

    //rgaMutationRateEnd, 最終突變率
    let rgaMutationRateEnd = get(opt, 'rgaMutationRateEnd', '')
    if (!isnum(rgaMutationRateEnd)) {
        rgaMutationRateEnd = 0.05
    }
    rgaMutationRateEnd = cdbl(rgaMutationRateEnd)

    //rgaMutationRateDynamic, 動態突變率
    let rgaMutationRateDynamic = get(opt, 'rgaMutationRateDynamic', '')
    if (!isnum(rgaMutationRateDynamic)) {
        rgaMutationRateDynamic = 0
    }
    rgaMutationRateDynamic = cdbl(rgaMutationRateDynamic)

    //rgaSelection, 選擇運算子
    let rgaSelection = get(opt, 'rgaSelection', '')
    let rgaSelectionList = [
        'Roulette Wheel Selection',
        'Tournament Selection',
        'Ranking Selection',
        'Uniform Selection',
    ]
    if (!arrHas(rgaSelection, rgaSelectionList)) {
        rgaSelection = 'Tournament Selection'
    }

    //rgaCrossover, 交配運算子
    let rgaCrossover = get(opt, 'rgaCrossover', '')
    let rgaCrossoverList = [
        'Flat Crossover',
        'BLX-a Crossover',
        'Linear Crossover',
        'Arithmetical Crossover',
        'Chung Crossover',
        'DE1 Crossover',
        '3P Crossover',
        '3PB Crossover',
        'DE2 Crossover',
        '4P Crossover',
        '4PB Crossover',
        'HS Crossover',
        'Guiding Function',
    ]
    if (!arrHas(rgaCrossover, rgaCrossoverList)) {
        rgaCrossover = 'BLX-a Crossover'
    }

    //rgaMutation, 突變運算子
    let rgaMutation = get(opt, 'rgaMutation', '')
    let rgaMutationList = [
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
    ]
    if (!arrHas(rgaMutation, rgaMutationList)) {
        rgaMutation = 'Linear0.1'
    }

    //rgaElitism, 菁英策略
    let rgaElitism = get(opt, 'rgaElitism', '')
    let rgaElitismList = [
        'No',
        'BestOne',
        'HalfPop',
        'AllPop',
    ]
    if (!arrHas(rgaElitism, rgaElitismList)) {
        rgaElitism = 'BestOne'
    }

    //Np最低需求檢查, 確保各crossover/selection內取parent index不會undefined
    //3P類需3個不重複親代, 4P類需4個, HS/Guiding需有完整族群
    let crossoverNpMin = {
        'Flat Crossover': 2,
        'BLX-a Crossover': 2,
        'Linear Crossover': 2,
        'Arithmetical Crossover': 2,
        'Chung Crossover': 2,
        'DE1 Crossover': 3,
        '3P Crossover': 3,
        '3PB Crossover': 3,
        'DE2 Crossover': 4,
        '4P Crossover': 4,
        '4PB Crossover': 4,
        'HS Crossover': 2,
        'Guiding Function': 2,
    }
    if (Np < crossoverNpMin[rgaCrossover]) {
        throw new Error(`Np[${Np}] is less than the minimum[${crossoverNpMin[rgaCrossover]}] required by rgaCrossover[${rgaCrossover}]`)
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

    //runSelection, 選擇運算子, 對應AE_RGA_Selection
    //excludes為要排除之index陣列(0-based)
    let runSelection = (excludes = []) => {

        let excSet = new Set(excludes)
        let randomPickNonExc = () => {
            let ia = randomIntRange(0, Np - 1)
            let safety = 0
            while (excSet.has(ia)) {
                ia = randomIntRange(0, Np - 1)
                safety++
                if (safety > Np * 10) {
                    //極端fallback, 應該不會發生(crossoverNpMin已確保有足夠候選)
                    break
                }
            }
            return ia
        }

        if (rgaSelection === 'Roulette Wheel Selection') {

            //隨機抽一個非exclude之親代
            let ia = randomPickNonExc()

            //找族群中除排除外, 適應度值最小者
            let rFitnessTempMin = parents[ia].fitness
            for (let i = 0; i < Np; i++) {
                if (!excSet.has(i)) {
                    if (rFitnessTempMin > parents[i].fitness) {
                        rFitnessTempMin = parents[i].fitness
                    }
                }
            }

            //計算族群適應度值倒數陣列
            let weights = new Array(Np).fill(0)
            for (let i = 0; i < Np; i++) {
                if (!excSet.has(i)) {
                    weights[i] = 1.0 / (parents[i].fitness - rFitnessTempMin + 1.0)
                }
            }

            //加權挑選
            return _pickByWeights(weights, Math.random())

        }
        else if (rgaSelection === 'Tournament Selection') {

            //隨機抽一個非exclude之親代
            let ia = randomPickNonExc()

            //隨機抽另一個不同且非exclude之親代
            let ib = ia
            let safety = 0
            while (ib === ia || excSet.has(ib)) {
                ib = randomIntRange(0, Np - 1)
                safety++
                if (safety > Np * 10) {
                    break
                }
            }

            //取較小fitness勝出
            if (parents[ia].fitness < parents[ib].fitness) {
                return ia
            }
            else {
                return ib
            }

        }
        else if (rgaSelection === 'Ranking Selection') {

            //計算族群排名陣列, 採用線性分佈, parents已sortBy fitness, 故第0個最佳
            let weights = new Array(Np).fill(0)
            for (let i = 0; i < Np; i++) {
                if (!excSet.has(i)) {
                    weights[i] = Np - i
                }
            }

            //加權挑選
            return _pickByWeights(weights, Math.random())

        }
        else if (rgaSelection === 'Uniform Selection') {

            //均勻隨機挑選非exclude之親代
            return randomPickNonExc()

        }
        else {
            throw new Error(`invalid rgaSelection[${rgaSelection}]`)
        }
    }

    //crossover2pRange, 由兩親代基因區間擴張後隨機挑選, 對應AE_RGA_Crossover_2Parents_Range
    //Flat Crossover (rExpandRatio=0) 與 BLX-a Crossover (rExpandRatio=0.25) 共用
    let crossover2pRange = (ia, ib, rExpandRatio) => {

        let s = _defSolution(dps)

        for (let i = 0; i < Nd; i++) {

            let indexa = parents[ia].ps[i].ind
            let indexb = parents[ib].ps[i].ind
            let indexLow = Math.min(indexa, indexb)
            let indexUp = Math.max(indexa, indexb)

            //Expand
            let indexAdd = Math.round(rExpandRatio * (indexUp - indexLow))
            indexUp = indexUp + indexAdd
            indexLow = indexLow - indexAdd

            //Limit, 由於後面採用從區間隨機挑選, 不能使用_modifyParameter
            indexUp = Math.min(indexUp, dps[i].n - 1)
            indexLow = Math.max(indexLow, 0)

            //RandInt
            let j = randomIntRange(indexLow, indexUp)

            //Parameter
            s.ps[i].ind = j
            s.ps[i].value = dps[i].values[j]

        }

        return s
    }

    //crossover2pRatio, 由兩親代基因依比例疊加, 對應AE_RGA_Crossover_2Parents_Ratio
    let crossover2pRatio = (ia, ib, rRatioa, rRatiob) => {

        let s = _defSolution(dps)

        for (let i = 0; i < Nd; i++) {

            let indexa = parents[ia].ps[i].ind
            let indexb = parents[ib].ps[i].ind

            //疊加, 利用真實設計變數值跟Index皆相同之結果, Index只是一種座標轉換而已
            let j = Math.round(rRatioa * indexa + rRatiob * indexb)

            //Limit
            j = _modifyParameter(j, dps[i].n - 1, ModeOutLimit)

            //Parameter
            s.ps[i].ind = j
            s.ps[i].value = dps[i].values[j]

        }

        return s
    }

    //crossover2pChung, 對應AE_RGA_Crossover_2Parents_Chung
    //鍾仁傑(2006)提出之交配技術: 隨機選一變數做BLX-a, 其他變數做Simple Crossover
    let crossover2pChung = (ia, ib, rExpandRatio) => {

        let sA = _defSolution(dps)
        let sB = _defSolution(dps)

        //隨機選一個變數做BLX-a
        let iSplit = randomIntRange(0, Nd - 1)

        let indexa = parents[ia].ps[iSplit].ind
        let indexb = parents[ib].ps[iSplit].ind
        let indexLow = Math.min(indexa, indexb)
        let indexUp = Math.max(indexa, indexb)
        let indexAdd = Math.round(rExpandRatio * (indexUp - indexLow))
        indexUp = indexUp + indexAdd
        indexLow = indexLow - indexAdd
        indexUp = Math.min(indexUp, dps[iSplit].n - 1)
        indexLow = Math.max(indexLow, 0)
        let j = randomIntRange(indexLow, indexUp)

        //該變數兩子代都用相同的BLX-a結果
        sA.ps[iSplit].ind = j
        sA.ps[iSplit].value = dps[iSplit].values[j]
        sB.ps[iSplit].ind = j
        sB.ps[iSplit].value = dps[iSplit].values[j]

        //其他變數做Simple Crossover, 分裂點前後互換
        for (let i = 0; i < iSplit; i++) {
            sA.ps[i].ind = parents[ia].ps[i].ind
            sA.ps[i].value = parents[ia].ps[i].value
            sB.ps[i].ind = parents[ib].ps[i].ind
            sB.ps[i].value = parents[ib].ps[i].value
        }
        for (let i = iSplit + 1; i < Nd; i++) {
            sA.ps[i].ind = parents[ib].ps[i].ind
            sA.ps[i].value = parents[ib].ps[i].value
            sB.ps[i].ind = parents[ia].ps[i].ind
            sB.ps[i].value = parents[ia].ps[i].value
        }

        return [sA, sB]
    }

    //crossover3pRatio, 對應AE_RGA_Crossover_3Parents_Ratio
    let crossover3pRatio = (ia, ib, ic, rRatioa, rRatiob, rRatioc) => {

        let s = _defSolution(dps)

        for (let i = 0; i < Nd; i++) {

            let indexa = parents[ia].ps[i].ind
            let indexb = parents[ib].ps[i].ind
            let indexc = parents[ic].ps[i].ind

            let j = Math.round(rRatioa * indexa + rRatiob * indexb + rRatioc * indexc)

            //Limit
            j = _modifyParameter(j, dps[i].n - 1, ModeOutLimit)

            s.ps[i].ind = j
            s.ps[i].value = dps[i].values[j]

        }

        return s
    }

    //crossover4pRatio, 對應AE_RGA_Crossover_4Parents_Ratio
    let crossover4pRatio = (ia, ib, ic, id, rRatioa, rRatiob, rRatioc, rRatiod) => {

        let s = _defSolution(dps)

        for (let i = 0; i < Nd; i++) {

            let indexa = parents[ia].ps[i].ind
            let indexb = parents[ib].ps[i].ind
            let indexc = parents[ic].ps[i].ind
            let indexd = parents[id].ps[i].ind

            let j = Math.round(rRatioa * indexa + rRatiob * indexb + rRatioc * indexc + rRatiod * indexd)

            //Limit
            j = _modifyParameter(j, dps[i].n - 1, ModeOutLimit)

            s.ps[i].ind = j
            s.ps[i].value = dps[i].values[j]

        }

        return s
    }

    //runCrossover, 對應AE_RGA_Crossover, 產生Np個子代
    let runCrossover = () => {

        let childs = []

        //2Parents類: Flat / BLX-a / Linear / Arithmetical / Chung
        if (rgaCrossover === 'Flat Crossover' ||
            rgaCrossover === 'BLX-a Crossover' ||
            rgaCrossover === 'Linear Crossover' ||
            rgaCrossover === 'Arithmetical Crossover' ||
            rgaCrossover === 'Chung Crossover') {

            while (childs.length < Np) {

                //選2個不同親代
                let ia = runSelection()
                let ib = runSelection([ia])

                if (rgaCrossover === 'Flat Crossover') {
                    childs.push(crossover2pRange(ia, ib, 0))
                }
                else if (rgaCrossover === 'BLX-a Crossover') {
                    childs.push(crossover2pRange(ia, ib, 0.25))
                }
                else if (rgaCrossover === 'Linear Crossover') {
                    childs.push(crossover2pRatio(ia, ib, 0.5, 0.5))
                    if (childs.length >= Np) break
                    childs.push(crossover2pRatio(ia, ib, 1.5, -0.5))
                    if (childs.length >= Np) break
                    childs.push(crossover2pRatio(ia, ib, -0.5, 1.5))
                }
                else if (rgaCrossover === 'Arithmetical Crossover') {
                    let rLanda = Math.random()
                    childs.push(crossover2pRatio(ia, ib, rLanda, 1 - rLanda))
                    if (childs.length >= Np) break
                    childs.push(crossover2pRatio(ia, ib, 1 - rLanda, rLanda))
                }
                else if (rgaCrossover === 'Chung Crossover') {
                    let [sA, sB] = crossover2pChung(ia, ib, 0.25)
                    childs.push(sA)
                    if (childs.length >= Np) break
                    childs.push(sB)
                }
            }
        }

        //3Parents類: DE1 / 3P / 3PB
        else if (rgaCrossover === 'DE1 Crossover' ||
            rgaCrossover === '3P Crossover' ||
            rgaCrossover === '3PB Crossover') {

            while (childs.length < Np) {

                let ia, ib, ic
                let rRatioa, rRatiob, rRatioc

                if (rgaCrossover === 'DE1 Crossover') {
                    ia = runSelection()
                    ib = runSelection([ia])
                    ic = runSelection([ia, ib])
                    let rF = 1
                    rRatioa = 1
                    rRatiob = rF
                    rRatioc = -rRatiob
                }
                else if (rgaCrossover === '3P Crossover') {
                    ia = runSelection()
                    ib = runSelection([ia])
                    ic = runSelection([ia, ib])
                    rRatioa = -0.4
                    rRatiob = 0.5
                    rRatioc = 0.7
                }
                else if (rgaCrossover === '3PB Crossover') {
                    ia = 0 //親代最佳解(parents已sortBy fitness)
                    ib = runSelection([ia])
                    ic = runSelection([ia, ib])
                    rRatioa = -0.4
                    rRatiob = 0.5
                    rRatioc = 0.7
                }

                childs.push(crossover3pRatio(ia, ib, ic, rRatioa, rRatiob, rRatioc))
            }
        }

        //4Parents類: DE2 / 4P / 4PB
        else if (rgaCrossover === 'DE2 Crossover' ||
            rgaCrossover === '4P Crossover' ||
            rgaCrossover === '4PB Crossover') {

            while (childs.length < Np) {

                let ia, ib, ic, id
                let rRatioa, rRatiob, rRatioc, rRatiod

                if (rgaCrossover === 'DE2 Crossover') {
                    ia = 0
                    ib = runSelection([ia])
                    ic = runSelection([ia, ib])
                    id = runSelection([ia, ib, ic])
                    let rF = 1
                    let rLanda = 0.2
                    rRatioa = rF
                    rRatiob = 1 - rRatioa
                    rRatioc = rLanda
                    rRatiod = -rRatioc
                }
                else if (rgaCrossover === '4P Crossover') {
                    ia = runSelection()
                    ib = runSelection([ia])
                    ic = runSelection([ia, ib])
                    id = runSelection([ia, ib, ic])
                    rRatioa = 0.2
                    rRatiob = -0.6
                    rRatioc = 0.5
                    rRatiod = 0.7
                }
                else if (rgaCrossover === '4PB Crossover') {
                    ia = 0
                    ib = runSelection([ia])
                    ic = runSelection([ia, ib])
                    id = runSelection([ia, ib, ic])
                    rRatioa = 0.2
                    rRatiob = -0.6
                    rRatioc = 0.5
                    rRatiod = 0.7
                }

                childs.push(crossover4pRatio(ia, ib, ic, id, rRatioa, rRatiob, rRatioc, rRatiod))
            }
        }

        //AllParents類: HS / Guiding Function
        else if (rgaCrossover === 'HS Crossover') {

            //各子代之各設計變數獨立用Selection從族群抽取對應變數
            for (let k = 0; k < Np; k++) {
                let s = _defSolution(dps)
                for (let i = 0; i < Nd; i++) {
                    let ia = runSelection()
                    s.ps[i].ind = parents[ia].ps[i].ind
                    s.ps[i].value = parents[ia].ps[i].value
                }
                childs.push(s)
            }
        }
        else if (rgaCrossover === 'Guiding Function') {

            //各設計變數計算族群中該變數的Index直方圖標準差
            //rStd[i]越大代表分佈越不均勻, 越有"導引方向"
            let iGF = [] //iGF[i][n] = 第n個個體在第i變數的ind
            let rStd = []
            for (let m = 0; m < Nd; m++) {
                let iIndex = []
                let row = []
                for (let n = 0; n < Np; n++) {
                    iIndex.push(parents[n].ps[m].ind)
                    row.push(parents[n].ps[m].ind)
                }
                iGF.push(row)
                let iSepN = dps[m].n
                let iCount = new Array(iSepN).fill(0)
                for (let v of iIndex) {
                    if (v >= 0 && v < iSepN) {
                        iCount[v]++
                    }
                }
                rStd.push(arrStd(iCount))
            }

            //各子代從rStd挑1個變數, 該變數從族群iGF用權重抽1個個體, 其餘變數承襲第k個親代
            for (let k = 0; k < Np; k++) {
                let i = _pickByWeights(rStd, Math.random())
                let rIndex = iGF[i].map(v => v)
                let n = _pickByWeights(rIndex, Math.random())
                let s = cloneDeep(parents[k])
                s.ps[i].ind = parents[n].ps[i].ind
                s.ps[i].value = parents[n].ps[i].value
                childs.push(s)
            }
        }
        else {
            throw new Error(`invalid rgaCrossover[${rgaCrossover}]`)
        }

        //保險: 若邏輯多產(如Linear/Arithmetical/Chung最後一輪超過Np), 截掉尾端
        if (childs.length > Np) {
            childs.length = Np
        }

        return childs
    }

    //runMutation, 對應AE_RGA_Mutation
    let runMutation = (childs, rgaMutationRate) => {

        for (let k = 0; k < Np; k++) {
            for (let i = 0; i < Nd; i++) {

                if (Math.random() < rgaMutationRate) {

                    let j = childs[k].ps[i].ind
                    let n = dps[i].n

                    if (rgaMutation === 'Constant1') {
                        let indexAdd = 1
                        j = (Math.random() < 0.5) ? j + indexAdd : j - indexAdd
                    }
                    else if (rgaMutation === 'Constant2') {
                        let indexAdd = randomIntRange(1, 2)
                        j = (Math.random() < 0.5) ? j + indexAdd : j - indexAdd
                    }
                    else if (rgaMutation === 'Constant3') {
                        let indexAdd = randomIntRange(1, 3)
                        j = (Math.random() < 0.5) ? j + indexAdd : j - indexAdd
                    }
                    else if (rgaMutation === 'Linear0.1') {
                        let indexAdd = randomIntRange(1, Math.round(0.1 * n) + 1)
                        j = (Math.random() < 0.5) ? j + indexAdd : j - indexAdd
                    }
                    else if (rgaMutation === 'Linear0.2') {
                        let indexAdd = randomIntRange(1, Math.round(0.2 * n) + 1)
                        j = (Math.random() < 0.5) ? j + indexAdd : j - indexAdd
                    }
                    else if (rgaMutation === 'Linear0.3') {
                        let indexAdd = randomIntRange(1, Math.round(0.3 * n) + 1)
                        j = (Math.random() < 0.5) ? j + indexAdd : j - indexAdd
                    }
                    else if (rgaMutation === 'Exponent0.1') {
                        let indexAdd = Math.floor(Math.pow(0.1 * n + 1, Math.random()))
                        j = (Math.random() < 0.5) ? j + indexAdd : j - indexAdd
                    }
                    else if (rgaMutation === 'Exponent0.2') {
                        let indexAdd = Math.floor(Math.pow(0.2 * n + 1, Math.random()))
                        j = (Math.random() < 0.5) ? j + indexAdd : j - indexAdd
                    }
                    else if (rgaMutation === 'Exponent0.3') {
                        let indexAdd = Math.floor(Math.pow(0.3 * n + 1, Math.random()))
                        j = (Math.random() < 0.5) ? j + indexAdd : j - indexAdd
                    }
                    else if (rgaMutation === 'Global Space') {
                        j = randomIntRange(0, n - 1)
                    }
                    else {
                        throw new Error(`invalid rgaMutation[${rgaMutation}]`)
                    }

                    //Limit
                    j = _modifyParameter(j, n - 1, ModeOutLimit)

                    //update
                    childs[k].ps[i].ind = j
                    childs[k].ps[i].value = dps[i].values[j]

                }
            }
        }

        return childs
    }

    //runElitism, 對應AE_RGA_Strategy_Elitism, parents與childs皆已sortBy fitness
    let runElitism = (childs) => {

        if (rgaElitism === 'No') {
            //不做菁英
            return childs
        }
        else if (rgaElitism === 'BestOne') {
            //用親代最佳取代子代最差, 因外部已先sortBy故最差在尾, 但親代最佳有可能超過子代全部成為最佳, 故外部仍須再sortBy
            childs[Np - 1] = cloneDeep(parents[0])
            return childs
        }
        else if (rgaElitism === 'HalfPop') {
            //子代後半換成親代前半, 親代前半可能有更佳, 故外部仍須再sortBy
            let half = Math.floor(Np / 2)
            for (let k = half; k < Np; k++) {
                childs[k] = cloneDeep(parents[k - half])
            }
            return childs
        }
        else if (rgaElitism === 'AllPop') {
            //親代+子代合併排序取前Np個, 最佳必然在頭
            let all = []
            for (let k = 0; k < Np; k++) {
                all.push(parents[k])
                all.push(childs[k])
            }
            all = sortBy(all, 'fitness')
            return all.slice(0, Np)
        }
        else {
            throw new Error(`invalid rgaElitism[${rgaElitism}]`)
        }
    }

    //搜尋
    let i = -1
    while (true) {
        i++

        //params: 本代要用的超參數, 預設由 _dynamicValue + opt 提供, 外部可透過 funGenerationBefore 覆寫
        let params = {
            rgaMutationRate: _dynamicValue(rgaMutationRateStart, rgaMutationRateEnd, rgaMutationRateDynamic, iContinue, NContiguous),
            rgaSelection,
            rgaCrossover,
            rgaMutation,
            rgaElitism,
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

        //把覆寫後的 params 賦值回 closure 變數(讓既有 runCrossover / runMutation / runElitism / strategyLocalSearch 自動讀)
        rgaSelection = params.rgaSelection
        rgaCrossover = params.rgaCrossover
        rgaMutation = params.rgaMutation
        rgaElitism = params.rgaElitism
        ModeOutLimit = params.ModeOutLimit
        LocalSearchMethod = params.LocalSearchMethod
        let rgaMutationRate = params.rgaMutationRate

        //Crossover, 產生Np個子代
        children = runCrossover()

        //Mutation
        children = runMutation(children, rgaMutationRate)

        //calcFitness, 對每個子代計算適應度
        for (let k = 0; k < Np; k++) {
            children[k] = await calcFitness(children[k], 'evolution')
        }

        //sortBy children
        children = sortBy(children, 'fitness')

        //childrenBestFitness for adapter feedback: 抓本代 Elitism + LS 之前的最佳 fitness
        //避免 runElitism 把上代 parents 拉進來、或 strategyLocalSearch 改善 children[0] 後
        //讓 adapter 把 Elitism/LS 的功勞算到 params 頭上
        let childrenBestFitnessForFeedback = children[0].fitness

        //Elitism
        children = runElitism(children)

        //sortBy, 菁英策略可能是不做菁英, 故仍須排序
        children = sortBy(children, 'fitness')

        //strategyImmigration, 移民策略 (對齊 .bas 順序: 排在 hists / bestSolution 之前, 改善立即反映)
        //對應VB之AE_RGA_Strategy_Immigration, 重複個體重新生成
        let strategyImmigration = async () => {

            //由後往前處理, 不變更當前最佳解children[0], 故k是從Np-1至1
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

        //strategyLocalSearch, 局部搜尋策略 (對齊 .bas 順序: 排在 hists / bestSolution 之前, 改善立即反映)
        let strategyLocalSearch = async () => {

            //依LocalSearchMethod分派局部搜尋
            let s = await _localSearch(LocalSearchMethod, children[0], dps, funFit, calcFitness, ModeOutLimit)

            //check
            if (s.fitness >= children[0].fitness) {
                return
            }

            //update
            children[0] = s

        }
        await strategyLocalSearch()

        //push (對齊 .bas: hists 記錄 strategy 後之 final children[0])
        hists.push(cloneDeep(children[0]))

        //bestSolution (對齊 .bas: bestSolution / iContinue 反映 strategy 後之 final children[0])
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

        //strategyRepeat, 再搜尋策略 (對齊 .bas 順序: 排在 bestSolution 更新後, 改善留到下代 evolution 才反映)
        let strategyRepeat = async () => {

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

        //funGenerationAfter, 自適應回饋接口
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


export default omlRGA
