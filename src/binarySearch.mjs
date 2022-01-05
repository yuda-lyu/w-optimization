import get from 'lodash/get'
import isfun from 'wsemi/src/isfun'
import isnum from 'wsemi/src/isnum'
import cdbl from 'wsemi/src/cdbl'


/**
 * 二分搜尋法
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/binarySearch.test.js Github}
 * @memberOf w-optimization
 * @param {Array} arr 輸入既有數據陣列
 * @param {Number} x 輸入尋找數字
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Boolean} [opt.sorted=false] 輸入陣列arr是否已經排序，若陣列已排序可加快速度，預設為false
 * @returns {Object} 回傳求解後結果物件，含鍵值x,y，x為求解後變數組，y為最優適應函數值
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

    //check fun
    if (!isfun(fun)) {
        throw new Error('invalid fun')
    }

    //check xMin
    if (!isnum(xMin)) {
        throw new Error('xMin is not a number')
    }
    xMin = cdbl(xMin)

    //check xMax
    if (!isnum(xMax)) {
        throw new Error('xMax is not a number')
    }
    xMax = cdbl(xMax)

    //dx
    let dx = get(opt, 'delta')
    if (!isnum(dx)) {
        dx = 0.1
    }
    dx = cdbl(dx)

    //fL, fU, fC
    let fL = fun(xMin)
    let fU = fun(xMax)
    let xMid = (xMin + xMax) / 2
    let fC = fun(xMid)
    let r = null
    while (true) {
        // console.log('fL', fL, 'fC', fC, 'fU', fU)

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
