import get from 'lodash-es/get.js'
import map from 'lodash-es/map.js'
import cloneDeep from 'lodash-es/cloneDeep.js'
import isnum from 'wsemi/src/isnum.mjs'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import ispint from 'wsemi/src/ispint.mjs'
import isbol from 'wsemi/src/isbol.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import cint from 'wsemi/src/cint.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import arrHas from 'wsemi/src/arrHas.mjs'
import _genSolution from './_genSolution.mjs'
import _randPickNeighbor from './_randPickNeighbor.mjs'


//buildThresholdList, 產生門檻數列, 對應VB之AE_TA_ThresholdList
//修正VB原碼Trapezoid之typo (iN3 = iNum - iN1 = iN2 應為 iNum - iN1 - iN2)
function buildThresholdList(thresholdType, thresholdInitial, num) {

    let list = new Array(num).fill(0)

    if (thresholdType === 'Arithmetic Series') {
        //線性下降: T0 * (N-i) / (N-1)
        for (let i = 0; i < num; i++) {
            //對應VB 1-based之 (iNum - i) / (iNum - 1), JS 0-based改為 (num-1-i)/(num-1)
            list[i] = thresholdInitial * (num - 1 - i) / Math.max(num - 1, 1)
        }
    }
    else if (thresholdType === 'Geometric Series') {
        //指數衰減: T[i+1] = T[i] * 0.6
        let rRatio = 0.6
        let rTemp = thresholdInitial
        for (let i = 0; i < num; i++) {
            list[i] = rTemp
            rTemp = rTemp * rRatio
        }
    }
    else if (thresholdType === 'Trapezoid Series') {
        //梯形: 前1/3線性降, 中1/2保持, 後1/3再線性降
        //注意: VB原碼此處有 typo (iN3 = iNum - iN1 = iN2), 本實作修正
        let iN1 = Math.floor(num / 3)
        let iN2 = Math.floor(num / 2)
        let iN3 = num - iN1 - iN2 //修正: 原VB是 iNum - iN1 = iN2 (typo)
        let denom = Math.max(iN1 + iN3 - 1, 1)
        for (let i = 0; i < iN1; i++) {
            //對應VB 1-based: rThresholdInitial * (iN1 + iN3 - i) / (iN1 + iN3 - 1)
            //JS 0-based, i 對應 VB i+1, 故 (iN1+iN3 - (i+1)) = iN1+iN3-1 - i
            list[i] = thresholdInitial * (iN1 + iN3 - 1 - i) / denom
        }
        //中段保持(用iN1-1處之值)
        let midValue = list[iN1 - 1] || 0
        for (let i = iN1; i < iN1 + iN2; i++) {
            list[i] = midValue
        }
        //後段線性降
        for (let i = iN1 + iN2; i < iN1 + iN2 + iN3; i++) {
            //對應VB: rThresholdInitial * (iN1 + iN3 - (i - iN2)) / (iN1 + iN3 - 1)
            //JS 0-based i 對應 VB i+1, (iN1+iN3 - (i+1-iN2)) = iN1+iN3-1 - (i-iN2)
            list[i] = thresholdInitial * (iN1 + iN3 - 1 - (i - iN2)) / denom
        }
    }
    else {
        throw new Error(`invalid thresholdType[${thresholdType}]`)
    }

    return list
}


