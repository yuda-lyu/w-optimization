import assert from 'assert'
import sdm from '../src/sdm.mjs'
import omlSA from '../src/omlSA.mjs'
import omlTA from '../src/omlTA.mjs'
import omlDE from '../src/omlDE.mjs'
import omlRGA from '../src/omlRGA.mjs'
import omlHS from '../src/omlHS.mjs'
import omlPSO from '../src/omlPSO.mjs'
import omlACO from '../src/omlACO.mjs'
import { runParamSpec, invalidNums, assertFail, SECRET } from './tools/paramMatrix.mjs'


//輸入參數檢測(dspec 輸入參數之檢測機制, rulebook R-PARAM): sdm 與 oml 系列隨機最佳化
//  dps: 非空陣列, 元素為一般物件 { values: 非空陣列, n: N2 正整數且等於 values 長度 }
//  funFit: 函數
//  opt: 次數為 N2 正整數, 係數為 N2 有效數字, 開關為 B1 布林, 運算子為 S3 列舉字串, 回呼為 F1 函數; 給了而無效即報錯, 不改用預設(K3)
//  失敗通道: 回傳Promise, reject字串
//
//隨機演算法之解不可逐值比對, 故以單一設計值(n=1)使搜尋退化為確定性: 各次呼叫之 bestSolution、hists 長度、停止資訊須相同


//退化之設計變數(各變數僅一值), 適應函數恆為0
let dpsOne = () => [{ values: [1], n: 1 }]
let fit = () => 0

let ModeOutLimit = ['Mapping', 'Limit', 'Random']
let LocalSearchMethod = ['None', 'Neighbor', 'TA', 'SA', 'OneGold', 'Gold', 'NelderMead']

//投影: 排除隨機欄位(如 PSO 之 inertia)
function pickOml(r) {
    return {
        ps: r.bestSolution.ps,
        fitness: r.bestSolution.fitness,
        stopMode: r.stopMode,
        stopExecutions: r.stopExecutions,
        stopN: r.stopNl !== undefined ? r.stopNl : (r.stopNg !== undefined ? r.stopNg : r.stopNi),
        histsLen: r.hists.length,
    }
}

//演化類共通之 opt 鍵
function evoOpts(nKey, nVal, extra) {
    return [
        { key: nKey, kind: 'pint', val: nVal },
        { key: 'NContiguous', kind: 'pint', val: 2 },
        { key: 'NRepeat', kind: 'pint', val: 2 },
        { key: 'NCore', kind: 'pint', val: 400 },
        { key: 'ModeOutLimit', kind: 'enum', list: ModeOutLimit },
        { key: 'UseRepeat', kind: 'bol' },
        { key: 'UseImmigration', kind: 'bol' },
        { key: 'LocalSearchMethod', kind: 'enum', list: LocalSearchMethod },
        { key: 'funGetBetter', kind: 'fun' },
        { key: 'funGenerationBefore', kind: 'fun' },
        { key: 'funGenerationAfter', kind: 'fun' },
        ...extra,
    ]
}

//start/end/dynamic 三鍵(有效數字)
function sed(prefix, v) {
    return [
        { key: `${prefix}Start`, kind: 'num', val: v },
        { key: `${prefix}End`, kind: 'num', val: v },
        { key: `${prefix}Dynamic`, kind: 'num', val: v },
    ]
}

//以 'None' 局部搜尋縮小規模(LocalSearchMethod 鍵測試時會覆寫)
let baseEvo = { NContiguous: 3, NRepeat: 1, NCore: 500, LocalSearchMethod: 'None' }

