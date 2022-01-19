import get from 'lodash/get'
import isNumber from 'lodash/isNumber'
import isnum from 'wsemi/src/isnum.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'


/**
 * 黃金比例搜尋法(1維)，求解最小值所在
 *
 * Fork: {@link https://github.com/scijs/minimize-golden-section-1d/blob/master/src/golden-section-minimize.js golden-section-minimize.js}
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/goldenSection.test.js Github}
 * @memberOf w-optimization
 * @param {Function} fun 輸入適應函數，將傳入變數x，需回傳適應函數值，以求解最小值所在起訖範圍為目標
 * @param {Number} xL 輸入初始最小值數字
 * @param {Number} xU 輸入初始最大值數字
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Number} [opt.minTolerance=1e-8] 輸入最小收斂門檻值數字，預設1e-8
 * @param {Number} [opt.maxIterations=100] 輸入最大迭代次數整數，預設100
 * @returns {Promise} 回傳Promise，resolve為求解後結果物件，含鍵值x,y，x為求解後變數組，y為最優適應函數值，reject為失敗訊息
 * @example
 *
 * async function test() {
 *
 *     function fun(param) {
 *         let x = param / 180 * Math.PI
 *         return Math.sin(x)
 *     }
 *
 *     console.log(await goldenSection(fun, -360, 360))
 *     // => { count: 56, y: -1, x: -89.99999939558693 }
 *
 * }
 *
 * test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function goldenSection(fun, xL, xU, opt = {}) {

    //check fun
    if (!isfun(fun)) {
        return Promise.reject('invalid fun')
    }

    //check xL
    if (!isnum(xL)) {
        return Promise.reject('xL is not a number')
    }

    //check xU
    if (!isnum(xU)) {
        return Promise.reject('xU is not a number')
    }

    //minTolerance
    let minTolerance = get(opt, 'minTolerance')
    if (!isnum(minTolerance)) {
        minTolerance = 1e-8
    }
    minTolerance = cdbl(minTolerance)

    //maxIterations
    let maxIterations = get(opt, 'maxIterations')
    if (!isnum(maxIterations)) {
        maxIterations = 100
    }
    maxIterations = cdbl(maxIterations)

    //countCalc
    let countCalc = 0

    //func
    async function func() { //要使用arguments不能用箭頭函數
        let r = fun(...arguments)
        if (ispm(r)) {
            r = await r
        }
        countCalc++
        return r
    }

    let xF
    let fF
    let PHI_RATIO = 2 / (1 + Math.sqrt(5))
    let iteration = 0

    // Initial bounds
    let x1 = xU - PHI_RATIO * (xU - xL)
    let x2 = xL + PHI_RATIO * (xU - xL)
    let f1 = await func(x1)
    let f2 = await func(x2)
    // console.log('x1', x1, 'f1', f1, 'x2', x2, 'f2', f2)

    // Store these values so that we can return these if they're better.
    // This happens when the minimization falls *approaches* but never
    // actually reaches one of the bounds
    let fL = await func(xL)
    let fU = await func(xU)
    let xL0 = xL
    let xU0 = xU
    // console.log('xL', xL, 'fL', fL, 'xU', xU, 'fU', fU)

    // Simple, robust golden section minimization:
    while (++iteration < maxIterations && Math.abs(xU - xL) > minTolerance) {
        if (f2 > f1) {
            xU = x2
            x2 = x1
            f2 = f1
            x1 = xU - PHI_RATIO * (xU - xL)
            f1 = await func(x1)
        }
        else {
            xL = x1
            x1 = x2
            f1 = f2
            x2 = xL + PHI_RATIO * (xU - xL)
            f2 = await func(x2)
        }
    }

    //update xF, fF
    xF = 0.5 * (xU + xL)
    fF = 0.5 * (f1 + f2)
    // console.log('xF', xF, 'fF', fF)

    //check
    if (!isNumber(f2) || !isNumber(f1) || iteration === maxIterations) {
        return null
    }

    //bestx, besty
    let bestx = null
    let besty = null
    if (fL < fF) {
        bestx = xL0
        besty = fL
    }
    else if (fU < fF) {
        bestx = xU0
        besty = fU
    }
    else {
        bestx = xF
        besty = fF
    }

    return {
        count: countCalc,
        y: besty,
        x: bestx,
    }
}

export default goldenSection
