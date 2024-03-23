import assert from 'assert'
import nelderMead from '../src/nelderMead.mjs'


describe('nelderMead', function() {

    async function fun(params) {
        let x = params[0] / 180 * Math.PI
        return Math.sin(x)
    }

    // console.log(await nelderMead(fun, [0]))
    // => { count: 78, y: -1, x: [ -90.0000000000001 ] }
    let rt1 = { count: 78, y: -1, x: [-90.0000000000001] }

    // console.log(await nelderMead(fun, [87]))
    // => { count: 58, y: -1, x: [ -90.00000057220495 ] }
    let rt2 = { count: 58, y: -1, x: [-90.00000057220495] }

    // console.log(await nelderMead(fun, [90]))
    // => { count: 58, y: -1, x: [ 270 ] }
    let rt3 = { count: 58, y: -1, x: [270] }

    it(`should return ${JSON.stringify(rt1)} when input fun, [0]`, async function() {
        let rr = await nelderMead(fun, [0])
        let rt = rt1
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt2)} when input fun, [87]`, async function() {
        let rr = await nelderMead(fun, [87])
        let rt = rt2
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt3)} when input fun, [90]`, async function() {
        let rr = await nelderMead(fun, [90])
        let rt = rt3
        assert.strict.deepEqual(rr, rt)
    })

})
