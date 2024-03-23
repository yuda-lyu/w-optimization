import assert from 'assert'
import goldenSectionLiberate from '../src/goldenSectionLiberate.mjs'


describe('goldenSectionLiberate', function() {

    function fun(param) {
        let x = param / 180 * Math.PI
        return Math.sin(x)
    }

    // console.log(await goldenSectionLiberateLiberate(fun, 0))
    // => { count: 67, y: -1, x: -89.99999939787351 }
    let rt1 = { count: 67, y: -1, x: -89.99999939787351 }

    it(`should return ${JSON.stringify(rt1)} when input fun, 0`, async function() {
        let rr = await goldenSectionLiberate(fun, 0)
        let rt = rt1
        assert.strict.deepEqual(rr, rt)
    })

})
