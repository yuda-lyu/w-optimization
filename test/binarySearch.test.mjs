import assert from 'assert'
import binarySearch from '../src/binarySearch.mjs'


describe(`binarySearch`, function() {

    function fun(param) {
        let x = param / 180 * Math.PI
        return Math.sin(x)
    }

    let rr1 = { y: -0.8660254037844386, x: 300 }
    it(`should return ${JSON.stringify(rr1)} when input fun, 90, 300`, async function() {
        let r = binarySearch(fun, 90, 300)
        assert.strict.deepStrictEqual(r, rr1)
    })

    let rr2 = { y: -0.9986295347545739, x: 267 }
    it(`should return ${JSON.stringify(rr2)} when input fun, 90, 267`, async function() {
        let r = binarySearch(fun, 90, 267)
        assert.strict.deepStrictEqual(r, rr2)
    })

    let rr3 = { y: -1, x: 270 }
    it(`should return ${JSON.stringify(rr3)} when input fun, 90, 270`, async function() {
        let r = binarySearch(fun, 90, 270)
        assert.strict.deepStrictEqual(r, rr3)
    })

})
