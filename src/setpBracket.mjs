import get from 'lodash-es/get.js'
import isNumber from 'lodash-es/isNumber.js'
import isnum from 'wsemi/src/isnum.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'


/**
 * 步階搜尋法(1維)，求解最小值所在起訖範圍
 *
 * Fork: {@link https://github.com/scijs/minimize-golden-section-1d/blob/master/src/bracket-minimum.js bracket-minimum.js}
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/setpBracket.test.js Github}
 * @memberOf w-optimization
 * @param {Function} fun 輸入適應函數，將傳入變數x，需回傳適應函數值，以求解最小值所在起訖範圍為目標
 * @param {Number} x 輸入初始值數字
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Number} [opt.delta=0.1] 輸入步長數字，預設0.1
 * @param {Number} [opt.min=-1e20] 輸入搜尋範圍最小值數字，預設-1e20
 * @param {Number} [opt.max=1e20] 輸入搜尋範圍最大值數字，預設1e20
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
 *     console.log(await setpBracket(fun, 0, { min: -360, max: 360 }))
 *     // => {
 *     //  count: 13,
 *     //  bounded: true,
 *     //  min: -204.70000000000002,
 *     //  max: 0.1,
 *     //  guess: -102.30000000000001,
 *     //  fMin: 0.4178670738010769,
 *     //  fMax: 0.0017453283658983088,
 *     //  fGuess: -0.9770455744352636
 *     // }
 *
 *     console.log(await setpBracket(fun, 87, { min: -360, max: 360 }))
 *     // => {
 *     //  count: 14,
 *     //  bounded: true,
 *     //  min: -322.5,
 *     //  max: 87.1,
 *     //  guess: -117.70000000000002,
 *     //  fMin: 0.6087614290087209,
 *     //  fMax: 0.9987193571841863,
 *     //  fGuess: -0.8853936257544158
 *     //}
 *
 *     console.log(await setpBracket(fun, 90, { min: -360, max: 360 }))
 *     // => {
 *     //  count: 20,
 *     //  bounded: true,
 *     //  min: -319.5,
 *     //  max: 102.7,
 *     //  guess: -114.70000000000002,
 *     //  fMin: 0.6494480483301841,
 *     //  fMax: 0.9755345439458566,
 *     //  fGuess: -0.9085081775267217
 *     //}
 *
 * }
 *
 * test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function setpBracket(fun, x, opt = {}) {

    //check fun
    if (!isfun(fun)) {
        return Promise.reject('invalid fun')
    }

    //check x
    if (!isnum(x)) {
        return Promise.reject('x is not a number')
    }

    //dx
    let dx = get(opt, 'delta')
    if (!isnum(dx)) {
        dx = 0.1 //2 / (1 + Math.sqrt(5)) = 0.6180339887498948
    }
    dx = cdbl(dx)

    //dxR
    let dxR = get(opt, 'dxR')
    if (isnum(dxR) && dxR === 'speed') {
        if (isnum(dxR)) {
            dxR = cdbl(dxR)
        }
    }
    else {
        dxR = 2
    }

    //xMin
    let xMin = get(opt, 'min')
    if (!isnum(xMin)) {
        xMin = -1e20
        // console.log('Number.MIN_VALUE', Number.MIN_VALUE)
    }
    xMin = cdbl(xMin)

    //xMax
    let xMax = get(opt, 'max')
    if (!isnum(xMax)) {
        xMax = 1e20
        // console.log('Number.MAX_VALUE', Number.MAX_VALUE)
    }
    xMax = cdbl(xMax)

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

    let xL = x
    let xU = x
    let xC = x
    let fMin = await func(x)
    let fL = fMin
    let fU = fMin
    let bounded = false
    let n = 1
    while (!bounded) {
        ++n
        bounded = true

        if (fL <= fMin) {
            // console.log('fL <= fMin', fL, fMin)
            xC = xL
            fMin = fL
            xL = Math.max(xMin, xL - dx)
            fL = await func(xL)
            bounded = false
        }
        if (fU <= fMin) {
            // console.log('fU <= fMin', fU, fMin)
            xC = xU
            fMin = fU
            xU = Math.min(xMax, xU + dx)
            fU = await func(xU)
            bounded = false
        }

        //update
        fMin = Math.min(fMin, fL, fU)

        //check
        if ((fL === fMin && xL === xMin) || (fU === fMin && xU === xMax)) {
            bounded = true
        }

        //調整步長
        if (isNumber(dxR)) {
            dx *= dxR
        }
        else if (dxR === 'speed') {
            dx *= n < 4 ? 2 : Math.exp(n * 0.5)
        }
        // console.log('dx', dx)

        //check
        if (!isFinite(dx)) {
            return null
        }

    }

    return {
        count: countCalc,
        bounded,
        min: xL,
        max: xU,
        guess: xC,
        fMin: fL,
        fMax: fU,
        fGuess: fMin,
    }
}


export default setpBracket
