import assert from 'assert'
import arrBinarySearch from '../src/arrBinarySearch.mjs'


describe('arrBinarySearch', function() {

    let arr = [1, 2, 4, 6, 1, 100, 0, 10000, 3]

    // console.log(arrBinarySearch(arr, 2))
    // => { ind: 1, indSorted: 3, value: 2 }
    let rt1 = { ind: 1, indSorted: 3, value: 2 }

    // console.log(arrBinarySearch(arr, 5))
    // => null
    let rt2 = null

    it(`should return ${JSON.stringify(rt1)} when input ${JSON.stringify(arr)}, 2`, function() {
        let rr = arrBinarySearch(arr, 2)
        let rt = rt1
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt2)} when input ${JSON.stringify(arr)}, 5`, function() {
        let rr = arrBinarySearch(arr, 5)
        let rt = rt2
        assert.strict.deepEqual(rr, rt)
    })

})
