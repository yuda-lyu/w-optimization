import get from 'lodash-es/get.js'
import map from 'lodash-es/map.js'
import cloneDeep from 'lodash-es/cloneDeep.js'
import isnum from 'wsemi/src/isnum.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import arrHas from 'wsemi/src/arrHas.mjs'
import _genSolution from './_genSolution.mjs'
import _modifyParameter from './_modifyParameter.mjs'
import _validateDps from './_validateDps.mjs'


//sdmNeighbor, 對每變數試 ±1, 選最大改善方向作為下一步, 對應VB之AE_SDM_Neighbor
//回傳: { ps, fitness, level, dir } — level/dir記住來源方向(下次跳過避免回頭)
async function sdmNeighbor(sCurrent, dps, ModeOutLimit, calcFitness, lastLevel, lastDir) {

    let Nd = dps.length
    let sMove = cloneDeep(sCurrent)
    let rFitnessImprove = 0
    let levelOut = -1
    let dirOut = 0

    for (let i = 0; i < Nd; i++) {
        for (let k = -1; k <= 1; k += 2) {

            //跳過「來源方向」: 上次從 i 變數 k=-dir 方向跳來, 這次不要回頭
            if (lastLevel === i && lastDir === -k) {
                continue
            }

            //新ind
            let oldInd = sCurrent.ps[i].ind
            let j = oldInd + k
            j = _modifyParameter(j, dps[i].n - 1, ModeOutLimit)

            //ind真的有變才算fitness
            if (j !== oldInd) {
                let _ps = cloneDeep(sCurrent.ps)
                _ps[i].ind = j
                _ps[i].value = dps[i].values[j]
                let neighbor = await calcFitness({ ps: _ps }, 'sdmNeighbor')

                //記錄最大改善
                let improve = sCurrent.fitness - neighbor.fitness
                if (rFitnessImprove < improve) {
                    rFitnessImprove = improve
                    sMove = neighbor
                    levelOut = i
                    dirOut = k
                }
            }
        }
    }

    return { sMove, level: levelOut, dir: dirOut }
}


