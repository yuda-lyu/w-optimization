import assert from 'assert'
import arrBinarySearch from '../src/arrBinarySearch.mjs'


describe(`arrBinarySearch`, function() {

    let arr = [1, 2, 4, 6, 1, 100, 0, 10000, 3]

    let rr1 = { ind: 1, indSorted: 3, value: 2 }
    it(`should return ${JSON.stringify(rr1)} when input ${JSON.stringify(arr)}, 2`, async function() {
        let r = arrBinarySearch(arr, 2)
        assert.strict.deepStrictEqual(r, rr1)
    })

    let rr2 = null
    it(`should return null when input ${JSON.stringify(arr)}, 5`, async function() {
        let r = arrBinarySearch(arr, 5)
        assert.strict.deepStrictEqual(r, rr2)
    })

})
