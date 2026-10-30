import { kFun, kNum, kPnum, kPint, chkParams } from './_checkParam.mjs'


/**
 * 二分搜尋法
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/binarySearch.test.js Github}
 * @memberOf w-optimization
 * @param {Function} fun 輸入適應函數，將傳入變數x，需回傳適應函數值，以求解最小值為目標。種類：函數，必給
 * @param {Number|String} xMin 輸入初始搜尋範圍最小值數字或數字字串。種類：有效數字，必給，數字字串轉換後使用，'-'、'NP'、''等非數字字串與null、布林、NaN、Infinity皆為無效
 * @param {Number|String} xMax 輸入初始搜尋範圍最大值數字或數字字串。種類：有效數字，必給，處置同xMin
 * @param {Object} [opt={}] 輸入設定物件，預設{}。種類：一般物件，undefined或null視為未給，其餘非一般物件為無效；未宣告之鍵忽略；各鍵給了而不符種類即為無效，不改用預設
 * @param {Number|String} [opt.delta=0.1] 輸入步長，預設0.1。種類：有效數字，正數(現行演算法未使用此值，僅檢測)
 * @param {Number|String} [opt.maxIterations=100] 輸入最大搜尋次數，預設100。種類：有效數字，正整數
 * @returns {Object} 回傳求解後結果物件，含鍵值x,y，x為求解後變數組，y為最優適應函數值；輸入無效時同步throw Error，訊息格式為`invalid <名稱>: must be <種類描述>`，不含輸入值
 * @example
 *
 * function fun(param) {
 *     let x = param / 180 * Math.PI
 *     return Math.sin(x)
 * }
 *
 * console.log(binarySearch(fun, 90, 300))
 * // => { y: -0.8660254037844386, x: 300 }
 *
 * console.log(binarySearch(fun, 90, 267))
 * // => { y: -0.9986295347545739, x: 267 }
 *
 * console.log(binarySearch(fun, 90, 270))
 * // => { y: -1, x: 270 }
 *
 */
function binarySearch(fun, xMin, xMax, opt = {}) {

    //check, 一般參數與opt先於任何適應函數呼叫檢測, 檢測之值即使用之值(數字字串已轉換)
    let c = chkParams([[fun, 'fun', kFun], [xMin, 'xMin', kNum], [xMax, 'xMax', kNum]], opt, {
        delta: [kPnum, 0.1],
        maxIterations: [kPint, 100],
    })
    if (c.err !== '') {
        throw new Error(c.err)
    }
    xMin = c.vs[1]
    xMax = c.vs[2]
    let maxIterations = c.o.maxIterations

    //fL, fU, fC
    let fL = fun(xMin)
    let fU = fun(xMax)
    let xMid = (xMin + xMax) / 2
    let fC = fun(xMid)
    let iIterations = 0
    let r = null
    while (true) {
        // console.log('fL', fL, 'fC', fC, 'fU', fU)
        iIterations++

        //check
        if (iIterations > maxIterations) {
            return null
        }

        //check fL已為最小值
        if (fL <= fU && fL <= fC) {
            r = {
                y: fL,
                x: xMin,
            }
            break
        }

        //check fU已為最小值
        if (fU <= fL && fU <= fC) {
            r = {
                y: fU,
                x: xMax,
            }
            break
        }

        //update
        if (fU >= fL) {
            //fU使用fC
            fU = fC
            xMax = xMid
            fU = fun(xMax)
        }
        else {
            //fL使用fC
            fL = fC
            xMin = xMid
            fL = fun(xMin)
        }
        xMid = (xMin + xMax) / 2
        fC = fun(xMid)

    }

    return r
}


export default binarySearch
