import assert from 'assert'
import cobyla from '../src/cobyla.mjs'


describe('cobyla', function() {

    async function fun(params) {
        let x = params[0] / 180 * Math.PI
        return Math.sin(x)
    }

    // console.log(await cobyla(fun, [0]))
    // => { count: 32, y: -1, x: [ -90 ] }
    let rt1 = { count: 32, y: -1, x: [-90] }

    //rhobeg需給小否則x會跑去較遠的270
    // console.log(await cobyla(fun, [87], { rhobeg: 5 }))
    // => { count: 66, y: -0.9999999999999911, x: [ -90.00000762939453 ] }
    let rt2 = { count: 66, y: -0.9999999999999911, x: [-90.00000762939453] }

    // console.log(await cobyla(fun, [90]))
    // => { count: 40, y: -1, x: [ 270 ] }
    let rt3 = { count: 40, y: -1, x: [270] }

    it(`should return ${JSON.stringify(rt1)} when input fun, [0]`, async function() {
        let rr = await cobyla(fun, [0])
        let rt = rt1
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt2)} when input fun, [87], { rhobeg: 5 }`, async function() {
        let rr = await cobyla(fun, [87], { rhobeg: 5 })
        let rt = rt2
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt3)} when input fun, [90]`, async function() {
        let rr = await cobyla(fun, [90])
        let rt = rt3
        assert.strict.deepEqual(rr, rt)
    })

})
