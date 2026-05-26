import map from 'lodash-es/map.js'
import cloneDeep from 'lodash-es/cloneDeep.js'
import nelderMead from './nelderMead.mjs'
import _discreteValue from './_discreteValue.mjs'
import omlSA from './omlSA.mjs'
import omlTA from './omlTA.mjs'
import sdm from './sdm.mjs'


//_localSearch, 局部搜尋統一分派, 給5隨機演算法之strategyLocalSearch呼叫
//
//method:
//  'NelderMead' (預設): Nelder-Mead simplex法, 對連續變數效果好
//  'Neighbor':          SDM Neighbor模式, 對每變數試 ±1 選最大改善
//  'OneGold':           SDM 一次黃金比例梯度搜尋
//  'Gold':              SDM 重複黃金比例梯度搜尋至無改善
//  'SA':                Simulated Annealing 短週期精煉
//  'TA':                Threshold Accepting 短週期精煉
//
//currentBest: 當前最佳解 { ps, fitness }
//回傳: 改善後的解(若無改善則回傳原解 currentBest)
async function _localSearch(method, currentBest, dps, funFit, calcFitness, ModeOutLimit, opt = {}) {

    if (method === 'NelderMead') {

        let fun = async (vs) => {
            let _ps = map(vs, (v, i) => _discreteValue(v, i, dps))
            let _s = { ps: _ps, fitness: null }
            let s = await calcFitness(_s, 'localSearchNelderMead')
            return s.fitness
        }

        let bestVs = map(currentBest.ps, 'value')
        let r = await nelderMead(fun, bestVs)

        if (r.y >= currentBest.fitness) {
            return currentBest
        }

        let _ps = map(r.x, (v, i) => _discreteValue(v, i, dps))
        return { ps: _ps, fitness: r.y }
    }
    else if (method === 'Neighbor' || method === 'OneGold' || method === 'Gold') {

        let r = await sdm(dps, funFit, {
            sdmMode: method,
            ModeOutLimit,
            initSolution: currentBest,
            calcFitness,
        })
        return r.bestSolution
    }
    else if (method === 'SA') {

        //LocalSearch模式SA: 短週期, NContiguous=5, 溫度=fitness的5%
        let r = await omlSA(dps, funFit, {
            initSolution: currentBest,
            calcFitness,
            ModeOutLimit,
            Nl: 1000,
            NContiguous: 5,
            saInitialTemperature: Math.max(currentBest.fitness * 0.05, 1),
            saAlpha: 0.9,
            UseHists: false,
        })
        return r.bestSolution
    }
    else if (method === 'TA') {

        //LocalSearch模式TA: 短週期, NContiguous=5, 門檻=fitness的5%
        let r = await omlTA(dps, funFit, {
            initSolution: currentBest,
            calcFitness,
            ModeOutLimit,
            Nl: 1000,
            NContiguous: 5,
            taThresholdType: 'Geometric Series',
            taThresholdInitial: Math.max(currentBest.fitness * 0.05, 1),
            UseHists: false,
        })
        return r.bestSolution
    }
    else {
        throw new Error(`invalid LocalSearchMethod[${method}]`)
    }
}


export default _localSearch
