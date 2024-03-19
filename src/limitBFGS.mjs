import get from 'lodash-es/get'
import size from 'lodash-es/size'
import isNumber from 'lodash-es/isNumber'
import cloneDeep from 'lodash-es/cloneDeep'
import isnum from 'wsemi/src/isnum.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import goldenSectionLiberate from './goldenSectionLiberate.mjs'


function getApproximateGradientFunction(fun, delta) {

    //func
    async function func() { //要使用arguments不能用箭頭函數
        let r = fun(...arguments)
        if (ispm(r)) {
            r = await r
        }
        return r
    }

    //funcg
    async function funcg(x) {
        let deltaX = delta
        let deltaY
        let xNew = []; let dy = []

        let i; let j; let n = x.length
        for (i = 0; i < n; i++) {
            for (j = 0; j < n; j++) {
                xNew[j] = (i === j) ? (x[j] + deltaX) : x[j]
            }

            deltaY = await func(xNew) - await func(x)

            dy[i] = deltaY / deltaX
        }

        return dy
    }

    return funcg
}


function getIdentityMatrix(size) {
    let i, j
    let matrix = []

    for (i = 0; i < size; i++) {
        matrix[i] = []
        for (j = 0; j < size; j++) {
            matrix[i][j] = 0
        }
        matrix[i][i] = 1
    }

    return matrix
}


