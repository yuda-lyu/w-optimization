import assert from 'assert'
import sdm from '../src/sdm.mjs'
import omlSA from '../src/omlSA.mjs'
import omlTA from '../src/omlTA.mjs'
import omlDE from '../src/omlDE.mjs'
import omlRGA from '../src/omlRGA.mjs'
import omlHS from '../src/omlHS.mjs'
import omlPSO from '../src/omlPSO.mjs'
import omlACO from '../src/omlACO.mjs'
import { runParamSpec } from './tools/paramMatrix.mjs'
import { mulberry32, counted, withMathRandom, makeDps, fitOf, traced, covering } from './tools/randomKit.mjs'


//opt.random(oml 系列與 sdm 之選配亂數來源, 回傳 [0,1) 之函數)
//  R1  給了則該次呼叫之一切隨機取值皆只經它; 未給(undefined 或 null)仍用 Math.random
//  R2  同題同選項同一個固定種子之產生器 ⇒ 回傳(最佳解, hists, 停止原因與代數)與適應函數被呼叫之序列逐次相同; 不同種子 ⇒ 路徑不同
//  R3  給了時 Math.random 之呼叫數為 0(暫代計數); 未給時 > 0
//  各隨機點是否皆經產生器, 另由 sgud 記載之逐點變異(將該處改回 Math.random 或原 randomIntRange 即有本檔之測試轉紅)驗證


let LS = ['None', 'Neighbor', 'TA', 'SA', 'OneGold', 'Gold', 'NelderMead']
let MOL = ['Mapping', 'Limit', 'Random']

//各演算法之基準 opt(縮小規模)與各軸之取值(涵蓋設定: 各軸每個取值至少出現一次)
let specs = [
    {
        name: 'omlPSO',
        fn: omlPSO,
        base: { Nl: 14, Np: 8, NContiguous: 4, NRepeat: 2 },
        axes: {
            ModeOutLimit: MOL,
            LocalSearchMethod: LS,
            UseImmigration: [true, false],
            UseRepeat: [true, false],
        },
    },
    {
        name: 'omlACO',
        fn: omlACO,
        base: { Nl: 14, Na: 8, NContiguous: 4, NRepeat: 2, acoExploitationRateStart: 0.5, acoExploitationRateEnd: 0.5 },
        axes: {
            ModeOutLimit: MOL,
            LocalSearchMethod: LS,
            UseImmigration: [true, false],
            UseRepeat: [true, false],
            UseForcedExplore: [true, false],
        },
    },
    {
        name: 'omlDE',
        fn: omlDE,
        base: { Ng: 14, Np: 8, NContiguous: 4, NRepeat: 2, deCrossoverFactorStart: 0.5, deCrossoverFactorEnd: 0.5, deFStart: 0.7, deFEnd: 0.7, deLandaStart: 0.4, deLandaEnd: 0.4 },
        axes: {
            deMutation: ['1R2RR', '1B2RR', '1R2BR', '1R4RRRR', '1B4RRRR', '1R4BRRR', '1S4BSRR'],
            ModeOutLimit: MOL,
            LocalSearchMethod: LS,
            UseImmigration: [true, false],
            UseRepeat: [true, false],
        },
    },
    {
        name: 'omlRGA',
        fn: omlRGA,
        base: { Ng: 14, Np: 8, NContiguous: 4, NRepeat: 2, rgaMutationRateStart: 0.4, rgaMutationRateEnd: 0.4 },
        //各交配運算子皆與 ModeOutLimit 'Random' 交叉(比例疊加類於指標越界時由產生器重產)
        extra: ['Flat Crossover', 'BLX-a Crossover', 'Linear Crossover', 'Arithmetical Crossover', 'Chung Crossover', 'DE1 Crossover', '3P Crossover', '3PB Crossover', 'DE2 Crossover', '4P Crossover', '4PB Crossover', 'HS Crossover', 'Guiding Function'].map((cr) => ({ rgaCrossover: cr, ModeOutLimit: 'Random' })),
        axes: {
            rgaSelection: ['Roulette Wheel Selection', 'Tournament Selection', 'Ranking Selection', 'Uniform Selection'],
            rgaCrossover: ['Flat Crossover', 'BLX-a Crossover', 'Linear Crossover', 'Arithmetical Crossover', 'Chung Crossover', 'DE1 Crossover', '3P Crossover', '3PB Crossover', 'DE2 Crossover', '4P Crossover', '4PB Crossover', 'HS Crossover', 'Guiding Function'],
            rgaMutation: ['Constant1', 'Constant2', 'Constant3', 'Linear0.1', 'Linear0.2', 'Linear0.3', 'Exponent0.1', 'Exponent0.2', 'Exponent0.3', 'Global Space'],
            rgaElitism: ['None', 'BestOne', 'HalfPop', 'AllPop'],
            ModeOutLimit: MOL,
            LocalSearchMethod: LS,
            UseImmigration: [true, false],
            UseRepeat: [true, false],
        },
    },
    {
        name: 'omlHS',
        fn: omlHS,
        base: { Ni: 120, Ns: 8, NContiguous: 25, NRepeat: 2, hsHMCRStart: 0.8, hsHMCREnd: 0.8, hsPARStart: 0.8, hsPAREnd: 0.8 },
        axes: {
            hsHMC: ['Original', '2M Consideration', '2MB Consideration', '3M Consideration', '3MB Consideration', '4M Consideration', '4MB Consideration'],
            hsPA: ['Constant1', 'Constant2', 'Constant3', 'Linear0.1', 'Linear0.2', 'Linear0.3', 'Exponent0.1', 'Exponent0.2', 'Exponent0.3', 'Global Space', 'Available Space', 'Modified Global Best'],
            ModeOutLimit: MOL,
            LocalSearchMethod: LS,
            UseImmigration: [true, false],
            UseRepeat: [true, false],
        },
    },
    {
        name: 'omlSA',
        fn: omlSA,
        base: { Nl: 80, NContiguous: 30 },
        axes: {
            ModeOutLimit: MOL,
            saInitialTemperature: [5, 50],
            saAlpha: [0.9, 0.5],
        },
        noExtra: true,
    },
    {
        name: 'omlTA',
        fn: omlTA,
        base: { Nl: 80, NContiguous: 30 },
        axes: {
            ModeOutLimit: MOL,
            taThresholdType: ['Arithmetic Series', 'Geometric Series', 'Trapezoid Series'],
            taThresholdInitial: [1, 5],
        },
        noExtra: true,
    },
]


