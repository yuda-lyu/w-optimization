import assert from 'assert'
import _ from 'lodash-es'
import w from 'wsemi'
import omlSA from '../src/omlSA.mjs'


describe('omlSA', function() {

    //2變數例: sin(y)*x + sin(x)*y + x^2 + y^2, 最佳解約於 (0, 0) 附近
    let dps = [
        { values: w.rang(-5, 5, 200), n: 201 },
        { values: w.rang(-5, 5, 200), n: 201 },
    ]

    async function fun(params) {
        let x = params[0]
        let y = params[1]
        return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
    }

    it(`should return true when input dps, fun`, async function() {
        let rr = await omlSA(dps, fun, { Nl: 2000, NContiguous: 300, saInitialTemperature: 5 })
        //隨機單點最佳化不能保證穩定值, 故偵測欄位是否存在
        let rt = w.iseobj(_.get(rr, 'bestSolution')) && w.isearr(_.get(rr, 'bestSolution.ps')) && w.isnum(_.get(rr, 'bestSolution.fitness'))
        assert.strict.deepEqual(true, rt)
    })

})
