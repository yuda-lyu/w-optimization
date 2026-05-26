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
import _modifyParameter from './_modifyParameter.mjs'
import _isSameSolution from './_isSameSolution.mjs'
import _dynamicValue from './_dynamicValue.mjs'
import _localSearch from './_localSearch.mjs'


async function omlPSO(dps, funFit, opt = {}) {
    //Particle Swarm Optimization, 粒子群最佳化

    //Nl, 最大總迴圈數
    let Nl = get(opt, 'Nl', '')
    if (!ispint(Nl)) {
        Nl = 10000
    }
    Nl = cint(Nl)

    //Np, 粒子數
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

    //funEndLoop, 每次主迴圈結束後呼叫函數
    let funEndLoop = get(opt, 'funEndLoop')

    //psoC1Start, 初始C1 (個體經驗權重)
    let psoC1Start = get(opt, 'psoC1Start', '')
    if (!isnum(psoC1Start)) {
        psoC1Start = 2.0
    }
    psoC1Start = cdbl(psoC1Start)

    //psoC1End, 最終C1
    let psoC1End = get(opt, 'psoC1End', '')
    if (!isnum(psoC1End)) {
        psoC1End = 2.0
    }
    psoC1End = cdbl(psoC1End)

    //psoC1Dynamic, 動態C1
    let psoC1Dynamic = get(opt, 'psoC1Dynamic', '')
    if (!isnum(psoC1Dynamic)) {
        psoC1Dynamic = 0
    }
    psoC1Dynamic = cdbl(psoC1Dynamic)

    //psoC2Start, 初始C2 (全域經驗權重)
    let psoC2Start = get(opt, 'psoC2Start', '')
    if (!isnum(psoC2Start)) {
        psoC2Start = 2.0
    }
    psoC2Start = cdbl(psoC2Start)

    //psoC2End, 最終C2
    let psoC2End = get(opt, 'psoC2End', '')
    if (!isnum(psoC2End)) {
        psoC2End = 2.0
    }
    psoC2End = cdbl(psoC2End)

    //psoC2Dynamic, 動態C2
    let psoC2Dynamic = get(opt, 'psoC2Dynamic', '')
    if (!isnum(psoC2Dynamic)) {
        psoC2Dynamic = 0
    }
    psoC2Dynamic = cdbl(psoC2Dynamic)

    //psoBeta, 慣性衰減係數 (每代 inertia *= Beta)
    let psoBeta = get(opt, 'psoBeta', '')
    if (!isnum(psoBeta)) {
        psoBeta = 0.9
    }
    psoBeta = cdbl(psoBeta)

    //psoGamma, 最大速度比例 (Vmax = Gamma * (n-1))
    let psoGamma = get(opt, 'psoGamma', '')
    if (!isnum(psoGamma)) {
        psoGamma = 0.5
    }
    psoGamma = cdbl(psoGamma)

    //psoInertiaMin, 慣性下限
    let psoInertiaMin = get(opt, 'psoInertiaMin', '')
    if (!isnum(psoInertiaMin)) {
        psoInertiaMin = 0.4
    }
    psoInertiaMin = cdbl(psoInertiaMin)

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

    //genParticle, 產生一個新粒子(含位置, 速度, 慣性, BS)
    let genParticle = async (from) => {

        //隨機位置
        let _s = _genSolution(dps)
        let s = await calcFitness(_s, from)

        //初始速度: 各設計變數於 [-(n-1), n-1] 內隨機整數轉double
        let velocity = []
        for (let i = 0; i < Nd; i++) {
            let n = dps[i].n
            velocity.push(randomIntRange(-(n - 1), n - 1))
        }

        //初始慣性: (1+Rnd) * InertiaMin, 範圍 [InertiaMin, 2*InertiaMin]
        let inertia = (1 + Math.random()) * psoInertiaMin

        let particle = {
            ps: s.ps,
            fitness: s.fitness,
            bs: cloneDeep(s), //個體歷史最佳, 初始 = 當前
            velocity,
            inertia,
        }
        return particle
    }

    let bestSolution = null //最佳解
    let hists = [] //求解最佳解之紀錄清單
    let stopMode = '' //觸發停止之機制
    let stopNl = 0 //停止時迴圈數
    let stopExecutions = 0 //停止時核心分析次數

    let particles = []
    let gs = null //全域歷史最佳 (Group Best)

    //初始化粒子群
    if (true) {

        for (let k = 0; k < Np; k++) {
            let p = await genParticle('init')
            particles.push(p)
        }

        //sortBy fitness
        particles = sortBy(particles, 'fitness')

        //gs = 當前最佳粒子之 ps + fitness
        gs = { ps: cloneDeep(particles[0].ps), fitness: particles[0].fitness }

        //push
        hists.push(cloneDeep(particles[0]))

        //bestSolution
        bestSolution = { ps: cloneDeep(particles[0].ps), fitness: particles[0].fitness }

    }

    //runEvolution, 對應AE_PSO_Evolution: 更新每粒子之速度/慣性/位置
    let runEvolution = async (psoC1, psoC2) => {

        //Constriction Factor
        let psoPhi = psoC1 + psoC2
        let psoK
        if (psoPhi > 4) {
            psoK = 2 / Math.abs(2 - psoPhi - Math.sqrt(psoPhi * psoPhi - 4 * psoPhi))
        }
        else {
            psoK = 1
        }

        for (let k = 0; k < Np; k++) {

            let particle = particles[k]
            let rGamma1 = Math.random()
            let rGamma2 = Math.random()

            //New Velocity
            for (let i = 0; i < Nd; i++) {

                let v = 0
                v += particle.inertia * particle.velocity[i]
                v += psoC1 * rGamma1 * (particle.bs.ps[i].ind - particle.ps[i].ind)
                v += psoC2 * rGamma2 * (gs.ps[i].ind - particle.ps[i].ind)

                //Constriction
                v = psoK * v

                //Vmax / Vmin
                let vMax = psoGamma * (dps[i].n - 1)
                let vMin = -vMax

                //clamp
                particle.velocity[i] = Math.max(Math.min(v, vMax), vMin)
            }

            //New Inertia
            let newInertia = psoBeta * particle.inertia
            particle.inertia = Math.max(Math.min(newInertia, 10000), psoInertiaMin)

            //New Position
            for (let i = 0; i < Nd; i++) {
                let j = Math.round(particle.ps[i].ind + particle.velocity[i])
                j = _modifyParameter(j, dps[i].n - 1, ModeOutLimit)
                particle.ps[i].ind = j
                particle.ps[i].value = dps[i].values[j]
            }

            //calcFitness
            let s = await calcFitness(particle, 'evolution')
            particle.fitness = s.fitness

            //更新個體歷史最佳 BS
            if (particle.bs.fitness > particle.fitness) {
                particle.bs = { ps: cloneDeep(particle.ps), fitness: particle.fitness }
            }

            //更新全域歷史最佳 GS
            if (gs.fitness > particle.fitness) {
                gs = { ps: cloneDeep(particle.ps), fitness: particle.fitness }
            }
        }
    }

    //搜尋
    let i = -1
    while (true) {
        i++

        //dynamic C1
        let psoC1 = _dynamicValue(psoC1Start, psoC1End, psoC1Dynamic, iContinue, NContiguous)

        //dynamic C2
        let psoC2 = _dynamicValue(psoC2Start, psoC2End, psoC2Dynamic, iContinue, NContiguous)

        //Evolution
        await runEvolution(psoC1, psoC2)

        //sortBy particles by fitness
        particles = sortBy(particles, 'fitness')

        //push history
        hists.push(cloneDeep(particles[0]))

        //bestSolution (用 gs 因為 gs 已是全域最佳)
        if (bestSolution.fitness > gs.fitness) {

            //update
            bestSolution = { ps: cloneDeep(gs.ps), fitness: gs.fitness }

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

            //由前往後處理, 不變更當前最佳粒子particles[0], 故k是從1至Np-1
            for (let k = 1; k <= Np - 1; k++) {
                let p = await genParticle('strategyRepeat')
                particles[k] = p
            }

            //sortBy
            particles = sortBy(particles, 'fitness')

            //重產非最佳解未必會有更優最佳解, 仍須重置iContinue避免再搜尋策略弱化
            iContinue = 0

            //次數增加
            iRepeat += 1

        }
        if (UseRepeat && iContinue >= NContiguous && iRepeat < NRepeat) {
            await strategyRepeat()
        }

        //strategyImmigration, 移民策略, 對應AE_PSO_Strategy_Immigration
        //VB原碼 AE_PSO_QuickSort 開頭 Exit Sub 讓排序被 disable, 此處修正為先 sortBy 再比鄰
        let strategyImmigration = async () => {

            //由後往前處理, 不變更當前最佳粒子particles[0], 故k是從Np-1至1
            for (let k = Np - 1; k >= 1; k--) {
                if (_isSameSolution(particles[k - 1], particles[k])) {
                    let p = await genParticle('strategyImmigration')
                    particles[k] = p
                }
            }

            //sortBy
            particles = sortBy(particles, 'fitness')

        }
        if (UseImmigration) {
            await strategyImmigration()
        }

        //strategyLocalSearch, 局部搜尋策略
        let strategyLocalSearch = async () => {

            //依LocalSearchMethod分派局部搜尋(只傳 particles[0] 的 ps+fitness, 不傳整個 particle)
            let currentBest = { ps: cloneDeep(particles[0].ps), fitness: particles[0].fitness }
            let improved = await _localSearch(LocalSearchMethod, currentBest, dps, funFit, calcFitness, ModeOutLimit)

            //check
            if (improved.fitness >= particles[0].fitness) {
                return
            }

            //update particle[0] 之 ps + fitness (velocity / inertia / bs 保留)
            particles[0].ps = improved.ps
            particles[0].fitness = improved.fitness

            //同步更新 gs
            if (gs.fitness > improved.fitness) {
                gs = { ps: cloneDeep(improved.ps), fitness: improved.fitness }
            }

        }
        if (UseLocalSearch) {
            await strategyLocalSearch()
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

        //stop
        if (isestr(stopMode)) {
            stopNl = i
            stopExecutions = iExecute
            break
        }

        //funEndLoop
        if (isfun(funEndLoop)) {
            funEndLoop(cloneDeep(particles), cloneDeep(bestSolution), i)
        }

    }

    //r
    let r = {
        bestSolution,
        hists,
        stopMode,
        stopNl,
        stopExecutions,
    }

    return r
}


export default omlPSO
