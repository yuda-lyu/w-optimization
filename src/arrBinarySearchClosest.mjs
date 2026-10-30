import size from 'lodash-es/size.js'
import each from 'lodash-es/each.js'
import sortBy from 'lodash-es/sortBy.js'
import { kNum, kBol, kNumArrN1, chkParams } from './_checkParam.mjs'


/**
 * 陣列二分搜尋法，求最接近值
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/arrBinarySearchClosest.test.js Github}
 * @memberOf w-optimization
 * @param {Array} arr 輸入數據陣列，元素為數字或數字字串。種類：資料陣列，必給，元素為廣義數字：數字與數字字串(轉換後使用)參與搜尋，非數字字串(如'-'、'NP'、'')為標記字串，原樣保留於原位置、不參與搜尋、不算錯，null、布林、NaN、Infinity、BigInt、物件等其餘元素為無效，訊息帶元素索引；空陣列或無數字元素時回傳null
 * @param {Number|String} x 輸入尋找數字或數字字串。種類：有效數字，必給，數字字串轉換後使用，'-'、'NP'、''等非數字字串與null、布林、NaN、Infinity皆為無效
 * @param {Object} [opt={}] 輸入設定物件，預設{}。種類：一般物件，undefined或null視為未給，其餘非一般物件為無效；未宣告之鍵忽略；各鍵給了而不符種類即為無效，不改用預設
 * @param {Boolean} [opt.sorted=false] 輸入陣列arr是否已經排序，若陣列已排序可加快速度，預設為false。種類：布林，只收true或false('true'、'n'、1等皆為無效)
 * @returns {Object} 回傳求解後最接近值物件，含鍵值ind(於原陣列之索引),indSorted(於排序後數字陣列之索引),value(最接近值),diff(與x之差值絕對值)；無數字可搜尋時回傳null；輸入無效時同步throw Error，訊息格式為`invalid <名稱>: must be <種類描述>`，不含輸入值
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

    //check, 檢測之值即使用之值(數字字串已轉換, 標記字串原樣保留)
    let c = chkParams([[arr, 'arr', kNumArrN1], [x, 'x', kNum]], opt, {
        sorted: [kBol, false],
    })
    if (c.err !== '') {
        throw new Error(c.err)
    }
    x = c.vs[1]
    let sorted = c.o.sorted

    //轉成物件陣列, 僅數字參與搜尋, 標記字串不參與, k為原陣列之索引
    let ar = []
    each(c.vs[0], (v, k) => {
        if (typeof v === 'number') {
            ar.push({ v, k })
        }
    })
    arr = ar

    //無數字可搜尋
    if (size(arr) === 0) {
        return null
    }

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
