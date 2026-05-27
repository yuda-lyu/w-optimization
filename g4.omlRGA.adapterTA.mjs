import _ from 'lodash-es'
import w from 'wsemi'
import omlRGA from './src/omlRGA.mjs'
import _adapterTA from './src/_adapterTA.mjs'


// ============================================================================
// 範例: 用 TA 當「控制器」自適應 RGA 的超參數
//   omlRGA (被控制) — 透過 funGenerationBefore / funGenerationAfter 兩接口跟外部對話
//   _adapterTA (控制器) — caller 提供 schema 列出要 adapt 的 RGA 超參數
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


async function test() {

    let dps = [
        { values: w.rang(100, 300, 1000), n: 1001 },
        { values: w.rang(0, 50, 1000), n: 1001 },
        { values: w.rang(-1000, 0, 1000), n: 1001 },
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

    //ACO 要 adapt 的 6 個 RGA 參數 schema
    let schema = [
        { name: 'rgaMutationRate', values: w.rang(0, 1, 20) }, //21 階, step 0.05
        { name: 'rgaSelection', values: ['Roulette Wheel Selection', 'Tournament Selection', 'Ranking Selection', 'Uniform Selection'] },
        { name: 'rgaCrossover', values: ['Flat Crossover', 'BLX-a Crossover', 'Linear Crossover', 'Arithmetical Crossover', 'Chung Crossover', 'DE1 Crossover', '3P Crossover', '3PB Crossover', 'DE2 Crossover', '4P Crossover', '4PB Crossover', 'HS Crossover', 'Guiding Function'] },
        { name: 'rgaMutation', values: ['Constant1', 'Constant2', 'Constant3', 'Linear0.1', 'Linear0.2', 'Linear0.3', 'Exponent0.1', 'Exponent0.2', 'Exponent0.3', 'Global Space'] },
        { name: 'rgaElitism', values: ['No', 'BestOne', 'HalfPop', 'AllPop'] },
        { name: 'ModeOutLimit', values: ['Mapping', 'Limit', 'Random'] },
        { name: 'LocalSearchMethod', values: ['None', 'Neighbor', 'TA', 'SA', 'OneGold', 'Gold', 'NelderMead'] },
    ]

    //建立 TA meta-optimizer
    let ta = _adapterTA(schema, {
        taThresholdInitial: 50,
        taThresholdRatio: 0.99,
    })

    let pickCount = schema.map((s) => new Array(s.values.length).fill(0))

    //TA 控制 RGA
    let r = await omlRGA(dps, fun, {
        Np: 20,
        NContiguous: 100,
        funGenerationBefore: (ctx) => {
            let params = ta.suggest()
            schema.forEach((s, i) => {
                let idx = s.values.indexOf(params[s.name])
                if (idx >= 0) pickCount[i][idx]++
            })
            return { params }
        },
        funGenerationAfter: (ctx) => {
            ta.feedback(ctx.params, ctx.childrenBestFitness)
        },
    })

    console.log('bestSolution', r.bestSolution)
    console.log('stopMode', r.stopMode)
    console.log('stopNg', r.stopNg)
    console.log('stopExecutions', r.stopExecutions)
    console.log('')

    console.log('TA 抽選頻率 (各 schema item 之 Top 3):')
    let totalGen = r.stopNg + 1
    schema.forEach((s, i) => {
        let sorted = pickCount[i]
            .map((cnt, idx) => ({ idx, cnt, value: s.values[idx] }))
            .sort((a, b) => b.cnt - a.cnt)
            .slice(0, 3)
        console.log(`  ${s.name}:`)
        sorted.forEach(({ value, cnt }) => {
            let pct = (cnt / totalGen * 100).toFixed(1)
            console.log(`     ${String(value).padEnd(28)} 被抽 ${String(cnt).padStart(3)} 次 (${pct}%)`)
        })
    })

}


test()
    .catch((err) => {
        console.log(err)
    })

//node g4.omlRGA.adapterTA.mjs
