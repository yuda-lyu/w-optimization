import assert from 'assert'
import arrBinarySearch from '../src/arrBinarySearch.mjs'
import arrBinarySearchClosest from '../src/arrBinarySearchClosest.mjs'
import { runParamSpec, invalidNums, numVariants, assertFail, SECRET } from './tools/paramMatrix.mjs'


//輸入參數檢測(dspec 輸入參數之檢測機制, rulebook R-PARAM): 陣列搜尋類
//  arr: 資料陣列, 元素為廣義數字(N1): 數字與數字字串(轉換後使用)參與搜尋, 非數字字串(標記字串, 含'')原樣保留於原位置且不參與搜尋、不算錯, 其餘元素無效並帶索引
//  x: N2 有效數字(數字字串轉換後只用轉換值, K4)
//  opt.sorted: B1 布林
//  失敗通道: 同步, throw Error


function catchSync(fn) {
    try {
        return { threw: false, v: fn() }
    }
    catch (e) {
        return { threw: true, e }
    }
}


for (let [name, fn] of [['arrBinarySearch', arrBinarySearch], ['arrBinarySearchClosest', arrBinarySearchClosest]]) {

    let arr = [5, 1, 3, 9, 7]


    runParamSpec({
        name,
        fn,
        mode: 'sync',
        args: () => [arr.slice(), 3],
        gen: [
            { i: 1, name: 'x', kind: 'num' },
        ],
        opts: [
            { key: 'sorted', kind: 'bol' },
        ],
    })


    describe(`${name} arr (N1 data array)`, function() {

        //spec(dspec K4): 數字字串元素轉換後使用, 解與數值元素相同
        it('numeric string elements give the same result as numbers', function() {
            let rn = fn([5, 1, 3, 9, 7], 3)
            for (let [label, v] of numVariants(3)) {
                let r = fn([5, 1, v, 9, 7], 3)
                assert.deepStrictEqual(r, rn, `arr[2]=${label}`)
            }
            for (let [label, v] of numVariants(5)) {
                let r = fn([v, 1, 3, 9, 7], 3)
                assert.deepStrictEqual(r, rn, `arr[0]=${label}`)
            }
        })

        //spec(dspec K4): 目標值為數字字串時轉換後比對(原碼以 === 比對, 數字字串恆找不到)
        it('numeric string x finds the same element as number x', function() {
            let rn = fn([5, 1, 3, 9, 7], 3)
            assert.notStrictEqual(rn, null)
            assert.strictEqual(rn.value, 3)
            assert.strictEqual(fn([5, 1, 3, 9, 7], '3').value, 3)
            assert.deepStrictEqual(fn([5, 1, 3, 9, 7], ' 3 '), rn)
        })

        //spec(dspec K8, N1): 標記字串原樣保留於原位置, 不參與搜尋, 結果與移除標記後相同, ind 為原陣列索引
        it('marker strings keep their positions and do not take part; ind is the index in the original array', function() {
            let plain = fn([5, 1, 3, 9, 7], 3)
            for (let m of ['-', 'NP', '', ' ', '0x10', 'N/A', SECRET]) {
                let r = fn([5, 1, m, 3, 9, 7], 3)
                assert.strictEqual(r.value, plain.value, `marker=${JSON.stringify(m)}`)
                assert.strictEqual(r.indSorted, plain.indSorted, `marker=${JSON.stringify(m)}`)
                assert.strictEqual(r.ind, 3, `marker=${JSON.stringify(m)}: ind should be the original index`)
            }
            //標記不被當 0: 搜尋 0 不可找到標記之位置
            let r0 = fn(['-', 5, 1], 0)
            if (name === 'arrBinarySearch') {
                assert.strictEqual(r0, null)
            }
            else {
                assert.strictEqual(r0.value, 1)
                assert.strictEqual(r0.ind, 2)
            }
        })

        //spec(dspec 資料陣列): 無效元素使整個入口失敗, 訊息帶索引不帶值
        it('invalid elements fail with the index and without the value', function() {
            for (let [label, v] of invalidNums({ withNull: true, withUndefined: true })) {
                if (typeof v === 'string') {
                    continue //非數字字串為標記字串, 不算錯
                }
                let r = catchSync(() => fn([5, 1, v, 9], 3))
                assertFail(Object.assign({ threw: r.threw, e: r.e }), 'sync', 'invalid arr[2]: must be a number, numeric string or marker string', `arr[2]=${label}`)
            }
        })

        it('arr itself must be an array', function() {
            for (let [label, v] of [['undefined', undefined], ['null', null], ['number', 5], ['string', 'abc'], ['secret string', SECRET], ['object', {}], ['array-like', { 0: 1, length: 1 }], ['Set', new Set([1])]]) {
                let r = catchSync(() => fn(v, 3))
                assertFail(r, 'sync', 'invalid arr: must be an array', `arr=${label}`)
            }
        })

        //spec(dspec A1 須宣告空陣列之結果): 空陣列或無數字元素時回傳 null
        it('empty array or no numeric element returns null', function() {
            assert.strictEqual(fn([], 3), null)
            assert.strictEqual(fn(['-', 'NP'], 3), null)
        })

        it('sorted: true is honoured (not treated as the default)', function() {
            //未排序陣列以 sorted:true 搜尋時, 不先排序, 以二分法走訪, 結果可與 sorted:false 不同
            let a = [9, 7, 5, 3, 1]
            let rf = fn(a, 3, { sorted: false })
            assert.strictEqual(rf.value, 3)
            let rt = fn(a, 3, { sorted: true })
            assert.notDeepStrictEqual(rt, rf)
        })

    })

}