//設定清單: 涵蓋設定 + (母體演算法)ModeOutLimit 為 'Random' 與各局部搜尋之交叉(局部搜尋之 sdm / omlSA / omlTA 內之重產指標) + 極小設計空間(使族群內出現重複個體, 觸發移民)
function configsOf(s) {
    let cfgs = covering(s.axes).map((opt) => ({ opt, tiny: false }))
    if (!s.noExtra) {
        for (let ls of LS) {
            cfgs.push({ opt: { ModeOutLimit: 'Random', LocalSearchMethod: ls }, tiny: false })
        }
        for (let o of (s.extra || [])) {
            cfgs.push({ opt: { ...o, LocalSearchMethod: 'None' }, tiny: false })
        }
        cfgs.push({ opt: { UseImmigration: true, UseRepeat: true, LocalSearchMethod: 'None' }, tiny: true })
        cfgs.push({ opt: { UseImmigration: true, UseRepeat: true, LocalSearchMethod: 'TA', ModeOutLimit: 'Random' }, tiny: true })
    }
    return cfgs
}


for (let s of specs) {

    describe(`${s.name} opt.random`, function() {

        let cfgs = configsOf(s)

        cfgs.forEach((cfg, idx) => {

            it(`R1-R3 fixed-seed generator: same result and fitness-call sequence, other seed differs, Math.random not used: ${JSON.stringify(cfg)}`, async function() {

                let dps = makeDps(cfg.tiny ? [3, 3] : [9, 7, 11])
                let opt = { ...s.base, ...cfg.opt }
                let asyncFit = idx % 2 === 1

                //第一次: 種子 1
                let g1 = counted(mulberry32(1))
                let a = await traced(s.fn, dps, { ...opt, random: g1.f }, asyncFit)

                //鑑別前提: 路徑夠長且確實取用產生器(否則下列比對無鑑別力)
                assert.ok(a.calls.length >= 30, `premise: path is long enough (${a.calls.length} calls)`)
                assert.ok(new Set(a.calls.map((x) => x.join(','))).size >= 5, 'premise: at least 5 distinct design points are evaluated')
                assert.ok(g1.st.n >= 30, `premise: the generator is used (${g1.st.n} draws)`)

                //R1 契約: 以零個引數呼叫產生器(同 Math.random)
                assert.strictEqual(g1.st.withArgs, 0, 'the generator is called without arguments')

                //R2 + R3: 同種子再跑一次, 並暫代 Math.random 計數
                let g2 = counted(mulberry32(1))
                let m = await withMathRandom(() => traced(s.fn, dps, { ...opt, random: g2.f }, asyncFit))
                assert.strictEqual(m.count, 0, `R3: Math.random must not be called when opt.random is given; first call: ${m.first}`)
                assert.deepStrictEqual(m.r.calls, a.calls, 'R2: the fitness-call sequence is identical')
                assert.deepStrictEqual(m.r.r, a.r, 'R2: the result (bestSolution, hists, stop info) is identical')
                assert.strictEqual(g2.st.n, g1.st.n, 'R2: the same number of draws')

                //R2: 不同種子 ⇒ 路徑不同
                let b = await traced(s.fn, dps, { ...opt, random: mulberry32(2) }, asyncFit)
                assert.ok(b.calls.length >= 10, `premise: the other-seed path is long enough (${b.calls.length} calls)`)
                assert.notDeepStrictEqual(b.calls, a.calls, 'R2: another seed gives another path')

            })

        })

    })

}


