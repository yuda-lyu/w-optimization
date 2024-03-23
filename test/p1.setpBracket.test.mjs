import assert from 'assert'
import setpBracket from '../src/setpBracket.mjs'


describe('setpBracket', function() {

    function fun(param) {
        let x = param / 180 * Math.PI
        return Math.sin(x)
    }

    // console.log(await setpBracket(fun, 0, { min: -360, max: 360 }))
    // => {
    //  count: 13,
    //  bounded: true,
    //  min: -204.70000000000002,
    //  max: 0.1,
    //  guess: -102.30000000000001,
    //  fMin: 0.4178670738010769,
    //  fMax: 0.0017453283658983088,
    //  fGuess: -0.9770455744352636
    // }
    let rt1 = {
        count: 13,
        bounded: true,
        min: -204.70000000000002,
        max: 0.1,
        guess: -102.30000000000001,
        fMin: 0.4178670738010769,
        fMax: 0.0017453283658983088,
        fGuess: -0.9770455744352636
    }

    // console.log(await setpBracket(fun, 87, { min: -360, max: 360 }))
    // => {
    //  count: 14,
    //  bounded: true,
    //  min: -322.5,
    //  max: 87.1,
    //  guess: -117.70000000000002,
    //  fMin: 0.6087614290087209,
    //  fMax: 0.9987193571841863,
    //  fGuess: -0.8853936257544158
    //}
    let rt2 = {
        count: 14,
        bounded: true,
        min: -322.5,
        max: 87.1,
        guess: -117.70000000000002,
        fMin: 0.6087614290087209,
        fMax: 0.9987193571841863,
        fGuess: -0.8853936257544158
    }

    // console.log(await setpBracket(fun, 90, { min: -360, max: 360 }))
    // => {
    //  count: 20,
    //  bounded: true,
    //  min: -319.5,
    //  max: 102.7,
    //  guess: -114.70000000000002,
    //  fMin: 0.6494480483301841,
    //  fMax: 0.9755345439458566,
    //  fGuess: -0.9085081775267217
    //}
    let rt3 = {
        count: 20,
        bounded: true,
        min: -319.5,
        max: 102.7,
        guess: -114.70000000000002,
        fMin: 0.6494480483301841,
        fMax: 0.9755345439458566,
        fGuess: -0.9085081775267217
    }

    it(`should return ${JSON.stringify(rt1)} when input fun, 0, { min: -360, max: 360 }`, async function() {
        let rr = await setpBracket(fun, 0, { min: -360, max: 360 })
        let rt = rt1
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt2)} when input fun, 87, { min: -360, max: 360 }`, async function() {
        let rr = await setpBracket(fun, 87, { min: -360, max: 360 })
        let rt = rt2
        assert.strict.deepEqual(rr, rt)
    })

    it(`should return ${JSON.stringify(rt3)} when input fun, 90, { min: -360, max: 360 }`, async function() {
        let rr = await setpBracket(fun, 90, { min: -360, max: 360 })
        let rt = rt3
        assert.strict.deepEqual(rr, rt)
    })

})
