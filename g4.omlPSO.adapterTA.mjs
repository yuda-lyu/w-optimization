import _ from 'lodash-es'
import w from 'wsemi'
import omlPSO from './src/omlPSO.mjs'
import _adapterTA from './src/_adapterTA.mjs'


// ============================================================================
// 範例: 用 TA 當「控制器」自適應 PSO 的超參數
//
// 架構:
//   omlPSO (被控制) — 透過 funGenerationBefore / funGenerationAfter 兩接口跟外部對話
//   _adapterTA (控制器) — caller 提供 schema 列出要 adapt 的 PSO 超參數
//
// TA 跟 SA 對比:
//   SA: 惡化機率接受 exp(-ΔF/T)         隨機性
//   TA: 惡化門檻接受 ΔF < threshold     確定性(同 seed 同結果)
// 共同特點: 單點軌跡 + 鄰點微擾, state 最簡單(current + threshold + bestEver)
//
// 題目: 沿用 g4 同款 3 變數曲線擬合 (對比 omlPSO 預設參數跑出之 fitness ≈ 1599)
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
        _ps.push({
            Depth: w.cdbl(Depth),
            Vs: w.cdbl(Vs),
        })
    }
    ps = _ps
})


async function test() {

    let dps = [
        { values: w.rang(100, 300, 1000), n: 1000 },
        { values: w.rang(0, 50, 1000), n: 1000 },
        { values: w.rang(-1000, 0, 1000), n: 1000 },
    ]

    async function fun(params) {
        let a = params[0]
        let b = params[1]
        let c = params[2]
        let fitness = 0
        _.each(ps, (v) => {
            let d = Math.max(v.Depth + b, 0.001)
            let Vs = a * Math.log(d) + c
            Vs = Math.max(Vs, 0)
            fitness += Math.abs(Vs - v.Vs)
        })
        return fitness
    }

    //TA 要 adapt 的 5 個 PSO 參數 schema (格式同 dps: { name, values })
    let schema = [
        { name: 'psoC1', values: w.rang(0, 4, 20) },
        { name: 'psoC2', values: w.rang(0, 4, 20) },
        { name: 'psoBeta', values: w.rang(0.5, 1.0, 10) },
        { name: 'psoGamma', values: w.rang(0.1, 1.0, 9) },
        { name: 'ModeOutLimit', values: ['mapping', 'limit', 'random'] },
    ]

    //建立 TA meta-optimizer
    let ta = _adapterTA(schema, {
        taThresholdInitial: 50,
        taThresholdRatio: 0.99,
    })

    //統計每個 schema item 各 idx 被 TA 抽到的次數
    let pickCount = schema.map((s) => new Array(s.values.length).fill(0))

    //TA 控制 PSO
    let r = await omlPSO(dps, fun, {
        Np: 20,
        NContiguous: 100,
        LocalSearchMethod: 'None',
        funGenerationBefore: (ctx) => {
            let params = ta.suggest()
            schema.forEach((s, i) => {
                let idx = s.values.indexOf(params[s.name])
                if (idx >= 0) {
                    pickCount[i][idx]++
                }
            })
            return { params }
        },
        funGenerationAfter: (ctx) => {
            ta.feedback(ctx.params, ctx.childrenBestFitness)
        },
    })

    console.log('bestSolution', r.bestSolution)
    console.log('stopMode', r.stopMode)
    console.log('stopNl', r.stopNl)
    console.log('stopExecutions', r.stopExecutions)
    console.log('')

    console.log('TA 抽選頻率 (各 schema item 之 Top 3):')
    let totalGen = r.stopNl + 1
    schema.forEach((s, i) => {
        let sorted = pickCount[i]
            .map((cnt, idx) => ({ idx, cnt, value: s.values[idx] }))
            .sort((a, b) => b.cnt - a.cnt)
            .slice(0, 3)
        console.log(`  ${s.name}:`)
        sorted.forEach(({ value, cnt }) => {
            let pct = (cnt / totalGen * 100).toFixed(1)
            console.log(`     ${String(value).padEnd(20)} 被抽 ${String(cnt).padStart(3)} 次 (${pct}%)`)
        })
    })

    //印 TA 目前狀態
    let current = ta.getCurrent()
    let bestEver = ta.getBestEver()
    let currentParams = schema.map((s, i) => `${s.name}=${s.values[current.ind[i]]}`).join(', ')
    let bestParams = schema.map((s, i) => `${s.name}=${s.values[bestEver.ind[i]]}`).join(', ')
    console.log('\nTA 結束狀態:')
    console.log(`  threshold = ${ta.getThreshold().toFixed(4)}`)
    console.log(`  current  (fitness=${current.fitness.toFixed(2)}): ${currentParams}`)
    console.log(`  bestEver (fitness=${bestEver.fitness.toFixed(2)}): ${bestParams}`)

}

test()
    .catch((err) => {
        console.log(err)
    })

//node g4.omlPSO.adapterTA.mjs