//適應函數恆為 Infinity(懲罰值, 全部個體皆不可行): 費洛蒙恆為 0, 使 omlACO 之「全部節點皆無費洛蒙」分支被走到, 該分支之隨機取值亦須只經產生器
describe('omlACO opt.random with a fitness that is always Infinity (no pheromone is ever laid)', function() {

    for (let rate of [0.5, 1, 0]) {

        it(`R1-R3 acoExploitationRate ${rate}: reproducible, Math.random not used, other seed differs`, async function() {
            let dps = makeDps([9, 7, 11])
            let opt = { Nl: 12, Na: 8, NContiguous: 4, NRepeat: 2, LocalSearchMethod: 'None', acoExploitationRateStart: rate, acoExploitationRateEnd: rate }
            let fit = () => Infinity
            let g1 = counted(mulberry32(7))
            let a = await traced(omlACO, dps, { ...opt, random: g1.f }, false, fit)
            assert.ok(a.calls.length >= 30, `premise: the run evaluates many points (${a.calls.length} calls)`)
            assert.ok(a.r.bestSolution.fitness === Infinity, 'premise: every point is infeasible')
            let g2 = counted(mulberry32(7))
            let m = await withMathRandom(() => traced(omlACO, dps, { ...opt, random: g2.f }, false, fit))
            assert.strictEqual(m.count, 0, `R3: Math.random must not be called; first call: ${m.first}`)
            assert.deepStrictEqual(m.r.calls, a.calls)
            assert.deepStrictEqual(m.r.r, a.r)
            let b = await traced(omlACO, dps, { ...opt, random: mulberry32(8) }, false, fit)
            assert.notDeepStrictEqual(b.calls, a.calls)
        })

    }

})


describe('opt.random not given (R1, R3)', function() {

    let dps = () => makeDps([9, 7, 11])

    for (let s of specs) {

        for (let [label, v] of [['not given', undefined], ['undefined', undefined], ['null', null]]) {

            it(`${s.name}: ${label} still uses Math.random`, async function() {
                let opt = { ...s.base, LocalSearchMethod: 'None' }
                if (label !== 'not given') {
                    opt.random = v
                }
                let m = await withMathRandom(() => traced(s.fn, dps(), opt))
                assert.ok(m.count > 0, 'R3: Math.random is called when opt.random is not given')
                assert.ok(m.r.calls.length >= 10, 'the run is effective')
            })

        }

    }

})


