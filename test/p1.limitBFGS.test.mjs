import assert from 'assert'
import limitBFGS from '../src/limitBFGS.mjs'


describe('limitBFGS', function() {

    async function fun(params) {
        let x = params[0] / 180 * Math.PI
        return Math.sin(x)
    }

    // console.log(await limitBFGS(fun, [0]))
    // => { count: 85, y: -1, x: [ -90.00000038876705 ] }
    let rt1 = { count: 85, y: -1, x: [-90.00000038876705] }

    // console.log(await limitBFGS(fun, [87]))
    // => { count: 98, y: -1, x: [ -89.99999967036541 ] }
    let rt2 = { count: 98, y: -1, x: [-89.99999967036541] }

    // console.log(await limitBFGS(fun, [90]))
    // => { count: 2, y: 100000000000000000000, x: null }
    let rt3 = { count: 2, y: 100000000000000000000, x: null }

    it(`should return ${JSON.stringify(rt1)} when input fun, [0]`, async function() {
        let rr = await limitBFGS(fun, [0])
        let rt = rt1
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt2)} when input fun, [87]`, async function() {
        let rr = await limitBFGS(fun, [87])
        let rt = rt2
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt3)} when input fun, [90]`, async function() {
        let rr = await limitBFGS(fun, [90])
        let rt = rt3
        assert.strict.deepEqual(rr, rt)
    })

})