let specs = [
    {
        name: 'omlDE',
        fn: omlDE,
        opt: { ...baseEvo, Ng: 4, Np: 6 },
        opts: evoOpts('Ng', 3, [
            { key: 'Np', kind: 'pint', val: 5 },
            ...sed('deCrossoverFactor', 0.7),
            ...sed('deF', 0.7),
            ...sed('deLanda', 0.7),
            { key: 'deMutation', kind: 'enum', list: ['1R2RR', '1B2RR', '1R2BR', '1R4RRRR', '1B4RRRR', '1R4BRRR', '1S4BSRR'] },
        ]),
    },
    {
        name: 'omlRGA',
        fn: omlRGA,
        opt: { ...baseEvo, Ng: 4, Np: 6 },
        opts: evoOpts('Ng', 3, [
            { key: 'Np', kind: 'pint', val: 5 },
            ...sed('rgaMutationRate', 0.2),
            { key: 'rgaSelection', kind: 'enum', list: ['Roulette Wheel Selection', 'Tournament Selection', 'Ranking Selection', 'Uniform Selection'] },
            { key: 'rgaCrossover', kind: 'enum', list: ['Flat Crossover', 'BLX-a Crossover', 'Linear Crossover', 'Arithmetical Crossover', 'Chung Crossover', 'DE1 Crossover', '3P Crossover', '3PB Crossover', 'DE2 Crossover', '4P Crossover', '4PB Crossover', 'HS Crossover', 'Guiding Function'] },
            { key: 'rgaMutation', kind: 'enum', list: ['Constant1', 'Constant2', 'Constant3', 'Linear0.1', 'Linear0.2', 'Linear0.3', 'Exponent0.1', 'Exponent0.2', 'Exponent0.3', 'Global Space'] },
            { key: 'rgaElitism', kind: 'enum', list: ['None', 'BestOne', 'HalfPop', 'AllPop'] },
        ]),
    },
    {
        name: 'omlHS',
        fn: omlHS,
        opt: { ...baseEvo, Ni: 6, Ns: 6 },
        opts: evoOpts('Ni', 5, [
            { key: 'Ns', kind: 'pint', val: 5 },
            ...sed('hsHMCR', 0.7),
            ...sed('hsPAR', 0.7),
            { key: 'hsHMC', kind: 'enum', list: ['Original', '2M Consideration', '2MB Consideration', '3M Consideration', '3MB Consideration', '4M Consideration', '4MB Consideration'] },
            { key: 'hsPA', kind: 'enum', list: ['Constant1', 'Constant2', 'Constant3', 'Linear0.1', 'Linear0.2', 'Linear0.3', 'Exponent0.1', 'Exponent0.2', 'Exponent0.3', 'Global Space', 'Available Space', 'Modified Global Best'] },
        ]),
    },
    {
        name: 'omlPSO',
        fn: omlPSO,
        opt: { ...baseEvo, Nl: 4, Np: 6 },
        opts: evoOpts('Nl', 3, [
            { key: 'Np', kind: 'pint', val: 5 },
            { key: 'funEndLoop', kind: 'fun' },
            ...sed('psoC1', 1.5),
            ...sed('psoC2', 1.5),
            { key: 'psoBeta', kind: 'num', val: 0.8 },
            { key: 'psoGamma', kind: 'num', val: 0.4 },
            { key: 'psoInertiaMin', kind: 'num', val: 0.3 },
        ]),
    },
    {
        name: 'omlACO',
        fn: omlACO,
        opt: { ...baseEvo, Nl: 4, Na: 6 },
        opts: evoOpts('Nl', 3, [
            { key: 'Na', kind: 'pint', val: 5 },
            { key: 'funEndLoop', kind: 'fun' },
            { key: 'UseForcedExplore', kind: 'bol' },
            ...sed('acoExploitationRate', 0.7),
            ...sed('acoAlpha', 0.2),
            ...sed('acoRo', 0.2),
        ]),
    },
]


for (let s of specs) {
    runParamSpec({
        name: s.name,
        fn: s.fn,
        mode: 'async',
        args: (ctx) => [dpsOne(), ctx.fun],
        pick: pickOml,
        f: fit,
        opt: s.opt,
        gen: [
            { i: 1, name: 'funFit', kind: 'fun' },
        ],
        opts: s.opts,
    })
}


