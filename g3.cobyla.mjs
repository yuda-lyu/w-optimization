import _ from 'lodash'
import w from 'wsemi'
import cobyla from './src/cobyla.mjs'


// DH-03
let t = `
0 
3 
4 
5 157
6 164
7 186
8 177
9 178
10 188
11 189
12 180
13 180
14 197
15 198
16 200
17 214
18 221
19 219
20 248
21 252
22 244
23 289
24 282
25 276
26 306
27 299
28 269
29 282
30 287
31 298
32 275
33 273
34 269
35 281
36 288
37 310
38 308
39 297
40 301
41 282
42 304
43 291
44 275
45 279
46 300
47 309
48 306
49 367
50 308
51 315
52 282
53 302
54 271
55 290
56 290
57 299
58 290
59 304
60 308
61 306
62 309
63 351
64 309
65 306
66 297
67 334
68 304
69 323
70 318
71 328
72 295
73 301
74 295
75 297
76 308
77 295
78 345
79 361
80 370
81 381
82 334
83 374
84 385
85 354
86 311
87 345
88 331
89 364
90 339
91 311
92 323
93 295
94 318
95 310
96 315
97 315
98 358
99 342
100 351
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

async function test() {

    async function fun(params) {
        //Vs=166.92*ln(x+35)-455.84
        //a=166.02, b=35, c=-455.84
        let a = params[0]
        let b = params[1]
        let c = params[2]
        let fitness = 0
        _.each(ps, (v) => {
            let d = Math.max(v.Depth + b, 0.001) ////深度+b需>0
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

    console.log(await cobyla(fun, [0, 0, 0])) //初始值影響很大, 用0,0,0比較是曲線, 否則很容易找到高係數而近直線之回歸線
    // => {
    //   count: 95,
    //   y: 1747.3650361651364,
    //   x: [ 69.13901179827512, 1.4516027080364329, 25.139245519172714 ]
    // }

}

test()
    .catch((err) => {
        console.log(err)
    })

//node --experimental-modules --es-module-specifier-resolution=node g3.cobyla.mjs