//sdmGold, 沿差分梯度方向用黃金比例步長搜尋, 找凹槽後二分法精煉
//對應VB之AE_SDM_Gold
async function sdmGold(sOriginal, dps, calcFitness) {

    let Nd = dps.length
    let rDifference = [] //rDifference[i][k] (k=0: -1方向, k=1: +1方向)
    let rGradient = new Array(Nd).fill(0)
    let sEver = cloneDeep(sOriginal)

    //Step1: 計算各變數兩側fitness差
    for (let i = 0; i < Nd; i++) {
        rDifference.push([0, 0])
        for (let k = 0; k <= 1; k++) {
            let kSign = (k === 0) ? -1 : 1
            let oldInd = sOriginal.ps[i].ind
            let j = oldInd + kSign
            j = _modifyParameter(j, dps[i].n - 1, 'Limit') //Gold硬性用limit

            if (j !== oldInd) {
                let _ps = cloneDeep(sOriginal.ps)
                _ps[i].ind = j
                _ps[i].value = dps[i].values[j]
                let neighbor = await calcFitness({ ps: _ps }, 'sdmGold')

                if (sEver.fitness > neighbor.fitness) {
                    sEver = neighbor
                }

                rDifference[i][k] = sOriginal.fitness - neighbor.fitness
            }
            else {
                rDifference[i][k] = 0
            }
        }
    }

    //Step2: 判斷是否已是局部最佳(每變數兩側皆未改善)
    let iLocalBest = 0
    for (let i = 0; i < Nd; i++) {
        if (rDifference[i][0] <= 0 && rDifference[i][1] <= 0) {
            iLocalBest++
        }
    }
    if (iLocalBest === Nd) {
        return (sOriginal.fitness < sEver.fitness) ? sOriginal : sEver
    }

    //Step3: 計算梯度
    let rLen = 0
    for (let i = 0; i < Nd; i++) {
        let dLeft = rDifference[i][0]
        let dRight = rDifference[i][1]
        if (dLeft >= 0 && dRight >= 0) {
            //兩側都改善 → 選大者方向
            rGradient[i] = (dLeft > dRight) ? -dLeft : dRight
        }
        else if (dLeft >= 0 && dRight < 0) {
            rGradient[i] = -dLeft
        }
        else if (dLeft < 0 && dRight >= 0) {
            rGradient[i] = dRight
        }
        else {
            rGradient[i] = 0
        }
        rLen += rGradient[i] * rGradient[i]
    }
    rLen = Math.sqrt(rLen)
    if (rLen === 0) {
        return (sOriginal.fitness < sEver.fitness) ? sOriginal : sEver
    }
    for (let i = 0; i < Nd; i++) {
        rGradient[i] = rGradient[i] / rLen
    }

    //Step4: 最大跳躍距離
    let rDistanceMax = 0
    for (let i = 0; i < Nd; i++) {
        rDistanceMax += dps[i].n * dps[i].n
    }
    rDistanceMax = Math.sqrt(rDistanceMax)
    if (rDistanceMax > 32768) {
        rDistanceMax = 32768
    }

    //Step5: 沿梯度方向用 1.618 比例步長跳躍, 找凹槽
    let sMoveStart = cloneDeep(sOriginal)
    let sMoveEnd = cloneDeep(sOriginal)
    let sMoveMiddle = cloneDeep(sOriginal)
    let rRatio = 1.618
    let rDistance = 1 / rRatio
    let cStateZone = ''
    let nCount = 0

    while (true) {

        //內迴圈: 嘗試擴大跳躍距離直到能真實移動
        let cStateJump = 'none'
        let sNeighbor = null

        while (true) {
            rDistance = rDistance * rRatio

            if (rDistance > rDistanceMax) {
                cStateJump = 'over'
                break
            }

            //計算新點
            let _ps = cloneDeep(sOriginal.ps)
            let iSame = 0
            for (let i = 0; i < Nd; i++) {
                let j = sOriginal.ps[i].ind + Math.round(rGradient[i] * rDistance)
                j = _modifyParameter(j, dps[i].n - 1, 'Limit')
                _ps[i].ind = j
                _ps[i].value = dps[i].values[j]
                if (j === sOriginal.ps[i].ind) {
                    iSame++
                }
            }

            if (iSame !== Nd) {
                cStateJump = 'move'
                sNeighbor = { ps: _ps, fitness: null }
                break
            }
        }

        if (cStateJump === 'over') {
            cStateZone = 'over'
            break
        }

        //算fitness
        sNeighbor = await calcFitness(sNeighbor, 'sdmGold')

        if (sEver.fitness > sNeighbor.fitness) {
            sEver = sNeighbor
        }

        nCount++

        //比對, 判斷是否找到凹槽
        if (nCount === 1) {
            if (sMoveMiddle.fitness > sNeighbor.fitness) {
                //跳出局部 → 設為新 middle
                sMoveMiddle = sNeighbor
            }
            else {
                //搜尋方向錯誤 → 回原解
                return (sMoveStart.fitness < sEver.fitness) ? sMoveStart : sEver
            }
        }
        else {
            if (sMoveMiddle.fitness > sNeighbor.fitness) {
                //繼續變好 → 更新 middle
                sMoveMiddle = sNeighbor
            }
            else {
                //找到凹槽(start - middle - end)
                sMoveEnd = sNeighbor
                cStateZone = 'concave'
                break
            }
        }
    }

    if (cStateZone === 'over') {
        return (sMoveMiddle.fitness < sEver.fitness) ? sMoveMiddle : sEver
    }

    //Step6: 二分搜尋細化 middle
    let safetyMax = 50
    let safety = 0
    while (true) {
        safety++
        if (safety > safetyMax) {
            break
        }

        //新中點
        let _ps = cloneDeep(sMoveMiddle.ps)
        for (let i = 0; i < Nd; i++) {
            let j = Math.round(sMoveStart.ps[i].ind * 0.5 + sMoveEnd.ps[i].ind * 0.5)
            _ps[i].ind = j
            _ps[i].value = dps[i].values[j]
        }
        let sMid = await calcFitness({ ps: _ps }, 'sdmGold')

        if (sEver.fitness > sMid.fitness) {
            sEver = sMid
        }

        //中點等於 start 或 end (ind全同) → 已收斂
        let sameStart = sMid.ps.every((p, i) => p.ind === sMoveStart.ps[i].ind)
        let sameEnd = sMid.ps.every((p, i) => p.ind === sMoveEnd.ps[i].ind)
        if (sameStart || sameEnd) {
            return [sMoveStart, sMoveEnd, sEver].reduce((a, b) => (a.fitness < b.fitness) ? a : b)
        }

        //中點比兩側都好 → 縮窄
        if (sMid.fitness <= sMoveStart.fitness && sMid.fitness <= sMoveEnd.fitness) {
            if (sMoveStart.fitness <= sMoveEnd.fitness) {
                sMoveEnd = sMid
            }
            else {
                sMoveStart = sMid
            }
            sMoveMiddle = sMid
        }
        else if (sMid.fitness >= sMoveStart.fitness && sMid.fitness <= sMoveEnd.fitness) {
            sMoveEnd = sMid
        }
        else if (sMid.fitness <= sMoveStart.fitness && sMid.fitness >= sMoveEnd.fitness) {
            sMoveStart = sMid
        }
        else {
            //中點變差 → 提前結束
            return [sMoveStart, sMoveEnd, sEver].reduce((a, b) => (a.fitness < b.fitness) ? a : b)
        }
    }

    return [sMoveStart, sMoveEnd, sEver].reduce((a, b) => (a.fitness < b.fitness) ? a : b)
}


