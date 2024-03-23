import assert from 'assert'
import cobyla from '../src/cobyla.mjs'


describe('cobyla', function() {

    async function fun(params) {
        let x = params[0]
        let y = params[1]
        return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
    }

    // console.log(await cobyla(fun, [-3.5, 3.5]))
    // => {
    //   count: 3163,
    //   y: 2.8261772207227327e-7,
    //   x: [ -0.030346528297292275, 0.030342179424102497 ]
    // }
    let rt1 = {
        count: 3163,
        y: 2.8261772207227327e-7,
        x: [-0.030346528297292275, 0.030342179424102497]
    }

    it(`should return ${JSON.stringify(rt1)} when input fun, [-3.5, 3.5]`, async function() {
        let rr = await cobyla(fun, [-3.5, 3.5])
        let rt = rt1
        assert.strict.deepEqual(rr, rt)
    })

})
