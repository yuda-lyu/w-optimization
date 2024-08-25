import get from 'lodash-es/get.js'
import size from 'lodash-es/size.js'
import map from 'lodash-es/map.js'
import sortBy from 'lodash-es/sortBy.js'
import cloneDeep from 'lodash-es/cloneDeep.js'
import isnum from 'wsemi/src/isnum.mjs'
import isestr from 'wsemi/src/isestr.mjs'
import ispint from 'wsemi/src/ispint.mjs'
import isbol from 'wsemi/src/isbol.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import cint from 'wsemi/src/cint.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import arrHas from 'wsemi/src/arrHas.mjs'
import randomIntsNdpRange from 'wsemi/src/randomIntsNdpRange.mjs'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import nelderMead from './nelderMead.mjs'
import omlDefSolution from './omlDefSolution.mjs'
import omlGenSolution from './omlGenSolution.mjs'
import omlModifyParameter from './omlModifyParameter.mjs'
import omlDiscreteValue from './omlDiscreteValue.mjs'


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

    //UseLocalSearch, 是否使用局部搜尋策略, 現在預設nelderMead
    let UseLocalSearch = get(opt, 'UseLocalSearch', '')
    if (!isbol(UseLocalSearch)) {
        UseLocalSearch = true
    }

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
        deMutation = '1R2BR'
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

            //omlGenSolution
            let _s = omlGenSolution(dps)

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
        let s = omlDefSolution(dps)

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
            ir1 = 1
            ir2 = inds[0]
            ir3 = inds[1]
            ir4 = inds[2]
            ir5 = inds[3]
        }
        else if (deMutation === '1R4BRRR') {
            ir1 = inds[0]
            ir2 = 1
            ir3 = inds[1]
            ir4 = inds[2]
            ir5 = inds[3]
        }
        else if (deMutation === '1S4BSRR') {
            ir1 = k
            ir2 = 1
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

                //omlModifyParameter
                j = omlModifyParameter(j, dps[i].n - 1, ModeOutLimit)

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

        //dynamic CrossoverFactor
        let deCrossoverFactor = null
        if (deCrossoverFactorStart === deCrossoverFactorEnd) {
            deCrossoverFactor = deCrossoverFactorStart
        }
        else if (deCrossoverFactorDynamic < -4) {
            deCrossoverFactor = deCrossoverFactorEnd
        }
        else if (deCrossoverFactorDynamic > 4) {
            deCrossoverFactor = deCrossoverFactorStart
        }
        else {
            if (NContiguous > 1) {
                let rValueNow
                if (deCrossoverFactorDynamic >= 0) {
                    rValueNow = Math.pow((iContinue / (NContiguous - 1)), Math.exp(deCrossoverFactorDynamic))
                }
                else {
                    rValueNow = 1 - Math.pow(((NContiguous - 1 - iContinue) / (NContiguous - 1)), Math.exp(-deCrossoverFactorDynamic))
                }
                deCrossoverFactor = rValueNow * (deCrossoverFactorEnd - deCrossoverFactorStart) + deCrossoverFactorStart
            }
            else {
                deCrossoverFactor = deCrossoverFactorStart
            }
        }

        //dynamic F
        let deF = null
        if (deFStart === deFEnd) {
            deF = deFStart
        }
        else if (deFDynamic < -4) {
            deF = deFEnd
        }
        else if (deFDynamic > 4) {
            deF = deFStart
        }
        else {
            if (NContiguous > 1) {
                let rValueNow
                if (deFDynamic >= 0) {
                    rValueNow = Math.pow((iContinue / (NContiguous - 1)), Math.exp(deFDynamic))
                }
                else {
                    rValueNow = 1 - Math.pow(((NContiguous - 1 - iContinue) / (NContiguous - 1)), Math.exp(-deFDynamic))
                }
                deF = rValueNow * (deFEnd - deFStart) + deFStart
            }
            else {
                deF = deFStart
            }
        }

        //dynamic Landa
        let deLanda = null
        if (deLandaStart === deLandaEnd) {
            deLanda = deLandaStart
        }
        else if (deLandaDynamic < -4) {
            deLanda = deLandaEnd
        }
        else if (deLandaDynamic > 4) {
            deLanda = deLandaStart
        }
        else {
            if (NContiguous > 1) {
                let rValueNow
                if (deLandaDynamic >= 0) {
                    rValueNow = Math.pow((iContinue / (NContiguous - 1)), Math.exp(deLandaDynamic))
                }
                else {
                    rValueNow = 1 - Math.pow(((NContiguous - 1 - iContinue) / (NContiguous - 1)), Math.exp(-deLandaDynamic))
                }
                deLanda = rValueNow * (deLandaEnd - deLandaStart) + deLandaStart
            }
            else {
                deLanda = deLandaStart
            }
        }

        for (let k = 0; k < Np; k++) {

            //operCrossover
            let _s = operCrossover(dps, parents, k, {
                deMutation,
                deCrossoverFactor,
                deF,
                deLanda,
                ModeOutLimit,
            })

            //calcFitness
            let s = await calcFitness(_s, 'operCrossover')

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

        //update bestSolution
        if (bestSolution.fitness > children[0].fitness) {
            bestSolution = cloneDeep(children[0])
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

                //omlGenSolution
                let _s = omlGenSolution(dps)

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
            for (let k = Np - 1; k >= 1; k--) {
                if (children[k - 1].fitness === children[k].fitness) {

                    //omlGenSolution
                    let _s = omlGenSolution(dps)

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

            let fun = async(vs) => {

                //_ps
                let _ps = map(vs, (v, i) => {
                    return omlDiscreteValue(v, i, dps)
                })

                //_s
                let _s = {
                    ps: _ps,
                    fitness: null,
                }

                //calcFitness
                let s = await calcFitness(_s, 'strategyLocalSearch')

                return s.fitness
            }

            //bestPs, 使用當前最佳解children[0]
            let bestPs = cloneDeep(children[0].ps)

            //bestVs
            let bestVs = map(bestPs, 'value')

            //r
            let r = await nelderMead(fun, bestVs)

            //check
            if (r.y >= children[0].fitness) {
                return
            }

            //s
            let s = {
                ps: r.x,
                fitness: r.y,
            }

            //update
            children[0] = s

        }
        if (UseLocalSearch) {
            await strategyLocalSearch()
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
        stopExecutions,
    }

    return r
}


export default omlDE
