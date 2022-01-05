import get from 'lodash/get'
import isnum from 'wsemi/src/isnum.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'


/**
 * 黃金比例搜尋法，求解最小值所在起訖範圍
 *
 * Fork: {@link https://github.com/scijs/minimize-golden-section-1d/blob/master/src/bracket-minimum.js bracket-minimum.js}
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/goldenSection.test.js Github}
 * @memberOf w-optimization
 * @param {Function} fun 輸入適應函數，將傳入變數param，需回傳適應函數值，以求解最小值所在起訖範圍為目標
 * @param {Number} x 輸入初始值數字
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Number} [opt.delta=0.1] 輸入最小步長數字，預設0.1
 * @param {Number} [opt.min=-1e20] 輸入搜尋範圍最小值數字，預設-1e20
 * @param {Number} [opt.max=1e20] 輸入搜尋範圍最大值數字，預設1e20
 * @returns {Object} 回傳物件，含鍵值x,y，x為求解後變數組，y為最優適應函數值
 * @example
 *
 * function fun(x) {
 *     let x = x / 180 * Math.PI
 *     return Math.sin(x)
 * }
 *
 * console.log(goldenSection(fun, 0, { min: -360, max: 360 }))
 * // => { min: -360, max: 0.1 }
 *
 * console.log(goldenSection(fun, 87, { min: -360, max: 360 }))
 * // => { min: -360, max: 87.1 }
 *
 * console.log(goldenSection(fun, 90, { min: -360, max: 360 }))
 * // => { min: -360, max: 129.66247495978098 }
 *
 */
function goldenSection(fun, x, opt = {}) {

    //check fun
    if (!isfun(fun)) {
        throw new Error('invalid fun')
    }

    //check x
    if (!isnum(x)) {
        throw new Error('x is not a number')
    }

    //dx
    let dx = get(opt, 'delta')
    if (!isnum(dx)) {
        dx = 0.1
    }
    dx = cdbl(dx)

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

    let xL = x
    let xU = x
    let fMin = fun(x)
    let fL = fMin
    let fU = fMin
    let bounded = false
    let n = 1
    while (!bounded) {
        ++n
        bounded = true

        if (fL <= fMin) {
            // console.log('fL <= fMin', fL, fMin)
            fMin = fL
            xL = Math.max(xMin, xL - dx)
            fL = fun(xL)
            bounded = false
        }
        if (fU <= fMin) {
            // console.log('fU <= fMin', fU, fMin)
            fMin = fU
            xU = Math.min(xMax, xU + dx)
            fU = fun(xU)
            bounded = false
        }

        //update
        fMin = Math.min(fMin, fL, fU)

        //check
        if ((fL === fMin && xL === xMin) || (fU === fMin && xU === xMax)) {
            bounded = true
        }

        //調整步長
        // console.log('dx1', dx)
        dx *= n < 4 ? 2 : Math.exp(n * 0.5)
        // console.log('dx2', dx)

        //check
        if (!isFinite(dx)) {
            return null
        }

    }

    return {
        min: xL,
        max: xU,
    }
}


export default goldenSection
