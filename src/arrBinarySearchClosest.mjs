import get from 'lodash/get'
import size from 'lodash/size'
import map from 'lodash/map'
import filter from 'lodash/filter'
import sortBy from 'lodash/sortBy'
import isearr from 'wsemi/src/isearr'
import isnum from 'wsemi/src/isnum'
import isbol from 'wsemi/src/isbol'
import cdbl from 'wsemi/src/cdbl'


/**
 * 陣列二分搜尋法，求最接近值
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/arrBinarySearchClosest.test.js Github}
 * @memberOf w-optimization
 * @param {Array} arr 輸入數據陣列
 * @param {Number} x 輸入尋找數字
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Boolean} [opt.sorted=false] 輸入陣列arr是否已經排序，若陣列已排序可加快速度，預設為false
 * @returns {Object} 回傳求解後最接近值物件，含鍵值x,y，x為求解後變數組，y為最優適應函數值
 * @example
 *
 * let arr = [1, 2, 4, 6, 1, 100, 0, 10000, 3]
 *
 * console.log(arrBinarySearchClosest(arr, 2))
 * // => { ind: 1, indSorted: 3, value: 2, diff: 0 }
 *
 * console.log(arrBinarySearchClosest(arr, 4.5))
 * // => { ind: 2, indSorted: 5, value: 4, diff: 0.5 }
 *
 * console.log(arrBinarySearchClosest(arr, 5))
 * // => { ind: 3, indSorted: 6, value: 6, diff: 1 }
 *
 */
function arrBinarySearchClosest(arr, x, opt = {}) {

    //check
    if (!isearr(arr)) {
        return null
    }

    //sorted
    let sorted = get(opt, 'sorted')
    if (!isbol(sorted)) {
        sorted = false
    }

    //filter
    arr = filter(arr, isnum)

    //cdbl
    arr = map(arr, cdbl)

    //轉成物件陣列
    arr = map(arr, (v, k) => {
        return { v, k }
    })

    //sortBy
    if (!sorted) {
        arr = sortBy(arr, 'v')
        // console.log('arr', arr)
    }

    //search
    let r = {
        ind: null,
        indSorted: null,
        value: null,
        diff: 1e20,
    }
    let iStart = 0
    let iEnd = size(arr) - 1
    while (iStart <= iEnd) {

        //iMid
        let iMid = Math.floor((iStart + iEnd) / 2)
        // console.log(iMid, arr[iMid])

        //checj
        if (arr[iMid].v === x) {
            r = {
                ind: arr[iMid].k,
                indSorted: iMid,
                value: x,
                diff: 0,
            }
            break
        }

        //update
        let diff = Math.abs(x - arr[iMid].v)
        if (r.diff > diff) {
            // console.log('update r.diff > diff', r.diff, diff, 'value', arr[iMid].v)
            r = {
                ind: arr[iMid].k,
                indSorted: iMid,
                value: arr[iMid].v,
                diff,
            }
        }

        if (x < arr[iMid].v) {
            iEnd = iMid - 1
        }
        else {
            iStart = iMid + 1
        }
    }
    // console.log('r', r)

    return r
}


export default arrBinarySearchClosest