/**
 * L-BFGS法
 *
 * Doc: {@link https://www.hankcs.com/ml/l-bfgs.html 理解L-BFGS算法}
 * Fork: {@link https://github.com/yanceyou/bfgs-algorithm/blob/master/lib/BFGSAlgorithm.js BFGSAlgorithm.js}
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/limitBFGS.test.js Github}
 * @memberOf w-optimization
 * @param {Function} fun 輸入適應函數，將傳入變數組params，需回傳適應函數值，以求解最小值為目標
 * @param {Array} params 輸入初始變數組，若適應函數fun需輸入3參數，則就需輸入[a,b,c]陣列作為初始值
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Number} [opt.maxIterations=200] 輸入最大迭代次數整數，預設200
 * @param {Number} [opt.minTolerance=1e-6] 輸入最小收斂門檻值數字，預設1e-6
 * @param {Number} [opt.delta=1e-5] 輸求解近似梯度時步長數字，預設1e-5
 * @returns {Promise} 回傳Promise，resolve為求解後結果物件，含鍵值x,y，x為求解後變數組，y為最優適應函數值，reject為失敗訊息
 * @example
 *
 * async function test() {
 *
 *     async function fun(params) {
 *         let x = params[0] / 180 * Math.PI
 *         return Math.sin(x)
 *     }
 *
 *     console.log(await limitBFGS(fun, [0]))
 *     // => { count: 85, y: -1, x: [ -90.00000038876749 ] }
 *
 *     console.log(await limitBFGS(fun, [87]))
 *     // => { count: 98, y: -1, x: [ -90.00000021058614 ] }
 *
 *     console.log(await limitBFGS(fun, [90]))
 *     // => { count: 2, y: 100000000000000000000, x: null }
 *
 * }
 *
 * test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function limitBFGS(fun, params, opt = {}) {

    //check fun
    if (!isfun(fun)) {
        return Promise.reject('invalid fun')
    }

    //check params
    if (!isearr(params)) {
        return Promise.reject('params is not an effective array')
    }

    //maxIterations
    let maxIterations = get(opt, 'maxIterations')
    if (!isnum(maxIterations)) {
        maxIterations = 200
    }
    maxIterations = cdbl(maxIterations)

    //minTolerance
    let minTolerance = get(opt, 'minTolerance')
    if (!isnum(minTolerance)) {
        minTolerance = 1e-6
    }
    minTolerance = cdbl(minTolerance)

    //delta
    let delta = get(opt, 'delta')
    if (!isnum(delta)) {
        delta = 1e-5
    }
    delta = cdbl(delta)

    //n
    let n = size(params)

    //x
    let x = cloneDeep(params)

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

    //df
    let df = getApproximateGradientFunction(func, delta)
    // console.log('df', df)

    // the gradient of the function evaluated at x[k]: g[k]  (x[0] = x0)
    let g = await df(x)
    // console.log('g', g)

    // the inverse of approximate Hessian matrix: B[k]  (B[0] = I)
    let B = getIdentityMatrix(n)

    // direction: p[k]
    let p = []

    let err = ''
    let stepsize = 0
    let isConverges = false
    let iterator = -1
    let besty = 1e20
    let bestx = null

    async function step() {
        let dimension = n
        let i
        let j

        //convergence, 代表梯度向量norm值
        let convergence = 0
        for (i = 0; i < dimension; i++) {
            convergence += g[i] * g[i]
        }
        convergence = Math.sqrt(convergence)
        // console.log('convergence', convergence)

        //check
        if (!isNumber(convergence)) {
            return Promise.reject('the norm of the gradient was unconverged')
        }

        //check
        if (convergence < minTolerance) {
            isConverges = true
            return Promise.resolve()
        }

        //iterator
        iterator++

        //p, 更新梯度 P[k] = - B[k] * ▽f(x[k])
        for (i = 0; i < dimension; i++) {
            p[i] = 0
            for (j = 0; j < dimension; j++) {
                p[i] += -B[i][j] * g[j]
            }
        }

        //fNext, 黃金搜尋法求解方向內之局部最佳解
        async function fNext(lamda) {
            let xNext = []
            for (i = 0; i < dimension; i++) {
                xNext[i] = x[i] + lamda * p[i]
            }
            let y = await func(xNext)
            if (besty > y) {
                besty = y
                bestx = xNext
                // console.log('bestx', bestx, 'besty', besty)
            }
            return y
        }

        //stepsize, 使用黃金搜尋法求解得本次搜尋步長
        let gsl = await goldenSectionLiberate(fNext, 0)
        // console.log('gsl', gsl)

        //stepsize
        stepsize = get(gsl, 'x')
        // console.log('stepsize', stepsize)

        //check
        if (!isNumber(stepsize)) {
            return Promise.reject('can not find approximate stepsize')
        }

        //update x, 更新至下個求解值
        let s = []
        for (i = 0; i < dimension; i++) {
            s[i] = stepsize * p[i] //s = stepsize * p
            x[i] += s[i]
        }

        //update g, 更新梯度向量, ▽f(x[k + 1]) -> y[k] = g[k + 1] - g[k] -> y = df(x[k + 1]) - df(x[k])
        let _g = await df(x)
        // console.log('_g', _g)
        let y = []
        for (i = 0; i < dimension; i++) {
            y[i] = _g[i] - g[i]
        }
        g = _g

        // 5. approximate hessian matrix
        // (T) => transposition

        //_scalarA = s(T) * y
        let _scalarA = 0
        for (i = 0; i < dimension; i++) {
            _scalarA += s[i] * y[i]
        }

        //_vectorB = B * y
        let _vectorB = []
        for (i = 0; i < dimension; i++) {
            _vectorB[i] = 0
            for (j = 0; j < dimension; j++) {
                _vectorB[i] += B[i][j] * y[j]
            }
        }

        //_scalarC = (s(T) * y + y(T) * B * y) / (s(T) * y)2 = (_scalarA + y(T) * _vectorB) / (_scalarA * _scalarA)
        let _scalarC = 0
        for (i = 0; i < dimension; i++) {
            _scalarC += y[i] * _vectorB[i]
        }
        _scalarC = (_scalarA + _scalarC) / (_scalarA * _scalarA)

        //update B, 更新梯度資訊
        for (i = 0; i < dimension; i++) {
            for (j = 0; j < dimension; j++) {
                B[i][j] += _scalarC * s[i] * s[j] - (_vectorB[i] * s[j] + s[i] * _vectorB[j]) / _scalarA
            }
        }

    }

    while (true) {
        if (isConverges) {
            break
        }
        if (iterator > maxIterations) {
            return Promise.reject(`iterator > maxIterations[${maxIterations}]`)
        }
        if (err !== '') {
            return Promise.reject(err)
        }
        await step()
    }

    return {
        count: countCalc,
        y: besty,
        x: bestx,
    }
}


export default limitBFGS
