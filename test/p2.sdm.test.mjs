import assert from 'assert'
import w from 'wsemi'
import sdm from '../src/sdm.mjs'


describe('sdm', function() {

    //2變數例: sin(y)*x + sin(x)*y + x^2 + y^2, 最佳解約於 (0, 0) 附近
    //sdm為非隨機求解法, 固定起點應產生固定解, 用deepEqual嚴格比對
    let dps = [
        { values: w.rang(-5, 5, 200), n: 201 },
        { values: w.rang(-5, 5, 200), n: 201 },
    ]

    async function fun(params) {
        let x = params[0]
        let y = params[1]
        return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
    }

    //固定起點: ind = [180, 20] (對應 value 約 [4, -4])
    async function buildInit() {
        let startInd = [180, 20]
        let startPs = startInd.map((j, i) => ({ ind: j, value: dps[i].values[j] }))
        let startVs = startPs.map(p => p.value)
        let fitness = await fun(startVs)
        return { ps: startPs, fitness }
    }

    let rt1 = {
        bestSolution: {
            ps: [
                { ind: 108, value: 0.3999999999999906 },
                { ind: 92, value: -0.40000000000000935 },
            ],
            fitness: 0.0084653261530796,
        },
        stopExecutions: 436,
    }
    it(`Neighbor mode: should return ${JSON.stringify(rt1)} when input fun, initSolution`, async function() {
        let initSolution = await buildInit()
        let rr = await sdm(dps, fun, { sdmMode: 'Neighbor', initSolution })
        assert.strict.deepEqual(rr, rt1)
    })

    let rt2 = {
        bestSolution: {
            ps: [
                { ind: 179, value: 3.949999999999985 },
                { ind: 21, value: -3.9500000000000037 },
            ],
            fitness: 36.918186180283314,
        },
        stopExecutions: 8,
    }
    it(`OneGold mode: should return ${JSON.stringify(rt2)} when input fun, initSolution`, async function() {
        let initSolution = await buildInit()
        let rr = await sdm(dps, fun, { sdmMode: 'OneGold', initSolution })
        assert.strict.deepEqual(rr, rt2)
    })

    let rt3 = {
        bestSolution: {
            ps: [
                { ind: 130, value: 1.4999999999999913 },
                { ind: 70, value: -1.5000000000000102 },
            ],
            fitness: 1.5075150401878399,
        },
        stopExecutions: 400,
    }
    it(`Gold mode: should return ${JSON.stringify(rt3)} when input fun, initSolution`, async function() {
        let initSolution = await buildInit()
        let rr = await sdm(dps, fun, { sdmMode: 'Gold', initSolution })
        assert.strict.deepEqual(rr, rt3)
    })

})