async function omlTA(dps, funFit, opt = {}) {
    //Threshold Accepting, 門檻接受法 (SA之確定性變體)
    //此版本同時支援「主演算法」與「LocalSearch helper」雙用途:
    //  - 主演算法: 不傳opt.initSolution, 內部隨機初始化
    //  - LocalSearch: 傳opt.initSolution + opt.calcFitness(共享caller之iExecute counter)

    //Nl, 最大總迴圈數
    let Nl = get(opt, 'Nl', '')
    if (!ispint(Nl)) {
        Nl = 10000
    }
    Nl = cint(Nl)

    //NContiguous, 最大最佳解連續未更新次數
    let NContiguous = get(opt, 'NContiguous', '')
    if (!ispint(NContiguous)) {
        NContiguous = 200
    }
    NContiguous = cint(NContiguous)

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

    //taThresholdType, 門檻數列型態
    let taThresholdType = get(opt, 'taThresholdType', '')
    if (!arrHas(taThresholdType, ['Arithmetic Series', 'Geometric Series', 'Trapezoid Series'])) {
        taThresholdType = 'Geometric Series'
    }

    //taThresholdInitial, 初始門檻
    let taThresholdInitial = get(opt, 'taThresholdInitial', '')
    if (!isnum(taThresholdInitial)) {
        taThresholdInitial = 1.0
    }
    taThresholdInitial = cdbl(taThresholdInitial)

    //UseHists
    let UseHists = get(opt, 'UseHists', '')
    if (!isbol(UseHists)) {
        UseHists = true
    }

    //funGetBetter / funEndLoop
    let funGetBetter = get(opt, 'funGetBetter')
    let funEndLoop = get(opt, 'funEndLoop')

    //iExecute
    let iExecute = 0

    //calcFitness, 可由caller傳入以共享counter
    let calcFitness = get(opt, 'calcFitness')
    if (!isfun(calcFitness)) {
        calcFitness = async (_s, from) => {
            iExecute++
            let _ps = map(_s.ps, 'value')
            let f = funFit(_ps)
            if (ispm(f)) {
                f = await f
            }
            return {
                ps: _s.ps,
                fitness: f,
            }
        }
    }

    //初始solution
    let initSolution = get(opt, 'initSolution')
    let s
    if (initSolution && isearr(initSolution.ps) && isnum(initSolution.fitness)) {
        s = cloneDeep(initSolution)
    }
    else {
        let _s = _genSolution(dps)
        s = await calcFitness(_s, 'init')
    }

    //門檻數列(長度 = Nl)
    let thresholds = buildThresholdList(taThresholdType, taThresholdInitial, Nl)

    let bestSolution = cloneDeep(s)
    let hists = []
    let stopMode = ''
    let stopNl = 0
    let stopExecutions = 0
    let iContinue = 0

    if (UseHists) {
        hists.push(cloneDeep(s))
    }

    //搜尋
    let i = -1
    while (true) {
        i++

        if (i >= Nl) {
            stopMode = `stop by Nl[${Nl}]`
            stopNl = i
            stopExecutions = iExecute
            break
        }

        //隨機鄰點
        let neighborResult = _randPickNeighbor(s, dps, ModeOutLimit)
        let neighbor
        if (neighborResult.changed) {
            neighbor = await calcFitness({ ps: neighborResult.ps }, 'neighbor')
        }
        else {
            neighbor = { ps: neighborResult.ps, fitness: s.fitness }
        }

        //接受判定: ΔF < threshold[i] 則接受
        let rFitness = neighbor.fitness - s.fitness
        if (rFitness < thresholds[i]) {
            s = neighbor
        }

        //更新bestSolution
        if (bestSolution.fitness > s.fitness) {
            bestSolution = cloneDeep(s)
            if (isfun(funGetBetter)) {
                funGetBetter(cloneDeep(bestSolution), i)
            }
            iContinue = 0
        }
        else {
            iContinue += 1
        }

        if (UseHists) {
            hists.push(cloneDeep(s))
        }

        //stopMode
        if (iContinue >= NContiguous) {
            stopMode = `stop by iContinue[${iContinue}] >= NContiguous[${NContiguous}]`
        }
        else if (iExecute >= NCore) {
            stopMode = `stop by iExecute[${iExecute}] >= NCore[${NCore}]`
        }

        if (isestr(stopMode)) {
            stopNl = i
            stopExecutions = iExecute
            break
        }

        if (isfun(funEndLoop)) {
            funEndLoop(cloneDeep(s), cloneDeep(bestSolution), i)
        }
    }

    return {
        bestSolution,
        hists,
        stopMode,
        stopNl,
        stopExecutions,
    }
}


export default omlTA
