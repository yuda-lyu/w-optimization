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
import _validateDps from './_validateDps.mjs'


async function omlSA(dps, funFit, opt = {}) {
    //Simulated Annealing, 模擬退火
    //此版本同時支援「主演算法」與「LocalSearch helper」雙用途:
    //  - 主演算法: 不傳opt.initSolution, 內部隨機初始化
    //  - LocalSearch: 傳opt.initSolution + opt.calcFitness(共享caller之iExecute counter)

    //_validateDps
    _validateDps(dps)

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

    //NCore, 最大核心執行次數(僅主演算法用; LocalSearch模式由caller自管)
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

    //saInitialTemperature, 初始溫度
    let saInitialTemperature = get(opt, 'saInitialTemperature', '')
    if (!isnum(saInitialTemperature)) {
        saInitialTemperature = 100
    }
    saInitialTemperature = cdbl(saInitialTemperature)

    //saAlpha, 溫度衰減係數 (改善時 T = α*T, 越小衰減越快)
    let saAlpha = get(opt, 'saAlpha', '')
    if (!isnum(saAlpha)) {
        saAlpha = 0.9
    }
    saAlpha = cdbl(saAlpha)

    //UseHists, 是否收集hists陣列(LocalSearch模式可關以省記憶體)
    let UseHists = get(opt, 'UseHists', '')
    if (!isbol(UseHists)) {
        UseHists = true
    }

    //funGetBetter, 當有更優解出現時呼叫函數
    let funGetBetter = get(opt, 'funGetBetter')

    //funEndLoop, 每次主迴圈結束後呼叫函數
    let funEndLoop = get(opt, 'funEndLoop')

    //iExecute, 核心分析次數(若caller傳calcFitness則由caller計, 此值僅作本地參考)
    let iExecute = 0

    //calcFitness, 可由caller傳入以共享iExecute counter
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

    //初始solution: 可由caller傳入(LocalSearch模式), 否則隨機產生(主演算法模式)
    let initSolution = get(opt, 'initSolution')
    let s
    if (initSolution && isearr(initSolution.ps) && isnum(initSolution.fitness)) {
        s = cloneDeep(initSolution)
    }
    else {
        let _s = _genSolution(dps)
        s = await calcFitness(_s, 'init')
    }

    let bestSolution = cloneDeep(s)
    let hists = []
    let stopMode = ''
    let stopNl = 0
    let stopExecutions = 0
    let iContinue = 0

    //溫度
    let rTemperature = saInitialTemperature

    if (UseHists) {
        hists.push(cloneDeep(s))
    }

    //搜尋
    let i = -1
    while (true) {
        i++

        //隨機鄰點
        let neighborResult = _randPickNeighbor(s, dps, ModeOutLimit)
        let neighbor
        if (neighborResult.changed) {
            //真有變動才算fitness
            neighbor = await calcFitness({ ps: neighborResult.ps }, 'neighbor')
        }
        else {
            //ind未變(_modifyParameter在limit模式或邊界可能)
            neighbor = { ps: neighborResult.ps, fitness: s.fitness }
        }

        //接受判定
        let rFitness = neighbor.fitness - s.fitness
        if (rFitness < 0) {
            //改善 → 必接受, 降溫
            s = neighbor
            rTemperature = saAlpha * rTemperature
        }
        else {
            //惡化 → 機率接受 exp(-ΔF/T)
            if (Math.random() < Math.exp(-rFitness / rTemperature)) {
                s = neighbor
            }
            //else: 拒絕, 保持原解
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
        if (i >= Nl) {
            stopMode = `stop by Nl[${Nl}]`
        }
        else if (iContinue >= NContiguous) {
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


export default omlSA
