import assert from 'assert'
import goldenSection from '../src/goldenSection.mjs'


describe('goldenSection', function() {

    function fun(param) {
        let x = param / 180 * Math.PI
        return Math.sin(x)
    }

    // console.log(await goldenSection(fun, -360, 360))
    // => { count: 56, y: -1, x: -89.99999939558693 }
    let rt1 = { count: 56, y: -1, x: -89.99999939558693 }

    it(`should return ${JSON.stringify(rt1)} when input fun, -360, 360`, async function() {
        let rr = await goldenSection(fun, -360, 360)
        let rt = rt1
        assert.strict.deepEqual(rr, rt)
    })

})