//SA / TA(單點軌跡, 另含 initSolution 與 calcFitness)
for (let s of [
    {
        name: 'omlSA',
        fn: omlSA,
        opt: { Nl: 20, NContiguous: 5, NCore: 100 },
        opts: [
            { key: 'Nl', kind: 'pint', val: 12 },
            { key: 'NContiguous', kind: 'pint', val: 4 },
            { key: 'NCore', kind: 'pint', val: 50 },
            { key: 'ModeOutLimit', kind: 'enum', list: ModeOutLimit },
            { key: 'saInitialTemperature', kind: 'num', val: 10 },
            { key: 'saAlpha', kind: 'num', val: 0.8 },
            { key: 'UseHists', kind: 'bol' },
            { key: 'funGetBetter', kind: 'fun' },
            { key: 'funEndLoop', kind: 'fun' },
            { key: 'calcFitness', kind: 'fun' },
        ],
    },
    {
        name: 'omlTA',
        fn: omlTA,
        opt: { Nl: 20, NContiguous: 5, NCore: 100 },
        opts: [
            { key: 'Nl', kind: 'pint', val: 12 },
            { key: 'NContiguous', kind: 'pint', val: 4 },
            { key: 'NCore', kind: 'pint', val: 50 },
            { key: 'ModeOutLimit', kind: 'enum', list: ModeOutLimit },
            { key: 'taThresholdType', kind: 'enum', list: ['Arithmetic Series', 'Geometric Series', 'Trapezoid Series'] },
            { key: 'taThresholdInitial', kind: 'num', val: 2 },
            { key: 'UseHists', kind: 'bol' },
            { key: 'funGetBetter', kind: 'fun' },
            { key: 'funEndLoop', kind: 'fun' },
            { key: 'calcFitness', kind: 'fun' },
        ],
    },
]) {
    runParamSpec({
        name: s.name,
        fn: s.fn,
        mode: 'async',
        args: (ctx) => [dpsOne(), ctx.fun],
        pick: pickOml,
        f: fit,
        opt: s.opt,
        gen: [
            { i: 1, name: 'funFit', kind: 'fun' },
        ],
        opts: s.opts,
    })
}


//sdm(傳回 { bestSolution, stopExecutions })
runParamSpec({
    name: 'sdm',
    fn: sdm,
    mode: 'async',
    args: (ctx) => [dpsOne(), ctx.fun],
    pick: (r) => ({ ps: r.bestSolution.ps, fitness: r.bestSolution.fitness, stopExecutions: r.stopExecutions }),
    f: fit,
    gen: [
        { i: 1, name: 'funFit', kind: 'fun' },
    ],
    opts: [
        { key: 'sdmMode', kind: 'enum', list: ['Neighbor', 'OneGold', 'Gold'] },
        { key: 'ModeOutLimit', kind: 'enum', list: ModeOutLimit },
        { key: 'calcFitness', kind: 'fun' },
    ],
})


let all = [
    ['sdm', sdm, {}],
    ['omlSA', omlSA, { Nl: 20, NContiguous: 5 }],
    ['omlTA', omlTA, { Nl: 20, NContiguous: 5 }],
    ['omlDE', omlDE, { ...baseEvo, Ng: 4, Np: 6 }],
    ['omlRGA', omlRGA, { ...baseEvo, Ng: 4, Np: 6 }],
    ['omlHS', omlHS, { ...baseEvo, Ni: 6, Ns: 6 }],
    ['omlPSO', omlPSO, { ...baseEvo, Nl: 4, Np: 6 }],
    ['omlACO', omlACO, { ...baseEvo, Nl: 4, Na: 6 }],
]


async function fail(fn, dps, funFit, opt) {
    let calls = 0
    let ff = funFit
    if (funFit === 'count') {
        ff = () => {
            calls++
            return 0
        }
    }
    let res
    let err
    try {
        res = await fn(dps, ff, opt)
    }
    catch (e) {
        err = e
    }
    return { res, err, calls }
}


