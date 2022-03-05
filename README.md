# w-optimization
A tool for optimization algorithm.

![language](https://img.shields.io/badge/language-JavaScript-orange.svg) 
[![npm version](http://img.shields.io/npm/v/w-optimization.svg?style=flat)](https://npmjs.org/package/w-optimization) 
[![license](https://img.shields.io/npm/l/w-optimization.svg?style=flat)](https://npmjs.org/package/w-optimization) 
[![gzip file size](http://img.badgesize.io/yuda-lyu/w-optimization/master/dist/w-optimization.umd.js.svg?compression=gzip)](https://github.com/yuda-lyu/w-optimization)
[![npm download](https://img.shields.io/npm/dt/w-optimization.svg)](https://npmjs.org/package/w-optimization) 
[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-optimization.svg)](https://www.jsdelivr.com/package/npm/w-optimization)

## Documentation
To view documentation or get support, visit [docs](https://yuda-lyu.github.io/w-optimization/global.html).

## Installation
### Using npm(ES6 module):
> **Note:** w-optimization is mainly dependent on `wsemi` and `lodash`.
```alias
npm i w-optimization
```

### Algorithm
`w-optimization`'s algorithm includes the following:
* arrBinarySearch [[exam](https://github.com/yuda-lyu/w-optimization/blob/master/g.arrBinartSearch.mjs)]
* arrBinarySearchClosest [[exam](https://github.com/yuda-lyu/w-optimization/blob/master/g.arrBinarySearchClosest.mjs)]
* binarySearch [[1p](https://github.com/yuda-lyu/w-optimization/blob/master/g1.binarySearch.mjs)]
* cobyla [[1p](https://github.com/yuda-lyu/w-optimization/blob/master/g1.cobyla.mjs)], [[2p](https://github.com/yuda-lyu/w-optimization/blob/master/g2.cobyla.mjs)], [[3p](https://github.com/yuda-lyu/w-optimization/blob/master/g3.cobyla.mjs)]
* goldenSection [[1p](https://github.com/yuda-lyu/w-optimization/blob/master/g1.goldenSection.mjs)]
* goldenSectionLiberate [[1p](https://github.com/yuda-lyu/w-optimization/blob/master/g1.goldenSectionLiberate.mjs)]
* limitBFGS [[1p](https://github.com/yuda-lyu/w-optimization/blob/master/g1.limitBFGS.mjs)], [[2p](https://github.com/yuda-lyu/w-optimization/blob/master/g2.limitBFGS.mjs)], [[3p](https://github.com/yuda-lyu/w-optimization/blob/master/g3.limitBFGS.mjs)]
* nelderMead [[1p](https://github.com/yuda-lyu/w-optimization/blob/master/g1.nelderMead.mjs)], [[2p](https://github.com/yuda-lyu/w-optimization/blob/master/g2.nelderMead.mjs)], [[3p](https://github.com/yuda-lyu/w-optimization/blob/master/g3.nelderMead.mjs)]
* setpBracket [[1p](https://github.com/yuda-lyu/w-optimization/blob/master/g1.setpBracket.mjs)]

### nelderMead for x1
```alias
import nelderMead from 'w-optimization/src/nelderMead.mjs'

async function test() {

    async function fun(params) {
        let x = params[0] / 180 * Math.PI
        return Math.sin(x)
    }

    console.log(await nelderMead(fun, [0]))
    // => { count: 78, y: -1, x: [ -90.0000000000001 ] }

    console.log(await nelderMead(fun, [87]))
    // => { count: 58, y: -1, x: [ -90.00000057220495 ] }

    console.log(await nelderMead(fun, [90]))
    // => { count: 58, y: -1, x: [ 270 ] }

}

test()
    .catch((err) => {
        console.log(err)
    })

```

### nelderMead for x1~x2
```alias
import nelderMead from 'w-optimization/src/nelderMead.mjs'

async function test() {

    async function fun(params) {
        let x = params[0]
        let y = params[1]
        return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
    }

    console.log(await nelderMead(fun, [-3.5, 3.5]))
    // => {
    //   count: 130,
    //   y: 5.786322126017525e-19,
    //   x: [ 0.000007191110664735547, -0.00000719035057196422 ]
    // }

}

test()
    .catch((err) => {
        console.log(err)
    })

```

### nelderMead for x1~x3
```alias
import nelderMead from 'w-optimization/src/nelderMead.mjs'

async function test() {

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

    console.log(await nelderMead(fun, [0, 0, 0])) //初始值影響很大, 用0,0,0比較是曲線, 否則很容易找到高係數而近直線之回歸線
    // => {
    //   count: 326,
    //   y: 1782.0083185373996,
    //   x: [ 79.27689137899918, 4.16685541895392, -19.853651133415656 ]
    // }

}

test()
    .catch((err) => {
        console.log(err)
    })

```