async function sdm(dps, funFit, opt = {}) {
    //Steepest Descent Method, 最陡下降法
    //此版本同時支援「主演算法」與「LocalSearch helper」雙用途
    //
    //sdmMode:
    //  - 'Neighbor': 對每變數試 ±1, 選最大改善方向, 反覆直到無改善
    //  - 'OneGold':  做一次梯度+黃金比+二分搜尋
    //  - 'Gold':     重複 OneGold 直到 fitness 不變

    //_validateDps
    _validateDps(dps)

    //sdmMode
    let sdmMode = get(opt, 'sdmMode', '')
    if (!arrHas(sdmMode, ['Neighbor', 'OneGold', 'Gold'])) {
        sdmMode = 'Neighbor'
    }

    //ModeOutLimit
    let ModeOutLimit = get(opt, 'ModeOutLimit', '')
    if (!arrHas(ModeOutLimit, ['Mapping', 'Limit', 'Random'])) {
        ModeOutLimit = 'Mapping'
    }

    //iExecute
    let iExecute = 0

    //calcFitness
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

    let bestSolution = cloneDeep(s)

    if (sdmMode === 'Neighbor') {
        //對每變數試 ±1, 選最大改善方向, 反覆直到無改善
        let lastLevel = -1
        let lastDir = 0
        while (true) {
            let r = await sdmNeighbor(s, dps, ModeOutLimit, calcFitness, lastLevel, lastDir)
            if (s.fitness === r.sMove.fitness) {
                break
            }
            s = r.sMove
            lastLevel = r.level
            lastDir = r.dir
            if (bestSolution.fitness > s.fitness) {
                bestSolution = cloneDeep(s)
            }
        }
    }
    else if (sdmMode === 'OneGold') {
        //做一次 Gold
        let r = await sdmGold(s, dps, calcFitness)
        if (bestSolution.fitness > r.fitness) {
            bestSolution = r
        }
    }
    else if (sdmMode === 'Gold') {
        //重複 Gold 直到無改善
        let safetyMax = 50
        let safety = 0
        while (true) {
            safety++
            if (safety > safetyMax) break
            let r = await sdmGold(s, dps, calcFitness)
            if (s.fitness === r.fitness) {
                break
            }
            s = r
            if (bestSolution.fitness > s.fitness) {
                bestSolution = cloneDeep(s)
            }
        }
    }

    return {
        bestSolution,
        stopExecutions: iExecute,
    }
}


export default sdm
