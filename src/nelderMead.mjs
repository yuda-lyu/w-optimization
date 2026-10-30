import size from 'lodash-es/size.js'
import ispm from 'wsemi/src/ispm.mjs'
import { kFun, kNum, kPnum, kPint, kNumArr, chkParams } from './_checkParam.mjs'


function weightedSum(ret, w1, v1, w2, v2) {
    for (let j = 0; j < ret.length; ++j) {
        ret[j] = w1 * v1[j] + w2 * v2[j]
    }
}


function sortOrder(a, b) {
    return a.y - b.y
}


/**
 * 下山單純形法
 *
 * Fork: {@link https://github.com/benfred/fmin/blob/master/src/nelderMead.js nelderMead.js}
 *
 * Rela: {@link https://www.zhangzk.net/docs/publications/thesis.pdf 张在坤/无导数优化方法的研究}
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/nelderMead.test.js Github}
 * @memberOf w-optimization
 * @param {Function} fun 輸入適應函數，將傳入變數組params，需回傳適應函數值，以求解最小值為目標。種類：函數，必給
 * @param {Array} params 輸入初始變數組，若適應函數fun需輸入3參數，則就需輸入[a,b,c]陣列作為初始值。種類：資料陣列，必給，非空陣列，元素為有效數字：數字或數字字串(轉換後使用)，'-'、'NP'、''等非數字字串與null、布林、NaN、Infinity皆為無效，訊息帶元素索引；不改寫呼叫端之陣列
 * @param {Object} [opt={}] 輸入設定物件，預設{}。種類：一般物件，undefined或null視為未給，其餘非一般物件為無效；未宣告之鍵忽略；各鍵給了而不符種類即為無效，不改用預設
 * @param {Number|String} [opt.maxIterations] 輸入最大迭代次數，若無則預設為變數組長度*200。種類：有效數字，正整數
 * @param {Number|String} [opt.nonZeroDelta=1.05] 輸入初始單純形各非零變數之放大倍率，預設1.05。種類：有效數字
 * @param {Number|String} [opt.delta=0.001] 輸入步長(初始單純形中零值變數之位移)，預設0.001。種類：有效數字，正數
 * @param {Number|String} [opt.minErrorDelta=1e-6] 輸入最小誤差步長，預設1e-6。種類：有效數字，正數
 * @param {Number|String} [opt.minTolerance=1e-5] 輸入最小收斂門檻值，預設1e-5。種類：有效數字，正數
 * @param {Number|String} [opt.rho=1] 輸入上輪第1節點權重，預設1。種類：有效數字
 * @param {Number|String} [opt.chi=2] 輸入上輪第2節點權重，預設2。種類：有效數字
 * @param {Number|String} [opt.psi=-0.5] 輸入下輪第1節點權重，預設-0.5。種類：有效數字
 * @param {Number|String} [opt.sigma=0.5] 輸入下輪第2節點權重，預設0.5。種類：有效數字
 * @returns {Promise} 回傳Promise，resolve為求解後結果物件，含鍵值x,y，x為求解後變數組，y為最優適應函數值；輸入無效時reject字串，格式為`invalid <名稱>: must be <種類描述>`，不含輸入值
 * @example
 *
 * async function test1() {
 *
 *     async function fun(params) {
 *         let x = params[0] / 180 * Math.PI
 *         return Math.sin(x)
 *     }
 *
 *     console.log(await nelderMead(fun, [0]))
 *     // => { count: 78, y: -1, x: [ -90.0000000000001 ] }
 *
 *     console.log(await nelderMead(fun, [87]))
 *     // => { count: 58, y: -1, x: [ -90.00000057220495 ] }
 *
 *     console.log(await nelderMead(fun, [90]))
 *     // => { count: 58, y: -1, x: [ 270 ] }
 *
 * }
 * test1()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 * async function test2() {
 *
 *     async function fun(params) {
 *         let x = params[0]
 *         let y = params[1]
 *         return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
 *     }
 *
 *     console.log(await nelderMead(fun, [-3.5, 3.5]))
 *     // => {
 *     //   count: 130,
 *     //   y: 5.786322126017525e-19,
 *     //   x: [ 0.000007191110664735547, -0.00000719035057196422 ]
 *     // }
 *
 * }
 * test2()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 * async function test3() {
 *
 *     let t = `
 * 0
 * 3
 * 4
 * 5 157
 * 6 164
 * 7 186
 * 8 177
 * 9 178
 * 10 188
 * 11 189
 * 12 180
 * 13 180
 * 14 197
 * 15 198
 * 16 200
 * 17 214
 * 18 221
 * 19 219
 * 20 248
 * 21 252
 * 22 244
 * 23 289
 * 24 282
 * 25 276
 * 26 306
 * 27 299
 * 28 269
 * 29 282
 * 30 287
 * 31 298
 * 32 275
 * 33 273
 * 34 269
 * 35 281
 * 36 288
 * 37 310
 * 38 308
 * 39 297
 * 40 301
 * 41 282
 * 42 304
 * 43 291
 * 44 275
 * 45 279
 * 46 300
 * 47 309
 * 48 306
 * 49 367
 * 50 308
 * 51 315
 * 52 282
 * 53 302
 * 54 271
 * 55 290
 * 56 290
 * 57 299
 * 58 290
 * 59 304
 * 60 308
 * 61 306
 * 62 309
 * 63 351
 * 64 309
 * 65 306
 * 66 297
 * 67 334
 * 68 304
 * 69 323
 * 70 318
 * 71 328
 * 72 295
 * 73 301
 * 74 295
 * 75 297
 * 76 308
 * 77 295
 * 78 345
 * 79 361
 * 80 370
 * 81 381
 * 82 334
 * 83 374
 * 84 385
 * 85 354
 * 86 311
 * 87 345
 * 88 331
 * 89 364
 * 90 339
 * 91 311
 * 92 323
 * 93 295
 * 94 318
 * 95 310
 * 96 315
 * 97 315
 * 98 358
 * 99 342
 * 100 351
 * `
 *     let ps = w.sep(t, '\n')
 *     let _ps = []
 *     _.each(ps, (v) => {
 *         let s = w.sep(v, ' ')
 *         let Depth = _.get(s, 0, '')
 *         let Vs = _.get(s, 1, '')
 *         if (w.isnum(Depth) && w.isnum(Vs)) {
 *             _ps.push({
 *                 Depth: w.cdbl(Depth),
 *                 Vs: w.cdbl(Vs),
 *             })
 *         }
 *         ps = _ps
 *     })
 *     // console.log(ps)
 *
 *     async function fun(params) {
 *         //Vs=166.92*ln(x+35)-455.84
 *         //a=166.02, b=35, c=-455.84
 *         let a = params[0]
 *         let b = params[1]
 *         let c = params[2]
 *         let fitness = 0
 *         _.each(ps, (v) => {
 *             let d = Math.max(v.Depth + b, 0.001) //深度+b需>0
 *             let Vs = a * Math.log(d) + c
 *             Vs = Math.max(Vs, 0) //不能給予0.001, 否則適應函數為分連續可微
 *             let dy = Vs - v.Vs
 *             // fitness += dy * dy
 *             fitness += Math.abs(dy)
 *         })
 *         // fitness = Math.sqrt(fitness)
 *         // console.log('x', x, 'fitness', fitness)
 *         return fitness
 *     }
 *
 *     console.log(await nelderMead(fun, [0, 0, 0])) //初始值影響很大, 用0,0,0比較是曲線, 否則很容易找到高係數而近直線之回歸線
 *     // => {
 *     //   count: 326,
 *     //   y: 1782.0083185373996,
 *     //   x: [ 79.27689137899918, 4.16685541895392, -19.853651133415656 ]
 *     // }
 *
 * }
 * test3()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function nelderMead(fun, params, opt = {}) {

    //check, 一般參數與opt先於任何適應函數呼叫檢測, 檢測之值即使用之值(params為轉換後之新陣列, 不改寫呼叫端之陣列)
    let c = chkParams([[fun, 'fun', kFun], [params, 'params', kNumArr]], opt, {
        maxIterations: [kPint, undefined], //未給則為變數組長度*200
        nonZeroDelta: [kNum, 1.05],
        delta: [kPnum, 0.001],
        minErrorDelta: [kPnum, 1e-6],
        minTolerance: [kPnum, 1e-5],
        rho: [kNum, 1],
        chi: [kNum, 2],
        psi: [kNum, -0.5],
        sigma: [kNum, 0.5],
    })
    if (c.err !== '') {
        return Promise.reject(c.err)
    }
    params = c.vs[1]

    //n
    let n = size(params)

    //maxIterations
    let maxIterations = c.o.maxIterations
    if (maxIterations === undefined) {
        maxIterations = n * 200
    }

    let nonZeroDelta = c.o.nonZeroDelta
    let delta = c.o.delta
    let minErrorDelta = c.o.minErrorDelta
    let minTolerance = c.o.minTolerance
    let rho = c.o.rho
    let chi = c.o.chi
    let psi = c.o.psi
    let sigma = c.o.sigma

    //countCalc
    let countCalc = 0

    //func
    async function func() { //要使用arguments不能用箭頭函數
        let r = fun(...arguments)
        if (ispm(r)) {
            r = await r
        }
        countCalc++
        return r
    }

    //simplex
    let simplex = new Array(n + 1)
    simplex[0] = params
    simplex[0].y = await func(params)
    simplex[0].id = 0
    for (let i = 0; i < n; ++i) {
        let point = params.slice()
        point[i] = point[i] ? point[i] * nonZeroDelta : delta
        simplex[i + 1] = point
        simplex[i + 1].y = await func(point)
        simplex[i + 1].id = i + 1
    }

    //updateSimplex
    let updateSimplex = (value) => {
        for (let i = 0; i < value.length; i++) {
            simplex[n][i] = value[i]
        }
        simplex[n].y = value.y
    }

    let maxDiff
    let centroid = params.slice()
    let reflected = params.slice()
    let contracted = params.slice()
    let expanded = params.slice()
    for (let iteration = 0; iteration < maxIterations; ++iteration) {

        //sort
        simplex.sort(sortOrder)

        // if (opt.history) {

        //     // copy the simplex (since later iterations will mutate) and sort it to have a consistent order between iterations
        //     let sortedSimplex = simplex.map(function (x) {
        //         let state = x.slice()
        //         state.y = x.y
        //         state.id = x.id
        //         return state
        //     })

        //     //sort
        //     sortedSimplex.sort(function(a, b) {
        //         return a.id - b.id
        //     })

        //     //push
        //     opt.history.push({
        //         x: simplex[0].slice(),
        //         y: simplex[0].y,
        //         simplex: sortedSimplex
        //     })

        // }

        //maxDiff
        maxDiff = 0
        for (let i = 0; i < n; ++i) {
            maxDiff = Math.max(maxDiff, Math.abs(simplex[0][i] - simplex[1][i]))
        }

        //check
        if ((Math.abs(simplex[0].y - simplex[n].y) < minErrorDelta) &&
            (maxDiff < minTolerance)) {
            break
        }

        // compute the centroid of all but the worst point in the simplex
        for (let i = 0; i < n; ++i) {
            centroid[i] = 0
            for (let j = 0; j < n; ++j) {
                centroid[i] += simplex[j][i]
            }
            centroid[i] /= n
        }

        // reflect the worst point past the centroid  and compute loss at reflected point
        let worst = simplex[n]
        weightedSum(reflected, 1 + rho, centroid, -rho, worst)
        reflected.y = await func(reflected)

        // if the reflected point is the best seen, then possibly expand
        if (reflected.y < simplex[0].y) {
            weightedSum(expanded, 1 + chi, centroid, -chi, worst)
            expanded.y = await func(expanded)
            if (expanded.y < reflected.y) {
                updateSimplex(expanded)
            }
            else {
                updateSimplex(reflected)
            }
        }

        // if the reflected point is worse than the second worst, we need to contract
        else if (reflected.y >= simplex[n - 1].y) {
            let shouldReduce = false

            if (reflected.y > worst.y) {

                //inside contraction
                weightedSum(contracted, 1 + psi, centroid, -psi, worst)
                contracted.y = await func(contracted)
                if (contracted.y < worst.y) {
                    updateSimplex(contracted)
                }
                else {
                    shouldReduce = true
                }

            }
            else {

                //outside contraction
                weightedSum(contracted, 1 - psi * rho, centroid, psi * rho, worst)
                contracted.y = await func(contracted)
                if (contracted.y < reflected.y) {
                    updateSimplex(contracted)
                }
                else {
                    shouldReduce = true
                }

            }

            //shouldReduce
            if (shouldReduce) {

                //check
                if (sigma >= 1) {
                    break
                }

                //reduction
                for (let i = 1; i < simplex.length; ++i) {
                    weightedSum(simplex[i], 1 - sigma, simplex[0], sigma, simplex[i])
                    simplex[i].y = await func(simplex[i])
                }

            }
        }
        else {
            updateSimplex(reflected)
        }
    }

    //sort
    simplex.sort(sortOrder)

    //x
    let x = []
    let xs = simplex[0]
    for (let i = 0; i < n; i++) {
        // console.log(i, n, xs[i])
        x.push(xs[i])
    }

    return {
        count: countCalc,
        y: simplex[0].y,
        x,
    }
}


export default nelderMead
