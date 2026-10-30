import assert from 'assert'
import goldenSection from '../src/goldenSection.mjs'
import goldenSectionLiberate from '../src/goldenSectionLiberate.mjs'
import setpBracket from '../src/setpBracket.mjs'
import binarySearch from '../src/binarySearch.mjs'
import { runParamSpec, SECRET } from './tools/paramMatrix.mjs'


//輸入參數檢測(dspec 輸入參數之檢測機制, rulebook R-PARAM): 一維搜尋類
//  端點、初始值: N2 有效數字(數字字串轉換後只用轉換值, K4)
//  opt: 容差為 N2 正數, 次數為 N2 正整數; 給了而無效即報錯, 不改用預設(K3)
//  失敗通道: goldenSection / goldenSectionLiberate / setpBracket 回傳Promise, reject字串; binarySearch 同步, throw Error

let f = (x) => (x - 3) * (x - 3)


describe('goldenSection K4', function() {

    //spec(dspec K4): goldenSection(f,'1','5') 之解須與 goldenSection(f,1,5) 相同, 正解 x=3
    it('goldenSection(f, \'1\', \'5\') should equal goldenSection(f, 1, 5) and find x=3', async function() {
        let rn = await goldenSection(f, 1, 5)
        let rs = await goldenSection(f, '1', '5')
        assert.deepStrictEqual(rs, rn)
        assert.strictEqual(typeof rs.x, 'number')
        assert.ok(Math.abs(rs.x - 3) < 1e-6)
    })

    //spec(dspec N2): 區間端點 Infinity 為無效, 須報錯而非回 { x:null, y:null }
    it('goldenSection(f, 0, Infinity) should reject, not resolve { x: null, y: null }', async function() {
        let res
        let err
        try {
            res = await goldenSection(f, 0, Infinity)
        }
        catch (e) {
            err = e
        }
        assert.strictEqual(res, undefined)
        assert.strictEqual(err, 'invalid xU: must be a valid number')
    })

})


runParamSpec({
    name: 'goldenSection',
    fn: goldenSection,
    mode: 'async',
    args: (ctx) => [ctx.fun, 1, 5],
    gen: [
        { i: 0, name: 'fun', kind: 'fun' },
        { i: 1, name: 'xL', kind: 'num' },
        { i: 2, name: 'xU', kind: 'num' },
    ],
    opts: [
        { key: 'minTolerance', kind: 'pnum', val: 1e-6, effect: 1e-2 },
        { key: 'maxIterations', kind: 'pint', val: 80, effect: 40 },
    ],
})


runParamSpec({
    name: 'goldenSectionLiberate',
    fn: goldenSectionLiberate,
    mode: 'async',
    args: (ctx) => [ctx.fun, 2],
    gen: [
        { i: 0, name: 'fun', kind: 'fun' },
        { i: 1, name: 'x', kind: 'num' },
    ],
    opts: [
        { key: 'min', kind: 'num', val: -20, effect: 2.5 },
        { key: 'max', kind: 'num', val: 20, effect: 2.5 },
        { key: 'delta', kind: 'pnum', val: 0.2 },
        { key: 'dxR', kind: 'numor', val: 3, list: ['speed'] },
        { key: 'minTolerance', kind: 'pnum', val: 1e-6, effect: 1e-2 },
        { key: 'maxIterations', kind: 'pint', val: 80 },
    ],
})


runParamSpec({
    name: 'setpBracket',
    fn: setpBracket,
    mode: 'async',
    args: (ctx) => [ctx.fun, 0],
    gen: [
        { i: 0, name: 'fun', kind: 'fun' },
        { i: 1, name: 'x', kind: 'num' },
    ],
    opts: [
        { key: 'delta', kind: 'pnum', val: 0.2 },
        { key: 'dxR', kind: 'numor', val: 3, list: ['speed'] },
        { key: 'min', kind: 'num', val: -50 },
        { key: 'max', kind: 'num', val: 50 },
    ],
})


runParamSpec({
    name: 'binarySearch',
    fn: binarySearch,
    mode: 'sync',
    args: (ctx) => [ctx.fun, 0, 10],
    gen: [
        { i: 0, name: 'fun', kind: 'fun' },
        { i: 1, name: 'xMin', kind: 'num' },
        { i: 2, name: 'xMax', kind: 'num' },
    ],
    opts: [
        { key: 'delta', kind: 'pnum', val: 0.5 },
        { key: 'maxIterations', kind: 'pint', val: 50, effect: 2 },
    ],
})


describe('goldenSectionLiberate / setpBracket pass-through keys are checked before the first fun call', function() {

    //spec(dspec V17 無殘留): 轉傳給 setpBracket 與 goldenSection 之鍵須於任何適應函數呼叫前檢測
    it('goldenSectionLiberate rejects invalid minTolerance without calling fun', async function() {
        let calls = 0
        let fun = (x) => {
            calls++
            return f(x)
        }
        let err
        try {
            await goldenSectionLiberate(fun, 2, { minTolerance: 'NP' })
        }
        catch (e) {
            err = e
        }
        assert.strictEqual(err, 'invalid opt.minTolerance: must be a positive number')
        assert.strictEqual(calls, 0)
    })

    //spec(K3、K4): opt.min 與 opt.max 皆給時直接作為求解範圍(不經 setpBracket), 數字字串轉換後使用
    it('goldenSectionLiberate with both opt.min and opt.max uses them as the range directly', async function() {
        let rd = await goldenSection(f, -20, 20)
        let r = await goldenSectionLiberate(f, 2, { min: -20, max: 20 })
        assert.deepStrictEqual(r, rd)
        let rs = await goldenSectionLiberate(f, '2', { min: '-20', max: ' 20 ' })
        assert.deepStrictEqual(rs, rd)
        assert.notDeepStrictEqual(await goldenSectionLiberate(f, 2), rd)
    })

    //spec(K3): setpBracket 之 dxR 須實際生效(原碼 isnum(dxR) && dxR==='speed' 恆為假, 給了亦被忽略)
    it('setpBracket opt.dxR takes effect: different dxR gives a different result', async function() {
        let r2 = await setpBracket(f, 0, { dxR: 2 })
        let r3 = await setpBracket(f, 0, { dxR: 3 })
        let rs = await setpBracket(f, 0, { dxR: 'speed' })
        assert.notDeepStrictEqual(r3, r2)
        assert.notDeepStrictEqual(rs, r2)
    })

    //spec(dspec K9, V20): 訊息不回顯輸入值
    it('failure message does not echo the input', async function() {
        let err
        try {
            await goldenSection(f, SECRET, 5)
        }
        catch (e) {
            err = e
        }
        assert.strictEqual(err, 'invalid xL: must be a valid number')
    })

})
