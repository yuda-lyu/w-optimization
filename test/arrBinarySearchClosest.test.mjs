import assert from 'assert'
import arrBinarySearchClosest from '../src/arrBinarySearchClosest.mjs'


describe(`arrBinarySearchClosest`, function() {

    let arr = [1, 2, 4, 6, 1, 100, 0, 10000, 3]

    let rr1 = { ind: 1, indSorted: 3, value: 2, diff: 0 }
    it(`should return ${JSON.stringify(rr1)} when input ${JSON.stringify(arr)}, 2`, async function() {
        let r = arrBinarySearchClosest(arr, 2)
        assert.strict.deepStrictEqual(r, rr1)
    })

    let rr2 = { ind: 2, indSorted: 5, value: 4, diff: 0.5 }
    it(`should return ${JSON.stringify(rr2)} when input ${JSON.stringify(arr)}, 4.5`, async function() {
        let r = arrBinarySearchClosest(arr, 4.5)
        assert.strict.deepStrictEqual(r, rr2)
    })

    let rr3 = { ind: 3, indSorted: 6, value: 6, diff: 1 }
    it(`should return ${JSON.stringify(rr3)} when input ${JSON.stringify(arr)}, 5`, async function() {
        let r = arrBinarySearchClosest(arr, 5)
        assert.strict.deepStrictEqual(r, rr3)
    })

})
