import assert from 'assert'
import _ from 'lodash-es'
import w from 'wsemi'
import omlDE from '../src/omlDE.mjs'


describe('omlDE', function() {

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
    // console.log(ps)

    let dps = [
        { //x1: 182.79083587256468
            // values: w.rang(180, 190, 1000),
            values: w.rang(100, 300, 1000),
            n: 1000,
        },
        { //x2: 32.12798318733953
            // values: w.rang(25, 35, 1000),
            values: w.rang(0, 50, 1000),
            n: 1000,
        },
        { //x3: -525.813178715664
            // values: w.rang(-530, -520, 1000),
            values: w.rang(-1000, 0, 1000),
            n: 1000,
        },
        //y: 1598.9661723792265
    ]

    async function fun(params) {
        //Vs=166.92*ln(x+35)-455.84
        //a=166.02, b=35, c=-455.84
        let a = params[0]
        let b = params[1]
        let c = params[2]
        let fitness = 0
        _.each(ps, (v) => {
            let d = Math.max(v.Depth + b, 0.001) //深度+b需>0
            let Vs = a * Math.log(d) + c
            Vs = Math.max(Vs, 0) //不能給予0.001, 否則適應函數為分連續可微
            let dy = Vs - v.Vs
            // fitness += dy * dy
            fitness += Math.abs(dy)
        })
        // fitness = Math.sqrt(fitness)
        // console.log('x', x, 'fitness', fitness)
        return fitness
    }

    // let r = await omlDE(dps, fun)
    // console.log('bestSolution', r.bestSolution)
    // console.log('stopMode', r.stopMode)
    // console.log('stopNg', r.stopNg)
    // console.log('stopExecutions', r.stopExecutions)
    // => bestSolution {
    //   ps: [
    //     { ind: 416, value: 183.19999999999726 },
    //     { ind: 646, value: 32.3000000000003 },
    //     { ind: 472, value: -528 }
    //   ],
    //   fitness: 1599.218200884655
    // }
    // => stopMode stop by iContinue[100] >= NContiguous[100]
    // => stopNg 4358
    // => stopExecutions 654688

    it(`should return true when input dps, fun`, async function() {
        let rr = await omlDE(dps, fun)
        //隨機多點最佳化不能保證穩定值, 故偵測欄位是否存在
        let rt = w.iseobj(_.get(rr, 'bestSolution')) && w.isearr(_.get(rr, 'bestSolution.ps')) && w.isnum(_.get(rr, 'bestSolution.fitness'))
        assert.strict.deepEqual(true, rt)
    })

})
