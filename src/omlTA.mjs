import map from 'lodash-es/map.js'
import cloneDeep from 'lodash-es/cloneDeep.js'
import isestr from 'wsemi/src/isestr.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import { kNum, kPint, kBol, kFun, kEnum, chkParams } from './_checkParam.mjs'
import { kModeOutLimit } from './_optDecl.mjs'
import { kDps, kInitSolution } from './_validateDps.mjs'
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
        throw new Error('invalid thresholdType')
    }

    return list
}


/**
 * 門檻接受法(Threshold Accepting，SA之確定性變體)
 *
 * 此版本同時支援「主演算法」與「LocalSearch helper」雙用途:
 * 主演算法不傳opt.initSolution，內部隨機初始化；LocalSearch傳opt.initSolution與opt.calcFitness(共享caller之iExecute counter)
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/p2.omlTA.test.mjs Github}
 * @memberOf w-optimization
 * @param {Array} dps 輸入設計變數陣列，各元素為{ values: [可用值], n: 可用值數量 }。種類：非空陣列，必給；元素為一般物件，values為非空陣列(元素為可用值，任意值，由funFit自行解讀，不檢)，n為有效數字，正整數(數字字串轉換後使用)且須等於values長度；不改寫呼叫端之陣列
 * @param {Function} funFit 輸入適應函數，將傳入各設計變數所取之值陣列，需回傳適應函數值，以求解最小值為目標。種類：函數，必給
 * @param {Object} [opt={}] 輸入設定物件，預設{}。種類：一般物件，undefined或null視為未給，其餘非一般物件為無效；未宣告之鍵忽略；各鍵給了而不符種類即為無效，不改用預設
 * @param {Number|String} [opt.Nl=10000] 輸入最大總迴圈數，預設10000。種類：有效數字，正整數
 * @param {Number|String} [opt.NContiguous=200] 輸入最大最佳解連續未更新次數，預設200。種類：有效數字，正整數
 * @param {Number|String} [opt.NCore=1000000] 輸入最大核心執行次數，預設1000000。種類：有效數字，正整數
 * @param {String} [opt.ModeOutLimit='Mapping'] 輸入設計變數指標超過範圍之處理方式，預設'Mapping'。種類：列舉字串，'Mapping'、'Limit'、'Random'
 * @param {String} [opt.taThresholdType='Geometric Series'] 輸入門檻數列型態，預設'Geometric Series'。種類：列舉字串，'Arithmetic Series'、'Geometric Series'、'Trapezoid Series'
 * @param {Number|String} [opt.taThresholdInitial=1] 輸入初始門檻，預設1。種類：有效數字
 * @param {Boolean} [opt.UseHists=true] 輸入是否收集hists陣列，預設true。種類：布林，只收true或false('true'、'n'、1等皆為無效)
 * @param {Function} [opt.funGetBetter] 輸入有更優解出現時呼叫之函數，將傳入(最佳解,迴圈序號)。種類：函數
 * @param {Function} [opt.funEndLoop] 輸入每次主迴圈結束後呼叫之函數，將傳入(現解,最佳解,迴圈序號)。種類：函數
 * @param {Function} [opt.calcFitness] 輸入計算適應度之函數，供LocalSearch模式共享呼叫次數計數，將傳入(解物件,來源字串)，需回傳{ ps, fitness }。種類：函數
 * @param {Object} [opt.initSolution] 輸入初始解(LocalSearch模式)，不給則隨機初始化。種類：一般物件，ps為非空陣列(元素為本套件內部結構，不逐一檢測)，fitness為適應函數值(數字或數字字串，轉換後使用，另收+-Infinity作為懲罰值)
 * @returns {Promise} 回傳Promise，resolve為結果物件，含鍵值bestSolution,hists,stopMode,stopNl,stopExecutions；輸入無效時reject字串，格式為`invalid <名稱>: must be <種類描述>`，不含輸入值
 */
async function omlTA(dps, funFit, opt = {}) {
    //Threshold Accepting, 門檻接受法 (SA之確定性變體)
    //此版本同時支援「主演算法」與「LocalSearch helper」雙用途:
    //  - 主演算法: 不傳opt.initSolution, 內部隨機初始化
    //  - LocalSearch: 傳opt.initSolution + opt.calcFitness(共享caller之iExecute counter)

    //check, 一般參數與opt先於任何適應函數呼叫檢測, 檢測之值即使用之值
    let c = chkParams([[dps, 'dps', kDps], [funFit, 'funFit', kFun]], opt, {
        Nl: [kPint, 10000], //最大總迴圈數
        NContiguous: [kPint, 200], //最大最佳解連續未更新次數
        NCore: [kPint, 1000000], //最大核心執行次數
        ModeOutLimit: [kModeOutLimit, 'Mapping'], //設計變數指標超過範圍之處理方式
        taThresholdType: [kEnum(['Arithmetic Series', 'Geometric Series', 'Trapezoid Series']), 'Geometric Series'], //門檻數列型態
        taThresholdInitial: [kNum, 1.0], //初始門檻
        UseHists: [kBol, true],
        funGetBetter: [kFun, undefined], //當有更優解出現時呼叫函數
        funEndLoop: [kFun, undefined], //每次主迴圈結束後呼叫函數
        calcFitness: [kFun, undefined], //可由caller傳入以共享counter
        initSolution: [kInitSolution, undefined], //可由caller傳入(LocalSearch模式)
    })
    if (c.err !== '') {
        return Promise.reject(c.err)
    }
    dps = c.vs[0]
    let { Nl, NContiguous, NCore, ModeOutLimit, taThresholdType, taThresholdInitial, UseHists, funGetBetter, funEndLoop } = c.o

    //iExecute
    let iExecute = 0

    //calcFitness, 可由caller傳入以共享counter
    let calcFitness = c.o.calcFitness
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
    let initSolution = c.o.initSolution
    let s
    if (initSolution) {
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
