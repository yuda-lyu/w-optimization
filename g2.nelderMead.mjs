import _ from 'lodash'
import w from 'wsemi'
import nelderMead from './src/nelderMead.mjs'


let t = `
3 169
4 170
5 184
6 196
7 190
8 195
9 188
10 207
11 209
12 223
13 229
14 226
15 221
16 218
17 203
18 234
19 231
20 207
21 201
22 210
23 207
24 214
25 198
26 192
27 219
28 222
29 212
30 221
31 233
32 226
33 224
34 257
35 247
36 232
37 252
38 234
39 213
40 231
41 226
42 215
43 237
44 230
45 241
46 247
47 210
48 252
49 236
50 244
51 255
52 244
53 267
54 293
55 284
56 346
57 323
58 337
59 306
60 311
61 342
62 313
63 333
64 323
65 318
66 336
67 348
68 357
69 361
70 367
71 354
72 297
73 308
74 339
75 290
76 345
77 333
78 351
79 364
80 358
81 317
82 326
83 357
84 361
85 345
86 316
87 334
88 323
89 355
90 348
91 375
92 355
93 354
94 371
95 367
96 392
97 361
98 386
99 397
100 385
`
let ps = w.sep(t, '\n')
ps = _.map(ps, (v) => {
    let s = w.sep(v, ' ')
    let Depth = w.cdbl(_.get(s, 0, '')) //Depth
    let Vs = w.cdbl(_.get(s, 1, '')) //Vs
    return { Depth, Vs }
})
// console.log(ps)

function fun(params) {
    //Vs=166.92*ln(x+35)-455.84
    //a=166.02, b=35, c=-455.84
    let a = params[0]
    let b = params[1]
    let c = params[2]
    let fitness = 0
    _.each(ps, (v) => {
        let d = Math.max(v.Depth + b, 0.001)
        let Vs = a * Math.log(d) + c
        Vs = Math.max(Vs, 0)
        let dy = Vs - v.Vs
        // fitness += dy * dy
        fitness += Math.abs(dy)
    })
    // fitness = Math.sqrt(fitness)
    // console.log('x', x, 'fitness', fitness)
    return fitness
}

let r = nelderMead(fun, [0, 0, 0]) //初始值影響很大, 用0,0,0比較是曲線, 否則很容易找到高係數而近直線之回歸線
console.log(r)
// => {
//   y: 2721.5171233189885,
//   x: [ 79.53435702208205, 7.513992195041164, -24.347213564670433 ]
// }

//node --experimental-modules --es-module-specifier-resolution=node g2.nelderMead.mjs
