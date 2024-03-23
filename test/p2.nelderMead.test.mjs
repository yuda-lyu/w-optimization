import assert from 'assert'
import nelderMead from '../src/nelderMead.mjs'


describe('nelderMead', function() {

    async function fun(params) {
        let x = params[0]
        let y = params[1]
        return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
    }

    // console.log(await nelderMead(fun, [-3.5, 3.5]))
    // => {
    //   count: 130,
    //   y: 5.786322126017525e-19,
    //   x: [ 0.000007191110664735547, -0.00000719035057196422 ]
    // }
    let rt1 = {
        count: 130,
        y: 5.786322126017525e-19,
        x: [0.000007191110664735547, -0.00000719035057196422]
    }

    it(`should return ${JSON.stringify(rt1)} when input fun, [-3.5, 3.5]`, async function() {
        let rr = await nelderMead(fun, [-3.5, 3.5])
        let rt = rt1
        assert.strict.deepEqual(rr, rt)
    })

})
