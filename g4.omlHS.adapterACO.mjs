import _ from 'lodash-es'
import w from 'wsemi'
import omlHS from './src/omlHS.mjs'
import _adapterACO from './src/_adapterACO.mjs'


// ============================================================================
// 範例: 用 ACO 當「控制器」自適應 DE 的超參數
//
// 架構:
//   omlHS (被控制) — 透過 funGenerationBefore / funGenerationAfter 兩接口跟外部對話
//   _adapterACO (控制器) — caller 提供 schema 列出要 adapt 的 DE 超參數
//
// 每代 DE 主迴圈:
//   1. funGenerationBefore: 從 ACO suggest() 取一組 params 覆寫本代要用的 DE 參數
//   2. DE 跑一代
//   3. funGenerationAfter: 把本代 fitness 餵回 ACO feedback() 強化 pheromone
//   4. ACO 經過多代學習, 收斂到「對本問題表現好」的超參數組合
//
// 題目: 沿用 g4 之 3 變數曲線擬合 (對比 omlHS 預設參數跑出之 fitness ≈ 1599)
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
        //Vs = a · ln(x + b) + c, 求 (a, b, c)
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

    //ACO 要 adapt 的 5 個 HS 參數 schema (格式同 dps: { name, values })
    let schema = [
        { name: 'hsHMCR', values: w.rang(0, 1, 20) }, //21 階, step 0.05
        { name: 'hsPAR', values: w.rang(0, 1, 20) }, //21 階, step 0.05
        { name: 'hsHMC', values: ['Original', '2M Consideration', '2MB Consideration', '3M Consideration', '3MB Consideration', '4M Consideration', '4MB Consideration'] },
        { name: 'hsPA', values: ['Constant1', 'Constant2', 'Constant3', 'Linear0.1', 'Linear0.2', 'Linear0.3', 'Exponent0.1', 'Exponent0.2', 'Exponent0.3', 'Global Space', 'Available Space', 'Modified Global Best'] },
        { name: 'ModeOutLimit', values: ['mapping', 'limit', 'random'] },
    ]

    //建立 ACO meta-optimizer
    let aco = _adapterACO(schema, {
        acoExploitationRate: 0.8,
        acoAlpha: 0.1,
    })

    //統計每個 schema item 各 idx 被 ACO 抽到的次數(觀察 ACO 真實偏好)
    let pickCount = schema.map((s) => new Array(s.values.length).fill(0))

    //ACO 控制 DE: 透過 funGenerationBefore / funGenerationAfter 兩接口接通
    let r = await omlHS(dps, fun, {
        Np: 20,
        NContiguous: 100,
        LocalSearchMethod: 'None', //關掉 LocalSearch 簡化觀察 ACO 自身對 DE 超參數之適配效果
        funGenerationBefore: (ctx) => { //每代開頭: ACO 抽一組超參數覆寫
            let params = aco.suggest()
            //記錄抽到的 idx (用 value 反查 idx)
            schema.forEach((s, i) => {
                let idx = s.values.indexOf(params[s.name])
                if (idx >= 0) {
                    pickCount[i][idx]++
                }
            })
            return { params }
        },
        funGenerationAfter: (ctx) => { //每代結尾: 把本代 fitness 回饋給 ACO 強化 pheromone
            aco.feedback(ctx.params, ctx.childrenBestFitness)
        },
    })

    console.log('bestSolution', r.bestSolution)
    console.log('stopMode', r.stopMode)
    console.log('stopNi', r.stopNi)
    console.log('stopExecutions', r.stopExecutions)
    console.log('')

    console.log('ACO 抽選頻率 (各 schema item 之 Top 3):')
    let totalGen = r.stopNi + 1
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

}

test()
    .catch((err) => {
        console.log(err)
    })

//node g4.omlHS.adapterACO.mjs
