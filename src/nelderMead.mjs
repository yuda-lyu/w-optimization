import get from 'lodash/get'
import size from 'lodash/size'
import isnum from 'wsemi/src/isnum.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'


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
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/nelderMead.test.js Github}
 * @memberOf w-optimization
 * @param {Function} fun 輸入適應函數，將傳入變數組params，需回傳適應函數值，以求解最小值為目標
 * @param {Array} params 輸入初始變數組，若適應函數fun需輸入3參數，則就需輸入[a,b,c]陣列作為初始值
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Number} [opt.maxIterations=null] 輸入最大迭代次數整數，若無則預設為變數組長度*200
 * @param {Number} [opt.zeroDelta=0.001] 輸入步長數字，預設0.001
 * @param {Number} [opt.minErrorDelta=1e-6] 輸入最小誤差步長數字，預設1e-6
 * @param {Number} [opt.minTolerance=1e-5] 輸入最小收斂門檻值數字，預設1e-5
 * @param {Number} [opt.rho=1] 輸入上輪第1節點權重數字，預設1
 * @param {Number} [opt.chi=2] 輸入上輪第2節點權重數字，預設2
 * @param {Number} [opt.psi=-0.5] 輸入下輪第1節點權重數字，預設-0.5
 * @param {Number} [opt.sigma=0.5] 輸入下輪第2節點權重數字，預設0.5
 * @returns {Object} 回傳求解後結果物件，含鍵值x,y，x為求解後變數組，y為最優適應函數值
 * @example
 *
 * function fun(params) {
 *     let x = params[0]
 *     let y = params[1]
 *     return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
 * }
 *
 * let r = nelderMead(fun, [-3.5, 3.5])
 * console.log(r)
 * // => {
 * //   y: 5.786322126017525e-19,
 * //   x: [ 0.000007191110664735547, -0.00000719035057196422 ]
 * // }
 *
 */
function nelderMead(fun, params, opt = {}) {

    //check fun
    if (!isfun(fun)) {
        throw new Error('invalid fun')
    }

    //check params
    if (!isearr(params)) {
        throw new Error('params is not an effective array')
    }

    //n
    let n = size(params)

    //maxIterations
    let maxIterations = get(opt, 'maxIterations')
    if (!isnum(maxIterations)) {
        maxIterations = n * 200
    }
    maxIterations = cdbl(maxIterations)

    //nonZeroDelta
    let nonZeroDelta = get(opt, 'nonZeroDelta')
    if (!isnum(nonZeroDelta)) {
        nonZeroDelta = 1.05
    }
    nonZeroDelta = cdbl(nonZeroDelta)

    //zeroDelta
    let zeroDelta = get(opt, 'zeroDelta')
    if (!isnum(zeroDelta)) {
        zeroDelta = 0.001
    }
    zeroDelta = cdbl(zeroDelta)

    //minErrorDelta
    let minErrorDelta = get(opt, 'minErrorDelta')
    if (!isnum(minErrorDelta)) {
        minErrorDelta = 1e-6
    }
    minErrorDelta = cdbl(minErrorDelta)

    //minTolerance
    let minTolerance = get(opt, 'minTolerance')
    if (!isnum(minTolerance)) {
        minTolerance = 1e-5
    }
    minTolerance = cdbl(minTolerance)

    //rho
    let rho = get(opt, 'rho')
    if (!isnum(rho)) {
        rho = 1
    }
    rho = cdbl(rho)

    //chi
    let chi = get(opt, 'chi')
    if (!isnum(chi)) {
        chi = 2
    }
    chi = cdbl(chi)

    //psi
    let psi = get(opt, 'psi')
    if (!isnum(psi)) {
        psi = -0.5
    }
    psi = cdbl(psi)

    //sigma
    let sigma = get(opt, 'sigma')
    if (!isnum(sigma)) {
        sigma = 0.5
    }
    sigma = cdbl(sigma)

    //simplex
    let simplex = new Array(n + 1)
    simplex[0] = params
    simplex[0].y = fun(params)
    simplex[0].id = 0
    for (let i = 0; i < n; ++i) {
        let point = params.slice()
        point[i] = point[i] ? point[i] * nonZeroDelta : zeroDelta
        simplex[i + 1] = point
        simplex[i + 1].y = fun(point)
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

        if (opt.history) {

            // copy the simplex (since later iterations will mutate) and sort it to have a consistent order between iterations
            let sortedSimplex = simplex.map(function (x) {
                let state = x.slice()
                state.y = x.y
                state.id = x.id
                return state
            })

            //sort
            sortedSimplex.sort(function(a, b) {
                return a.id - b.id
            })

            //push
            opt.history.push({
                x: simplex[0].slice(),
                y: simplex[0].y,
                simplex: sortedSimplex
            })

        }

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
        reflected.y = fun(reflected)

        // if the reflected point is the best seen, then possibly expand
        if (reflected.y < simplex[0].y) {
            weightedSum(expanded, 1 + chi, centroid, -chi, worst)
            expanded.y = fun(expanded)
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
                contracted.y = fun(contracted)
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
                contracted.y = fun(contracted)
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
                    simplex[i].y = fun(simplex[i])
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
        y: simplex[0].y,
        x,
    }
}


export default nelderMead