describe('sdm opt.random', function() {

    let dps = () => makeDps([9, 7, 11])
    let initAt0 = () => {
        let d = dps()
        let ps = d.map((dp) => ({ ind: 0, value: dp.values[0] }))
        return { ps, fitness: fitOf(ps.map((p) => p.value)) }
    }

    it('without initSolution, ModeOutLimit Mapping: the initial solution comes only from the generator (R1-R3)', async function() {
        let g1 = counted(mulberry32(3))
        let a = await traced(sdm, dps(), { sdmMode: 'Neighbor', random: g1.f })
        assert.ok(a.calls.length >= 5, 'premise: the run evaluates several points')
        assert.strictEqual(g1.st.n, 3, 'one draw per design variable for the initial solution')
        assert.strictEqual(g1.st.withArgs, 0)
        let g2 = counted(mulberry32(3))
        let m = await withMathRandom(() => traced(sdm, dps(), { sdmMode: 'Neighbor', random: g2.f }))
        assert.strictEqual(m.count, 0, `R3: Math.random must not be called; first call: ${m.first}`)
        assert.deepStrictEqual(m.r.calls, a.calls)
        assert.deepStrictEqual(m.r.r, a.r)
        let b = await traced(sdm, dps(), { sdmMode: 'Neighbor', random: mulberry32(4) })
        assert.notDeepStrictEqual(b.calls[0], a.calls[0], 'another seed gives another initial solution')
    })

    for (let mode of ['Neighbor', 'OneGold', 'Gold']) {

        it(`initSolution at the lower bound, ModeOutLimit Random, sdmMode ${mode}: re-drawn indices come only from the generator (R1-R3)`, async function() {
            let opt = (g) => ({ sdmMode: mode, ModeOutLimit: 'Random', initSolution: initAt0(), random: g })
            let g1 = counted(mulberry32(5))
            let a = await traced(sdm, dps(), opt(g1.f))
            let g2 = counted(mulberry32(5))
            let m = await withMathRandom(() => traced(sdm, dps(), opt(g2.f)))
            assert.strictEqual(m.count, 0, `R3: Math.random must not be called; first call: ${m.first}`)
            assert.deepStrictEqual(m.r.calls, a.calls)
            assert.deepStrictEqual(m.r.r, a.r)
            if (mode === 'Neighbor') {
                //Neighbor 模式於下界之 k=-1 越界, Random 模式由產生器重產指標
                assert.ok(g1.st.n >= 3, `premise: out-of-range indices are re-drawn (${g1.st.n} draws)`)
                let b = await traced(sdm, dps(), opt(mulberry32(6)))
                assert.notDeepStrictEqual(b.calls, a.calls, 'another seed gives another path')
            }
            else {
                //Gold 模式內部固定用 'Limit', 不取亂數
                assert.strictEqual(g1.st.n, 0, 'sdmGold does not draw')
            }
        })

    }

    it('not given: no Math.random is required (sdm draws only through wsemi randomIntRange as before)', async function() {
        let r = await sdm(dps(), fitOf, {})
        assert.ok(r.bestSolution.ps.length === 3)
    })

})


//opt.random 之種類檢測(沿用既有之表驅動輔助): 給了而非函數即報錯, null/undefined 取預設
let dpsOne = () => [{ values: [1], n: 1 }]
let fit0 = () => 0

function pickOml(r) {
    return {
        ps: r.bestSolution.ps,
        fitness: r.bestSolution.fitness,
        stopMode: r.stopMode,
        stopExecutions: r.stopExecutions,
        histsLen: r.hists ? r.hists.length : 0,
    }
}

let entries8 = [
    ['sdm', sdm, {}],
    ['omlSA', omlSA, { Nl: 20, NContiguous: 5 }],
    ['omlTA', omlTA, { Nl: 20, NContiguous: 5 }],
    ['omlDE', omlDE, { Ng: 4, Np: 6, NContiguous: 3, LocalSearchMethod: 'None' }],
    ['omlRGA', omlRGA, { Ng: 4, Np: 6, NContiguous: 3, LocalSearchMethod: 'None' }],
    ['omlHS', omlHS, { Ni: 6, Ns: 6, NContiguous: 3, LocalSearchMethod: 'None' }],
    ['omlPSO', omlPSO, { Nl: 4, Np: 6, NContiguous: 3, LocalSearchMethod: 'None' }],
    ['omlACO', omlACO, { Nl: 4, Na: 6, NContiguous: 3, LocalSearchMethod: 'None' }],
]

for (let [name, fn, opt] of entries8) {
    runParamSpec({
        name: `${name} (opt.random)`,
        fn,
        mode: 'async',
        args: (ctx) => [dpsOne(), ctx.fun],
        pick: pickOml,
        f: fit0,
        opt,
        gen: [],
        opts: [
            { key: 'random', kind: 'fun' },
        ],
    })
}


//opt.random 之假值: 未給只有 undefined 與 null; 0、''、false、NaN、-0、0n 等假值為給了而非函數, 須拒絕(不得被當作未給而用 Math.random), 且先於任何適應函數呼叫(R-RANDOM-01)
describe('opt.random falsy non-function values are invalid, not "not given"', function() {

    for (let [name, fn, opt] of entries8) {

        it(`${name}: 0, empty string, false, NaN, -0 and 0n reject with the fixed message before any fitness call`, async function() {
            for (let [label, v] of [['0', 0], ['empty string', ''], ['false', false], ['NaN', NaN], ['-0', -0], ['0n', 0n]]) {
                let calls = 0
                let err = null
                try {
                    await fn(dpsOne(), () => {
                        calls++
                        return 0
                    }, { ...opt, random: v })
                }
                catch (e) {
                    err = e
                }
                assert.ok(err === 'invalid opt.random: must be a function', `${label}: rejected with the fixed message`)
                assert.ok(calls === 0, `${label}: the fitness function is not called`)
            }
        })

    }

})
