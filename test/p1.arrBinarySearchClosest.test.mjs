import assert from 'assert'
import arrBinarySearchClosest from '../src/arrBinarySearchClosest.mjs'


describe('arrBinarySearchClosest', function() {

    let arr = [1, 2, 4, 6, 1, 100, 0, 10000, 3]

    // console.log(arrBinarySearchClosest(arr, 2))
    // => { ind: 1, indSorted: 3, value: 2 }
    let rt1 = { ind: 1, indSorted: 3, value: 2, diff: 0 }

    // console.log(arrBinarySearchClosest(arr, 4.5))
    // => { ind: 2, indSorted: 5, value: 4, diff: 0.5 }
    let rt2 = { ind: 2, indSorted: 5, value: 4, diff: 0.5 }

    // console.log(arrBinarySearchClosest(arr, 5))
    // => { ind: 3, indSorted: 6, value: 6, diff: 1 }
    let rt3 = { ind: 3, indSorted: 6, value: 6, diff: 1 }

    it(`should return ${JSON.stringify(rt1)} when input ${JSON.stringify(arr)}, 2`, function() {
        let rr = arrBinarySearchClosest(arr, 2)
        let rt = rt1
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt2)} when input ${JSON.stringify(arr)}, 4.5`, function() {
        let rr = arrBinarySearchClosest(arr, 4.5)
        let rt = rt2
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt3)} when input ${JSON.stringify(arr)}, 5`, function() {
        let rr = arrBinarySearchClosest(arr, 5)
        let rt = rt3
        assert.strict.deepEqual(rr, rt)
    })

})
