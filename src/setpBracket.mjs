import isNumber from 'lodash-es/isNumber.js'
import ispm from 'wsemi/src/ispm.mjs'
import { kFun, kNum, chkParams } from './_checkParam.mjs'
import { declSetpBracket } from './_optDecl.mjs'


/**
 * 步階搜尋法(1維)，求解最小值所在起訖範圍
 *
 * Fork: {@link https://github.com/scijs/minimize-golden-section-1d/blob/master/src/bracket-minimum.js bracket-minimum.js}
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/setpBracket.test.js Github}
 * @memberOf w-optimization
 * @param {Function} fun 輸入適應函數，將傳入變數x，需回傳適應函數值，以求解最小值所在起訖範圍為目標。種類：函數，必給
 * @param {Number|String} x 輸入初始值數字或數字字串。種類：有效數字，必給，數字字串轉換後使用，'-'、'NP'、''等非數字字串與null、布林、NaN、Infinity皆為無效
 * @param {Object} [opt={}] 輸入設定物件，預設{}。種類：一般物件，undefined或null視為未給，其餘非一般物件為無效；未宣告之鍵忽略；各鍵給了而不符種類即為無效，不改用預設
 * @param {Number|String} [opt.delta=0.1] 輸入步長，預設0.1。種類：有效數字，正數
 * @param {Number|String} [opt.dxR=2] 輸入步長增長比，預設2。種類：有效數字，正數，或列舉字串'speed'(加速增長)
 * @param {Number|String} [opt.min=-1e20] 輸入搜尋範圍最小值，預設-1e20。種類：有效數字
 * @param {Number|String} [opt.max=1e20] 輸入搜尋範圍最大值，預設1e20。種類：有效數字
 * @returns {Promise} 回傳Promise，resolve為求解後結果物件，含鍵值count,bounded,min,max,guess,fMin,fMax,fGuess；輸入無效時reject字串，格式為`invalid <名稱>: must be <種類描述>`，不含輸入值
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

    //check, 一般參數與opt先於任何適應函數呼叫檢測, 檢測之值即使用之值(數字字串已轉換)
    let c = chkParams([[fun, 'fun', kFun], [x, 'x', kNum]], opt, declSetpBracket)
    if (c.err !== '') {
        return Promise.reject(c.err)
    }
    x = c.vs[1]

    //dx, 預設0.1(2 / (1 + Math.sqrt(5)) = 0.6180339887498948)
    let dx = c.o.delta

    //dxR, 步長增長比: 正數為固定倍率, 'speed'為加速增長
    let dxR = c.o.dxR

    //xMin, xMax, 預設-1e20, 1e20
    let xMin = c.o.min
    let xMax = c.o.max

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
