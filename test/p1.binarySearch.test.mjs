import assert from 'assert'
import binarySearch from '../src/binarySearch.mjs'


describe('binarySearch', function() {

    function fun(param) {
        let x = param / 180 * Math.PI
        return Math.sin(x)
    }

    // console.log(binarySearch(fun, 90, 300))
    // => { y: -0.8660254037844386, x: 300 }
    let rt1 = { y: -0.8660254037844386, x: 300 }

    // console.log(binarySearch(fun, 90, 267))
    // => { y: -0.9986295347545739, x: 267 }
    let rt2 = { y: -0.9986295347545739, x: 267 }

    // console.log(binarySearch(fun, 90, 270))
    // => { y: -1, x: 270 }
    let rt3 = { y: -1, x: 270 }

    it(`should return ${JSON.stringify(rt1)} when input fun, 90, 300`, function() {
        let rr = binarySearch(fun, 90, 300)
        let rt = rt1
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt2)} when input fun, 90, 267`, function() {
        let rr = binarySearch(fun, 90, 267)
        let rt = rt2
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt3)} when input fun, 90, 270`, function() {
        let rr = binarySearch(fun, 90, 270)
        let rt = rt3
        assert.strict.deepEqual(rr, rt)
    })

})
