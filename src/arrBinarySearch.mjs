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
 * 陣列二分搜尋法
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/arrBinarySearch.test.js Github}
 * @memberOf w-optimization
 * @param {Array} arr 輸入既有數據陣列
 * @param {Number} x 輸入尋找數字
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Boolean} [opt.sorted=false] 輸入陣列arr是否已經排序，若陣列已排序可加快速度，預設為false
 * @returns {Object} 回傳求解後結果物件，含鍵值x,y，x為求解後變數組，y為最優適應函數值
 * @example
 *
 * let arr = [1, 2, 4, 6, 1, 100, 0, 10000, 3]
 *
 * console.log(arrBinarySearch(arr, 2))
 * // => { ind: 1, indSorted: 3, value: 2 }
 *
 * console.log(arrBinarySearch(arr, 5))
 * // => null
 *
 */
function arrBinarySearch(arr, x, opt = {}) {

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
    let iStart = 0
    let iEnd = size(arr) - 1
    while (iStart <= iEnd) {

        //iMid
        let iMid = Math.floor((iStart + iEnd) / 2)
        // console.log(iMid, arr[iMid])

        //checj
        if (arr[iMid].v === x) {
            return {
                ind: arr[iMid].k,
                indSorted: iMid,
                value: x,
                // diff: 0,
            }
        }

        if (x < arr[iMid].v) {
            iEnd = iMid - 1
        }
        else {
            iStart = iMid + 1
        }
    }

    return null
}


export default arrBinarySearch
