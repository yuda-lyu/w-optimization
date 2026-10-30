import get from 'lodash-es/get.js'
import isNumber from 'lodash-es/isNumber.js'
import { kFun, kNum, chkParams } from './_checkParam.mjs'
import { declSetpBracket, declGoldenSection } from './_optDecl.mjs'
import setpBracket from './setpBracket.mjs'
import goldenSection from './goldenSection.mjs'


/**
 * 黃金比例搜尋法(1維)，求解最小值所在
 *
 * Fork: {@link https://github.com/scijs/minimize-golden-section-1d/blob/master/index.js minimize-golden-section-1d.js}
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/goldenSectionLiberate.test.js Github}
 * @memberOf w-optimization
 * @param {Function} fun 輸入適應函數，將傳入變數x，需回傳適應函數值，以求解最小值所在起訖範圍為目標。種類：函數，必給
 * @param {Number|String} x 輸入初始值數字或數字字串。種類：有效數字，必給，數字字串轉換後使用，'-'、'NP'、''等非數字字串與null、布林、NaN、Infinity皆為無效
 * @param {Object} [opt={}] 輸入設定物件，預設{}。種類：一般物件，undefined或null視為未給，其餘非一般物件為無效；未宣告之鍵忽略；各鍵給了而不符種類即為無效，不改用預設
 * @param {Number|String} [opt.min] 輸入搜尋範圍最小值，與opt.max皆給時直接作為求解範圍，否則由setpBracket求範圍並以給定者作為其搜尋界限。種類：有效數字
 * @param {Number|String} [opt.max] 輸入搜尋範圍最大值，說明同opt.min。種類：有效數字
 * @param {Number|String} [opt.delta=0.1] 轉傳setpBracket之步長，預設0.1。種類：有效數字，正數
 * @param {Number|String} [opt.dxR=2] 轉傳setpBracket之步長增長比，預設2。種類：有效數字，正數，或列舉字串'speed'
 * @param {Number|String} [opt.minTolerance=1e-8] 輸入最小收斂門檻值，預設1e-8。種類：有效數字，正數
 * @param {Number|String} [opt.maxIterations=100] 輸入最大迭代次數，預設100。種類：有效數字，正整數
 * @returns {Promise} 回傳Promise，resolve為求解後結果物件，含鍵值x,y，x為求解後變數組，y為最優適應函數值；輸入無效時reject字串，格式為`invalid <名稱>: must be <種類描述>`，不含輸入值
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

    //check, 一般參數與opt先於任何適應函數呼叫檢測(含轉傳給setpBracket與goldenSection之鍵), 檢測之值即使用之值
    let c = chkParams([[fun, 'fun', kFun], [x, 'x', kNum]], opt, {
        ...declSetpBracket,
        min: [kNum, undefined],
        max: [kNum, undefined],
        ...declGoldenSection,
    })
    if (c.err !== '') {
        return Promise.reject(c.err)
    }
    x = c.vs[1]

    //xMin, xMax, 兩者皆給則直接作為範圍, 否則由setpBracket求範圍
    let xMin = c.o.min
    let xMax = c.o.max

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