for (let [name, fn, opt] of all) {

    describe(`${name} dps`, function() {

        //spec(dspec V19, K2): dps 必給且須為非空陣列, 元素為一般物件, values 為非空陣列
        it('dps must be a non-empty array of plain objects with non-empty values', async function() {
            let cases = [
                ['undefined', undefined, 'invalid dps: must be a non-empty array'],
                ['null', null, 'invalid dps: must be a non-empty array'],
                ['number', 5, 'invalid dps: must be a non-empty array'],
                ['secret string', SECRET, 'invalid dps: must be a non-empty array'],
                ['object', {}, 'invalid dps: must be a non-empty array'],
                ['empty array', [], 'invalid dps: must be a non-empty array'],
                ['null element', [null], 'invalid dps[0]: must be a plain object'],
                ['number element', [5], 'invalid dps[0]: must be a plain object'],
                ['array element', [[]], 'invalid dps[0]: must be a plain object'],
                ['no values', [{ n: 1 }], 'invalid dps[0].values: must be a non-empty array'],
                ['empty values', [{ values: [], n: 1 }], 'invalid dps[0].values: must be a non-empty array'],
                ['values not array', [{ values: 'abc', n: 1 }], 'invalid dps[0].values: must be a non-empty array'],
                ['second element bad', [{ values: [1], n: 1 }, { values: [1] }], 'invalid dps[1].n: must be a positive integer'],
            ]
            for (let [label, dps, msg] of cases) {
                let r = await fail(fn, dps, 'count', opt)
                assert.strictEqual(r.res, undefined, `${label}: should not resolve`)
                assert.strictEqual(r.err, msg, `${label}: message`)
                assert.strictEqual(r.calls, 0, `${label}: funFit must not be called`)
            }
        })

        //spec(dspec N2): dps[i].n 為有效數字且須為正整數, 無效者報錯, 不回顯值
        it('dps[i].n must be a positive integer equal to the length of values', async function() {
            let bads = invalidNums({ withNull: true, withUndefined: true }).concat([['0', 0], ['-1', -1], ['1.5', 1.5], ['\'1.5\'', '1.5'], ['\'0\'', '0']])
            for (let [label, v] of bads) {
                let r = await fail(fn, [{ values: [1], n: v }], 'count', opt)
                assert.strictEqual(r.res, undefined, `n=${label}: should not resolve`)
                assert.strictEqual(r.err, 'invalid dps[0].n: must be a positive integer', `n=${label}: message`)
                assert.strictEqual(r.calls, 0, `n=${label}: funFit must not be called`)
            }
            for (let n of [2, 3, '2', ' 3 ']) {
                let r = await fail(fn, [{ values: [1], n }], 'count', opt)
                assert.strictEqual(r.err, 'invalid dps[0].n: must equal the length of dps[0].values', `n=${n}: message`)
                assert.strictEqual(r.calls, 0)
            }
        })

        //spec(dspec K4, V9): n 為數字字串時轉換後使用, 解與數值相同; 不改寫呼叫端之 dps
        it('dps[i].n of a numeric string gives the same result as a number and leaves the caller dps unchanged', async function() {
            let rn = await fn([{ values: [1], n: 1 }], fit, opt)
            for (let n of ['1', ' 1 ', '1e0', '+1']) {
                let dps = [{ values: [1], n }]
                let rs = await fn(dps, fit, opt)
                assert.deepStrictEqual(pickOml2(rs), pickOml2(rn), `n=${JSON.stringify(n)}`)
                assert.strictEqual(dps[0].n, n, 'caller dps must not be changed')
            }
        })

    })

}

function pickOml2(r) {
    if (r.hists) {
        return pickOml(r)
    }
    return { ps: r.bestSolution.ps, fitness: r.bestSolution.fitness, stopExecutions: r.stopExecutions }
}


describe('cross-key checks reject with a message that names the keys and no values', function() {

    //spec(dspec V10 跨鍵依賴): Np 不得小於 deMutation 所需
    it('omlDE: opt.Np must be at least the minimum required by opt.deMutation', async function() {
        let r = await fail(omlDE, dpsOne(), 'count', { Np: 3, deMutation: '1R4RRRR' })
        assert.strictEqual(r.err, 'invalid opt.Np: must be at least the minimum required by opt.deMutation')
        assert.strictEqual(r.calls, 0)
        let ok = await fail(omlDE, dpsOne(), 'count', { Np: 5, deMutation: '1R4RRRR', Ng: 2, NContiguous: 2, LocalSearchMethod: 'None' })
        assert.strictEqual(ok.err, undefined)
    })

    it('omlHS: opt.Ns must be at least the minimum required by opt.hsHMC', async function() {
        let r = await fail(omlHS, dpsOne(), 'count', { Ns: 3, hsHMC: '4M Consideration' })
        assert.strictEqual(r.err, 'invalid opt.Ns: must be at least the minimum required by opt.hsHMC')
        assert.strictEqual(r.calls, 0)
    })

    it('omlRGA: opt.Np must be at least the minimum required by opt.rgaCrossover', async function() {
        let r = await fail(omlRGA, dpsOne(), 'count', { Np: 3, rgaCrossover: '4P Crossover' })
        assert.strictEqual(r.err, 'invalid opt.Np: must be at least the minimum required by opt.rgaCrossover')
        assert.strictEqual(r.calls, 0)
    })

})


