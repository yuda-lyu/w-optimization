import _ from 'lodash-es'
import w from 'wsemi'
import omlACO from './src/omlACO.mjs'
import _adapterACO from './src/_adapterACO.mjs'
import _adapterHS from './src/_adapterHS.mjs'
import _adapterSA from './src/_adapterSA.mjs'
import _adapterTA from './src/_adapterTA.mjs'


// ============================================================================
// Benchmark: 比較「無 adapter (omlACO 預設)」與「4 種 adapter」在 g4 題目之效果
// 每設定跑 N 次取平均
// ============================================================================


let t = `
-5 77.5
-4 81.375
-3 85.25
-2 89.125
-1 93
0
3 155
4 163
5 141
6 168
7 158
8 148
9 172
10 198
11 181
12 143
13 161
14 209
15 193
16 177
17 190
18 174
19 194
20 205
21 211
22 235
23 210
24 208
25 216
26 207
27 223
28 241
29 226
30 251
31 243
32 227
33 242
34 235
35 250
36 225
37 236
38 228
39 235
40 250
41 230
42 240
43 260
44 273
45 243
46 255
47 244
48 246
49 234
50 249
51 304
52 276
53 331
54 273
55 258
56 282
57 316
58 288
59 282
60 273
61 316
62 342
63 307
64 323
65 273
66 299
67 308
68 292
69 295
70 333
71 328
72 336
73 400
74 331
75 327
76 375
77 337
78 347
79 358
80 358
81 355
82 325
83 342
84 361
85 334
86 342
87 334
88 348
89 370
90 323
91 354
92 352
93 377
94 371
95 370
96 351
97 361
98 367
99 377
100 381
`
let ps = w.sep(t, '\n')
let _ps = []
_.each(ps, (v) => {
    let s = w.sep(v, ' ')
    let Depth = _.get(s, 0, '')
    let Vs = _.get(s, 1, '')
    if (w.isnum(Depth) && w.isnum(Vs)) {
        _ps.push({ Depth: w.cdbl(Depth), Vs: w.cdbl(Vs) })
    }
    ps = _ps
})


let dps = [
    { values: w.rang(100, 300, 1000), n: 1000 },
    { values: w.rang(0, 50, 1000), n: 1000 },
    { values: w.rang(-1000, 0, 1000), n: 1000 },
]

async function fun(params) {
    let a = params[0], b = params[1], c = params[2]
    let fitness = 0
    _.each(ps, (v) => {
        let d = Math.max(v.Depth + b, 0.001)
        let Vs = a * Math.log(d) + c
        Vs = Math.max(Vs, 0)
        fitness += Math.abs(Vs - v.Vs)
    })
    return fitness
}


let schema = [
    { name: 'acoExploitationRate', values: w.rang(0, 1, 20) },
    { name: 'acoAlpha', values: w.rang(0, 1, 10) },
    { name: 'acoRo', values: w.rang(0, 1, 10) },
    //ModeOutLimit 僅於 LocalSearchMethod != 'None' 時才會經 _localSearch 路徑生效, 關 LS 時為空轉
    { name: 'ModeOutLimit', values: ['Mapping', 'Limit', 'Random'] },
]


let baseOpt = { Na: 20, NContiguous: 100 }

let scenarios = [
    {
        name: 'omlACO 預設 + nelderMead LS',
        build: () => ({ ...baseOpt, LocalSearchMethod: 'NelderMead' }),
    },
    {
        name: 'omlACO 預設 + 無 LS',
        build: () => ({ ...baseOpt, LocalSearchMethod: 'None' }),
    },
    {
        name: 'omlACO + _adapterACO (無 LS)',
        build: () => {
            let aco = _adapterACO(schema, { acoExploitationRate: 0.8, acoAlpha: 0.1 })
            return {
                ...baseOpt,
                LocalSearchMethod: 'None',
                funGenerationBefore: () => ({ params: aco.suggest() }),
                funGenerationAfter: (ctx) => aco.feedback(ctx.params, ctx.childrenBestFitness),
            }
        },
    },
    {
        name: 'omlACO + _adapterHS  (無 LS)',
        build: () => {
            let hs = _adapterHS(schema, { Ns: 10, hsHMCR: 0.9, hsPAR: 0.3, hsHMC: 'Original', hsPA: 'Linear0.1' })
            return {
                ...baseOpt,
                LocalSearchMethod: 'None',
                funGenerationBefore: () => ({ params: hs.suggest() }),
                funGenerationAfter: (ctx) => hs.feedback(ctx.params, ctx.childrenBestFitness),
            }
        },
    },
    {
        name: 'omlACO + _adapterSA  (無 LS)',
        build: () => {
            let sa = _adapterSA(schema, { saInitialTemperature: 50, saAlpha: 0.95 })
            return {
                ...baseOpt,
                LocalSearchMethod: 'None',
                funGenerationBefore: () => ({ params: sa.suggest() }),
                funGenerationAfter: (ctx) => sa.feedback(ctx.params, ctx.childrenBestFitness),
            }
        },
    },
    {
        name: 'omlACO + _adapterTA  (無 LS)',
        build: () => {
            let ta = _adapterTA(schema, { taThresholdInitial: 50, taThresholdRatio: 0.99 })
            return {
                ...baseOpt,
                LocalSearchMethod: 'None',
                funGenerationBefore: () => ({ params: ta.suggest() }),
                funGenerationAfter: (ctx) => ta.feedback(ctx.params, ctx.childrenBestFitness),
            }
        },
    },
]


let N = 5

async function test() {

    let allResults = []

    for (let s of scenarios) {
        let runs = []
        let tStart = Date.now()
        for (let i = 0; i < N; i++) {
            let r = await omlACO(dps, fun, s.build())
            runs.push({
                fitness: r.bestSolution.fitness,
                stopNl: r.stopNl,
                stopExecutions: r.stopExecutions,
            })
        }
        let tElapsed = Date.now() - tStart

        let fits = runs.map(r => r.fitness)
        let nls = runs.map(r => r.stopNl)
        let exes = runs.map(r => r.stopExecutions)
        let avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
        let result = {
            name: s.name,
            fitnessMin: Math.min(...fits),
            fitnessMax: Math.max(...fits),
            fitnessAvg: avg(fits),
            stopNlAvg: avg(nls),
            stopExecutionsAvg: avg(exes),
            elapsedMs: tElapsed,
        }
        allResults.push(result)

        console.log(`[${s.name}] N=${N}`)
        console.log(`   fitness:        ${result.fitnessMin.toFixed(2)} (min) ~ ${result.fitnessMax.toFixed(2)} (max), avg ${result.fitnessAvg.toFixed(2)}`)
        console.log(`   stopNl avg:     ${result.stopNlAvg.toFixed(0)}`)
        console.log(`   stopExecutions: ${result.stopExecutionsAvg.toFixed(0)} avg`)
        console.log(`   elapsed:        ${tElapsed} ms`)
        console.log('')
    }

    console.log('=================================================================')
    console.log('Scenario                            | fitAvg  | stopNl | stopExec ')
    console.log('=================================================================')
    allResults.forEach((r) => {
        console.log(`${r.name.padEnd(36)}| ${r.fitnessAvg.toFixed(2).padStart(7)} | ${String(r.stopNlAvg.toFixed(0)).padStart(6)} | ${String(r.stopExecutionsAvg.toFixed(0)).padStart(8)}`)
    })

}


test()
    .catch((err) => {
        console.log(err)
    })

//node g4.omlACO.benchmarkAdapter.mjs
