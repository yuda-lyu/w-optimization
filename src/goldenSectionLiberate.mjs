import get from 'lodash-es/get'
import isNumber from 'lodash-es/isNumber'
import isnum from 'wsemi/src/isnum.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import setpBracket from './setpBracket.mjs'
import goldenSection from './goldenSection.mjs'


/**
 * 黃金比例搜尋法(1維)，求解最小值所在
 *
 * Fork: {@link https://github.com/scijs/minimize-golden-section-1d/blob/master/index.js minimize-golden-section-1d.js}
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/goldenSectionLiberate.test.js Github}
 * @memberOf w-optimization
 * @param {Function} fun 輸入適應函數，將傳入變數x，需回傳適應函數值，以求解最小值所在起訖範圍為目標
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
 *     console.log(await goldenSectionLiberate(fun, 0))
 *     // => { count: 67, y: -1, x: -89.99999939787351 }
 *
 * }
 *
 * test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function goldenSectionLiberate(fun, x, opt = {}) {

    //check fun
    if (!isfun(fun)) {
        return Promise.reject('invalid fun')
    }

    //check x
    if (!isnum(x)) {
        return Promise.reject('x is not a number')
    }

    //xMin
    let xMin = get(opt, 'min')
    if (isnum(xMin)) {
        xMin = cdbl(xMin)
    }

    //xMax
    let xMax = get(opt, 'max')
    if (isnum(xMax)) {
        xMax = cdbl(xMax)
    }

    //countCalc
    let countCalc = 0

    //calc xMin and xMax
    if (!isNumber(xMax) || !isNumber(xMin)) {

        //setpBracket
        let sb = await setpBracket(fun, x, opt)
        // console.log('setpBracket sb', sb)
        xMin = get(sb, 'min')
        xMax = get(sb, 'max')

        //check
        if (!isNumber(xMin) || !isNumber(xMax)) {
            return Promise.reject('can not find bounds by setpBracket')
        }

        //累加countCalc
        countCalc += sb.count

    }

    //goldenSection
    let r = await goldenSection(fun, xMin, xMax, opt)
    // console.log('goldenSection r', r)

    //累加countCalc
    countCalc += r.count

    //save
    r.count = countCalc

    return r
}


export default goldenSectionLiberate
