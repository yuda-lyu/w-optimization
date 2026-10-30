import assert from 'assert'
import nelderMead from '../src/nelderMead.mjs'
import cobyla from '../src/cobyla.mjs'
import limitBFGS from '../src/limitBFGS.mjs'
import { runParamSpec, SECRET } from './tools/paramMatrix.mjs'


//輸入參數檢測(dspec 輸入參數之檢測機制, rulebook R-PARAM): 多維求解類
//  params: 資料陣列, 元素為 N2 有效數字(數字字串轉換後只用轉換值, K4; '-'、'NP'、''、null、布林、NaN、Infinity 皆無效並帶索引)
//  opt: 容差與步長為 N2 正數, 次數為 N2 正整數, 其餘係數為 N2 有效數字; 給了而無效即報錯, 不改用預設(K3)
//  失敗通道: 回傳Promise, reject字串

let f = (p) => (p[0] - 3) * (p[0] - 3) + (p[1] + 1) * (p[1] + 1)

//limitBFGS 以前向差分求梯度, 對二次函數之梯度誤差(約 delta)大於預設收斂門檻而不收斂, 故改用既有範例之 sin 函數, 由 [87] 起算收斂於 x=-90
let fSin = (p) => Math.sin(p[0] / 180 * Math.PI)


for (let [name, fn, opts, fun, base] of [
    ['nelderMead', nelderMead, [
        { key: 'maxIterations', kind: 'pint', val: 300 },
        { key: 'nonZeroDelta', kind: 'num', val: 1.1 },
        { key: 'delta', kind: 'pnum', val: 0.01 },
        { key: 'minErrorDelta', kind: 'pnum', val: 1e-5 },
        { key: 'minTolerance', kind: 'pnum', val: 1e-4 },
        { key: 'rho', kind: 'num', val: 1.2 },
        { key: 'chi', kind: 'num', val: 2.2 },
        { key: 'psi', kind: 'num', val: -0.4 },
        { key: 'sigma', kind: 'num', val: 0.6 },
    ], f, [1, 2]],
    ['cobyla', cobyla, [
        { key: 'maxIterations', kind: 'pint', val: 600 },
        { key: 'rhobeg', kind: 'pnum', val: 5 },
        { key: 'rhoend', kind: 'pnum', val: 1e-4 },
    ], f, [1, 2]],
    ['limitBFGS', limitBFGS, [
        { key: 'maxIterations', kind: 'pint', val: 150 },
        { key: 'minTolerance', kind: 'pnum', val: 1e-5 },
        { key: 'delta', kind: 'pnum', val: 1e-4 },
    ], fSin, [87]],
]) {

    runParamSpec({
        name,
        fn,
        mode: 'async',
        f: fun,
        args: (ctx) => [ctx.fun, base.slice()],
        gen: [
            { i: 0, name: 'fun', kind: 'fun' },
            { i: 1, name: 'params', kind: 'arrN2' },
        ],
        opts,
    })


    describe(`${name} K4 and no-echo`, function() {

        //spec(dspec K4): 數字字串之初始參數, 解須與數值相同
        it('params of numeric strings give the same result as numbers', async function() {
            let rn = await fn(fun, base.slice())
            let rs = await fn(fun, base.map((v, i) => (i % 2 === 0 ? String(v) : ` ${v} `)))
            assert.deepStrictEqual(rs, rn)
            assert.ok(rs.x.every((v) => typeof v === 'number'))
        })

        //spec(dspec N2): params 含 'NP' 須報錯, 不可跑滿迭代回 { x:['NP'], y:null }
        it('params containing \'NP\' rejects instead of running to the iteration limit', async function() {
            let res
            let err
            try {
                res = await fn(fun, ['NP'].concat(base.slice(1)))
            }
            catch (e) {
                err = e
            }
            assert.strictEqual(res, undefined)
            assert.strictEqual(err, 'invalid params[0]: must be a valid number')
        })

        it('failure message does not echo the input', async function() {
            let err
            try {
                await fn(fun, [SECRET])
            }
            catch (e) {
                err = e
            }
            assert.strictEqual(err, 'invalid params[0]: must be a valid number')
        })

    })

}


describe('nelderMead opt values take effect (K3: given means used)', function() {

    //spec(dspec K3、K4): 給了之值即生效(以 Rosenbrock 函數觀察), 數字字串之結果與數值相同
    let ros = (p) => (1 - p[0]) ** 2 + 100 * (p[1] - p[0] ** 2) ** 2
    //高原中之窄谷, 使收縮失敗而觸發 sigma 之縮減步驟
    let needle = (p) => (Math.abs(p[0]) < 1e-3 ? 0 : 1) + Math.abs(p[1])

    let cases = [
        [ros, [-1.2, 1], 'rho', 1.5],
        [ros, [-1.2, 1], 'chi', 3],
        [ros, [-1.2, 1], 'psi', -0.3],
        [ros, [-1.2, 1], 'nonZeroDelta', 1.5],
        [ros, [-1.2, 1], 'minTolerance', 0.1],
        [ros, [-1.2, 1], 'maxIterations', 10],
        [needle, [3, 4], 'sigma', 0.1],
    ]
    for (let [f, params, key, v] of cases) {
        it(`opt.${key}=${v} changes the result and the numeric string gives the same`, async function() {
            let rd = await nelderMead(f, params.slice())
            let rv = await nelderMead(f, params.slice(), { [key]: v })
            assert.notDeepStrictEqual(rv, rd)
            let rs = await nelderMead(f, params.slice(), { [key]: ` ${v} ` })
            assert.deepStrictEqual(rs, rv)
        })
    }

})
