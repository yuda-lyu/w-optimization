import assert from 'assert'
import goldenSection from '../src/goldenSection.mjs'


describe(`goldenSection`, function() {

    function fun(param) {
        let x = param / 180 * Math.PI
        return Math.sin(x)
    }

    let rr1 = { min: -360, max: 0.1 }
    it(`should return ${JSON.stringify(rr1)} when input fun, 0, { min: -360, max: 360 }`, async function() {
        let r = goldenSection(fun, 0, { min: -360, max: 360 })
        assert.strict.deepStrictEqual(r, rr1)
    })

    let rr2 = { min: -360, max: 87.1 }
    it(`should return ${JSON.stringify(rr2)} when input fun, 87, { min: -360, max: 360 }`, async function() {
        let r = goldenSection(fun, 87, { min: -360, max: 360 })
        assert.strict.deepStrictEqual(r, rr2)
    })

    let rr3 = { min: -360, max: 129.66247495978098 }
    it(`should return ${JSON.stringify(rr3)} when input fun, 90, { min: -360, max: 360 }`, async function() {
        let r = goldenSection(fun, 90, { min: -360, max: 360 })
        assert.strict.deepStrictEqual(r, rr3)
    })

})
