import assert from 'assert'
import nelderMead from '../src/nelderMead.mjs'


describe(`nelderMead`, function() {

    function fun(X) {
        let x = X[0]
        let y = X[1]
        return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
    }
    let rr = {
        y: 5.786322126017525e-19,
        x: [0.000007191110664735547, -0.00000719035057196422]
    }
    it(`should return '${JSON.stringify(rr)}' when input fun, [-3.5, 3.5]`, async function() {
        let r = nelderMead(fun, [-3.5, 3.5])
        assert.strict.deepStrictEqual(r, rr)
    })

})