describe('opt.initSolution (sdm, omlSA, omlTA)', function() {

    for (let [name, fn] of [['sdm', sdm], ['omlSA', omlSA], ['omlTA', omlTA]]) {

        it(`${name}: invalid initSolution is rejected, not ignored (K3)`, async function() {
            let ps = [{ ind: 0, value: 1 }]
            let cases = [
                ['string', 'abc', 'invalid opt.initSolution: must be a plain object'],
                ['number', 5, 'invalid opt.initSolution: must be a plain object'],
                ['array', [], 'invalid opt.initSolution: must be a plain object'],
                ['no ps', { fitness: 1 }, 'invalid opt.initSolution.ps: must be a non-empty array'],
                ['empty ps', { ps: [], fitness: 1 }, 'invalid opt.initSolution.ps: must be a non-empty array'],
                ['ps not array', { ps: 'abc', fitness: 1 }, 'invalid opt.initSolution.ps: must be a non-empty array'],
                ['fitness undefined', { ps }, 'invalid opt.initSolution.fitness: must be a number or numeric string'],
                ['fitness null', { ps, fitness: null }, 'invalid opt.initSolution.fitness: must be a number or numeric string'],
                ['fitness \'NP\'', { ps, fitness: 'NP' }, 'invalid opt.initSolution.fitness: must be a number or numeric string'],
                ['fitness NaN', { ps, fitness: NaN }, 'invalid opt.initSolution.fitness: must be a number or numeric string'],
                ['fitness true', { ps, fitness: true }, 'invalid opt.initSolution.fitness: must be a number or numeric string'],
                ['fitness secret', { ps, fitness: SECRET }, 'invalid opt.initSolution.fitness: must be a number or numeric string'],
            ]
            for (let [label, v, msg] of cases) {
                let r = await fail(fn, dpsOne(), 'count', { initSolution: v })
                assert.strictEqual(r.res, undefined, `${label}: should not resolve`)
                assert.strictEqual(r.err, msg, `${label}: message`)
                assert.strictEqual(r.calls, 0, `${label}: funFit must not be called`)
            }
        })

        //spec(dspec K4): initSolution.fitness 為數字字串時轉換後使用
        it(`${name}: numeric-string fitness of initSolution is converted and used as a number`, async function() {
            let ps = [{ ind: 0, value: 1 }]
            let r = await fn(dpsOne(), () => 7, { initSolution: { ps, fitness: '5' }, Nl: 5, NContiguous: 2 })
            assert.strictEqual(r.bestSolution.fitness, 5)
            assert.strictEqual(typeof r.bestSolution.fitness, 'number')
            let r2 = await fn(dpsOne(), () => 7, { initSolution: { ps, fitness: Infinity }, Nl: 5, NContiguous: 2 })
            assert.strictEqual(r2.bestSolution.fitness, Infinity)
        })

        it(`${name}: initSolution given as null takes the default (random initial solution)`, async function() {
            let r = await fn(dpsOne(), fit, { initSolution: null, Nl: 5, NContiguous: 2 })
            assert.strictEqual(r.bestSolution.fitness, 0)
        })

    }

})


describe('failure message of dps does not echo the input', function() {

    it('secret string as n', async function() {
        let r = await fail(omlSA, [{ values: [1], n: SECRET }], fit, {})
        assertFail({ threw: true, sync: false, e: r.err }, 'async', 'invalid dps[0].n: must be a positive integer', 'n=secret')
    })

})
