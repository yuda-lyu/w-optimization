/* eslint-disable no-new-wrappers */
import assert from 'assert'


//paramMatrix, 輸入參數檢測之表驅動測試輔助(對應 C:\opensrcOper\dspec\輸入參數之檢測機制.md §8 測試矩陣)
//
//spec 欄位:
//  name      函數名
//  fn        被測函數
//  mode      'async'(回傳Promise者: reject字串, 不同步throw) 或 'sync'(同步者: throw Error)
//  args      (ctx) => 一般參數陣列(不含opt); ctx.fun 為會計數之適應函數, ctx.calls 為呼叫次數
//  opt       基準opt物件(縮小規模用), 無則不給
//  pick      (result) => 供比對之投影(隨機演算法須排除隨機欄位), 預設原樣
//  gen       一般參數: { i, name, kind: 'fun'|'num'|'arrN2' }
//  opts      opt鍵: { key, kind: 'num'|'pnum'|'pint'|'bol'|'fun'|'enum'|'numor', val(有效且異於預設之樣本), list(enum列舉) }
//
//種類描述(此處獨立重述, 不引用 src)
export const SECRET = 'ZZ-secret-9317'

const DESC = {
    num: 'a valid number',
    pnum: 'a positive number',
    pint: 'a positive integer',
    bol: 'a boolean',
    fun: 'a function',
}

function descOf(o) {
    if (o.kind === 'enum') {
        return `one of ${o.list.map((v) => `'${v}'`).join(', ')}`
    }
    if (o.kind === 'numor') {
        return `a positive number or one of ${o.list.map((v) => `'${v}'`).join(', ')}`
    }
    return DESC[o.kind]
}


//數字類無效輸入矩陣(dspec §8): '-'、'NP'、''、null、true、NaN、Infinity、'0x10' 及其餘
export function invalidNums({ withNull = true, withUndefined = false } = {}) {
    let r = [
        ['\'-\'', '-'],
        ['\'NP\'', 'NP'],
        ['empty string', ''],
        ['blank string', ' '],
        ['true', true],
        ['false', false],
        ['NaN', NaN],
        ['Infinity', Infinity],
        ['-Infinity', -Infinity],
        ['\'Infinity\'', 'Infinity'],
        ['\'NaN\'', 'NaN'],
        ['\'0x10\'', '0x10'],
        ['\'0b11\'', '0b11'],
        ['\'1,234\'', '1,234'],
        ['\'1e999\' (overflow)', '1e999'],
        ['fullwidth digits', '１２３'],
        ['secret string', SECRET],
        ['BigInt', 5n],
        ['wrapped Number', new Number(5)],
        ['wrapped String', new String('5')],
        ['object', {}],
        ['array', [5]],
        ['function', () => 5],
    ]
    if (withNull) {
        r.unshift(['null', null])
    }
    if (withUndefined) {
        r.unshift(['undefined', undefined])
    }
    return r
}


//數字之有效變體(數字字串、頭尾空白、正號、整數之科學記號)
export function numVariants(n) {
    let s = String(n)
    let r = [
        ['numeric string', s],
        ['padded numeric string', ` ${s} `],
    ]
    if (n >= 0) {
        r.push(['signed numeric string', `+${s}`])
    }
    if (Number.isInteger(n) && s.indexOf('e') < 0) {
        r.push(['exponent numeric string', `${s}e0`])
    }
    return r
}


//呼叫並擷取失敗(含是否同步throw)
async function callAsync(fn) {
    let p
    try {
        p = fn()
    }
    catch (e) {
        return { threw: true, sync: true, e }
    }
    try {
        let v = await p
        return { threw: false, v }
    }
    catch (e) {
        return { threw: true, sync: false, e }
    }
}
function callSync(fn) {
    try {
        let v = fn()
        return { threw: false, v }
    }
    catch (e) {
        return { threw: true, e }
    }
}


//斷言: 以指定通道失敗, 訊息全文相同, 訊息不含輸入值
export function assertFail(r, mode, msg, label) {
    assert.strictEqual(r.threw, true, `${label}: should fail`)
    if (mode === 'async') {
        assert.strictEqual(r.sync, false, `${label}: async function must reject, not throw synchronously`)
        assert.strictEqual(typeof r.e, 'string', `${label}: should reject a string`)
        assert.strictEqual(r.e, msg, `${label}: message`)
        assert.strictEqual(r.e.indexOf(SECRET), -1, `${label}: message must not echo the input`)
    }
    else {
        assert.strictEqual(r.e instanceof Error, true, `${label}: should throw an Error`)
        assert.strictEqual(r.e.message, msg, `${label}: message`)
        assert.strictEqual(r.e.message.indexOf(SECRET), -1, `${label}: message must not echo the input`)
    }
}


//建立執行情境
export function makeRunner(spec) {

    let mode = spec.mode
    //投影只對同一結果計算一次(adapter 之投影會操作其狀態, 重複計算會累加)
    let pickRaw = spec.pick || ((r) => r)
    let cache = new WeakMap()
    let pick = (v) => {
        if (v === null || (typeof v !== 'object' && typeof v !== 'function')) {
            return pickRaw(v)
        }
        if (!cache.has(v)) {
            cache.set(v, pickRaw(v))
        }
        return cache.get(v)
    }

    function newCtx() {
        let ctx = { calls: 0 }
        let f = spec.f || ((x) => (x - 3) * (x - 3))
        ctx.fun = function() {
            ctx.calls++
            return f(...arguments)
        }
        return ctx
    }

    //opt: undefined表不給, DEL表示自基準opt移除該鍵
    const DEL = Symbol('del')

    async function run(ctx, options = {}) {
        let argAt = options.argAt || {}
        let optAt = options.optAt || {}
        let args = spec.args(ctx)
        for (let k of Object.keys(argAt)) {
            args[k] = argAt[k]
        }
        let o
        if ('opt' in options) {
            o = options.opt //明確指定opt(含undefined表不給)
        }
        else if (spec.opt !== undefined || Object.keys(optAt).length > 0) {
            o = { ...(spec.opt || {}) }
            for (let k of Object.keys(optAt)) {
                if (optAt[k] === DEL) {
                    delete o[k]
                }
                else {
                    o[k] = optAt[k]
                }
            }
        }
        let call = () => (o === undefined ? spec.fn(...args) : spec.fn(...args, o))
        if (mode === 'async') {
            return await callAsync(call)
        }
        return callSync(call)
    }

    function assertOk(r, label) {
        if (r.threw) {
            let e = r.e instanceof Error ? r.e.message : r.e
            assert.fail(`${label}: should succeed but failed with: ${e}`)
        }
    }

    return { newCtx, run, assertOk, DEL, pick, mode }
}


//表驅動之參數檢測測試
export function runParamSpec(spec) {

    let R = makeRunner(spec)
    let { newCtx, run, assertOk, DEL, pick, mode } = R

    describe(`${spec.name} params`, function() {

        //基準必須成功(否則後續比對無意義)
        it('base call should succeed', async function() {
            let ctx = newCtx()
            let r = await run(ctx)
            assertOk(r, 'base')
        })

        //opt本身: 非一般物件為無效; undefined、null、{}、未宣告之鍵皆視同未給(取預設)
        it('opt itself: non-plain-object is invalid; undefined/null/{}/unknown key is treated as not given', async function() {
            let bads = [['string', 'abc'], ['number', 5], ['true', true], ['array', []], ['Map', new Map()], ['function', () => {}], ['class instance', new (class A {})()], ['secret string', SECRET]]
            for (let [label, v] of bads) {
                let ctx = newCtx()
                let r = await run(ctx, { opt: v })
                assertFail(r, mode, 'invalid opt: must be a plain object', `opt=${label}`)
                assert.strictEqual(ctx.calls, 0, `opt=${label}: fun must not be called`)
            }
            let ctx0 = newCtx()
            let r0 = await run(ctx0, { opt: undefined })
            assertOk(r0, 'opt=undefined')
            for (let [label, v] of [['null', null], ['{}', {}], ['unknown key', { zzzUnknown: 1 }], ['null-prototype object', Object.assign(Object.create(null), {})]]) {
                let ctx = newCtx()
                let r = await run(ctx, { opt: v })
                assertOk(r, `opt=${label}`)
                assert.deepStrictEqual(pick(r.v), pick(r0.v), `opt=${label}: should equal the result of not giving opt`)
            }
        })

        //一般參數
        for (let g of (spec.gen || [])) {

            if (g.kind === 'fun') {
                it(`general param ${g.name}: non-function is invalid`, async function() {
                    for (let [label, v] of [['undefined', undefined], ['null', null], ['number', 5], ['string', 'abc'], ['secret string', SECRET], ['object', {}], ['array', []], ['true', true], ['wrapped Boolean', new Boolean(true)]]) {
                        let ctx = newCtx()
                        let r = await run(ctx, { argAt: { [g.i]: v } })
                        assertFail(r, mode, `invalid ${g.name}: must be a function`, `${g.name}=${label}`)
                    }
                })
            }

            if (g.kind === 'num') {
                it(`general param ${g.name}: number string equals number (K4); non-numbers are invalid`, async function() {
                    let ctx = newCtx()
                    let base = spec.args(ctx)[g.i]
                    let rb = await run(newCtx())
                    assertOk(rb, 'base')
                    for (let [label, v] of numVariants(base)) {
                        let r = await run(newCtx(), { argAt: { [g.i]: v } })
                        assertOk(r, `${g.name}=${label}`)
                        assert.deepStrictEqual(pick(r.v), pick(rb.v), `${g.name}=${label}: result should equal the numeric one`)
                    }
                    for (let [label, v] of invalidNums({ withNull: true, withUndefined: true })) {
                        let c2 = newCtx()
                        let r = await run(c2, { argAt: { [g.i]: v } })
                        assertFail(r, mode, `invalid ${g.name}: must be a valid number`, `${g.name}=${label}`)
                        assert.strictEqual(c2.calls, 0, `${g.name}=${label}: fun must not be called`)
                    }
                })
            }

            if (g.kind === 'arrN2') {
                it(`general param ${g.name}: non-empty array of valid numbers; elements checked with index`, async function() {
                    let rb = await run(newCtx())
                    assertOk(rb, 'base')
                    let base = spec.args(newCtx())[g.i]

                    //陣列本身
                    for (let [label, v] of [['undefined', undefined], ['null', null], ['number', 5], ['string', 'abc'], ['secret string', SECRET], ['object', {}], ['array-like', { 0: 1, length: 1 }], ['empty array', []], ['Set', new Set([1])]]) {
                        let c2 = newCtx()
                        let r = await run(c2, { argAt: { [g.i]: v } })
                        assertFail(r, mode, `invalid ${g.name}: must be a non-empty array`, `${g.name}=${label}`)
                        assert.strictEqual(c2.calls, 0, `${g.name}=${label}: fun must not be called`)
                    }

                    //各元素
                    for (let k = 0; k < base.length; k++) {
                        for (let [label, v] of numVariants(base[k])) {
                            let arr = base.slice()
                            arr[k] = v
                            let r = await run(newCtx(), { argAt: { [g.i]: arr } })
                            assertOk(r, `${g.name}[${k}]=${label}`)
                            assert.deepStrictEqual(pick(r.v), pick(rb.v), `${g.name}[${k}]=${label}: result should equal the numeric one`)
                        }
                        for (let [label, v] of invalidNums({ withNull: true, withUndefined: true })) {
                            let arr = base.slice()
                            arr[k] = v
                            let c2 = newCtx()
                            let r = await run(c2, { argAt: { [g.i]: arr } })
                            assertFail(r, mode, `invalid ${g.name}[${k}]: must be a valid number`, `${g.name}[${k}]=${label}`)
                            assert.strictEqual(c2.calls, 0, `${g.name}[${k}]=${label}: fun must not be called`)
                        }
                    }

                    //不改寫呼叫端之陣列
                    let arr = base.map((v) => String(v))
                    let snap = JSON.stringify(arr)
                    let r = await run(newCtx(), { argAt: { [g.i]: arr } })
                    assertOk(r, 'no-mutation')
                    assert.strictEqual(JSON.stringify(arr), snap, `${g.name}: caller array must not be changed`)
                    assert.deepStrictEqual(Object.keys(arr), base.map((v, i) => String(i)), `${g.name}: caller array must get no extra properties`)
                })
            }
        }

        //opt鍵
        for (let o of (spec.opts || [])) {

            it(`opt.${o.key} (${o.kind}): null/undefined takes the default`, async function() {
                let rd = await run(newCtx(), { optAt: { [o.key]: DEL } })
                assertOk(rd, 'default')
                for (let [label, v] of [['null', null], ['undefined', undefined]]) {
                    let r = await run(newCtx(), { optAt: { [o.key]: v } })
                    assertOk(r, `${o.key}=${label}`)
                    assert.deepStrictEqual(pick(r.v), pick(rd.v), `${o.key}=${label}: should equal the default`)
                }
            })

            if (o.kind === 'num' || o.kind === 'pnum' || o.kind === 'pint') {
                it(`opt.${o.key} (${o.kind}): number string equals number (K4); invalid is rejected, not replaced by the default (K3)`, async function() {
                    let rb = await run(newCtx(), { optAt: { [o.key]: o.val } })
                    assertOk(rb, `${o.key}=number`)
                    for (let [label, v] of numVariants(o.val)) {
                        let r = await run(newCtx(), { optAt: { [o.key]: v } })
                        assertOk(r, `${o.key}=${label}`)
                        assert.deepStrictEqual(pick(r.v), pick(rb.v), `${o.key}=${label}: result should equal the numeric one`)
                    }
                    let bads = invalidNums({ withNull: false }).slice()
                    if (o.kind === 'pnum' || o.kind === 'pint') {
                        bads.push(['0', 0], ['-1', -1], ['\'0\'', '0'], ['\'-1\'', '-1'], ['-0', -0])
                    }
                    if (o.kind === 'pint') {
                        bads.push(['1.5', 1.5], ['\'1.5\'', '1.5'], ['2^53', 2 ** 53], ['\'9007199254740993\'', '9007199254740993'])
                    }
                    for (let [label, v] of bads) {
                        let c2 = newCtx()
                        let r = await run(c2, { optAt: { [o.key]: v } })
                        assertFail(r, mode, `invalid opt.${o.key}: must be ${descOf(o)}`, `${o.key}=${label}`)
                        assert.strictEqual(c2.calls, 0, `${o.key}=${label}: fun must not be called`)
                    }
                })
            }

            //給了即生效(不被忽略): 指定值之結果須異於預設, 且數字字串變體與之相同
            if (o.effect !== undefined) {
                it(`opt.${o.key}: the given value takes effect (is not ignored); numeric string gives the same`, async function() {
                    let rd = await run(newCtx(), { optAt: { [o.key]: DEL } })
                    assertOk(rd, 'default')
                    let re = await run(newCtx(), { optAt: { [o.key]: o.effect } })
                    assertOk(re, `${o.key}=effect value`)
                    assert.notDeepStrictEqual(pick(re.v), pick(rd.v), `${o.key}=${JSON.stringify(o.effect)}: result should differ from the default one`)
                    for (let [label, v] of numVariants(o.effect)) {
                        let r = await run(newCtx(), { optAt: { [o.key]: v } })
                        assertOk(r, `${o.key}=${label}`)
                        assert.deepStrictEqual(pick(r.v), pick(re.v), `${o.key}=${label}: result should equal the numeric one`)
                    }
                })
            }

            if (o.kind === 'bol') {
                it(`opt.${o.key} (bol): only true/false; 'y'/'n'/'true'/'false'/1/0 are invalid, not replaced by the default (K3, K5)`, async function() {
                    for (let v of [true, false]) {
                        let r = await run(newCtx(), { optAt: { [o.key]: v } })
                        assertOk(r, `${o.key}=${v}`)
                    }
                    for (let [label, v] of [['\'y\'', 'y'], ['\'n\'', 'n'], ['\'true\'', 'true'], ['\'false\'', 'false'], ['\'TRUE\'', 'TRUE'], ['1', 1], ['0', 0], ['\'1\'', '1'], ['\'0\'', '0'], ['empty string', ''], ['secret string', SECRET], ['NaN', NaN], ['object', {}], ['array', []], ['wrapped Boolean', new Boolean(true)]]) {
                        let c2 = newCtx()
                        let r = await run(c2, { optAt: { [o.key]: v } })
                        assertFail(r, mode, `invalid opt.${o.key}: must be a boolean`, `${o.key}=${label}`)
                        assert.strictEqual(c2.calls, 0, `${o.key}=${label}: fun must not be called`)
                    }
                })
            }

            if (o.kind === 'fun') {
                it(`opt.${o.key} (fun): non-function is invalid`, async function() {
                    for (let [label, v] of [['number', 5], ['string', 'abc'], ['secret string', SECRET], ['true', true], ['object', {}], ['array', []], ['wrapped Boolean', new Boolean(true)]]) {
                        let c2 = newCtx()
                        let r = await run(c2, { optAt: { [o.key]: v } })
                        assertFail(r, mode, `invalid opt.${o.key}: must be a function`, `${o.key}=${label}`)
                        assert.strictEqual(c2.calls, 0, `${o.key}=${label}: fun must not be called`)
                    }
                })
            }

            if (o.kind === 'enum' || o.kind === 'numor') {
                it(`opt.${o.key} (${o.kind}): listed values are accepted; others are invalid, not replaced by the default (K3)`, async function() {
                    for (let v of o.list) {
                        let r = await run(newCtx(), { optAt: { [o.key]: v } })
                        assertOk(r, `${o.key}=${v}`)
                    }
                    let bads = [['empty string', ''], ['blank string', ' '], ['unlisted string', 'zzzUnlisted'], ['secret string', SECRET], ['true', true], ['NaN', NaN], ['object', {}], ['array of listed', [o.list[0]]], ['wrapped String', new String(o.list[0])], ['other case', String(o.list[0]).toLowerCase() === String(o.list[0]) ? String(o.list[0]).toUpperCase() : String(o.list[0]).toLowerCase()], ['padded', ` ${o.list[0]} `]]
                    if (o.kind === 'enum') {
                        bads.push(['number', 1])
                    }
                    if (o.kind === 'numor') {
                        bads.push(['0', 0], ['-1', -1], ['\'0\'', '0'], ['\'-1\'', '-1'], ['\'-\'', '-'], ['\'NP\'', 'NP'], ['\'0x10\'', '0x10'], ['Infinity', Infinity], ['BigInt', 5n], ['false', false])
                    }
                    for (let [label, v] of bads) {
                        let c2 = newCtx()
                        let r = await run(c2, { optAt: { [o.key]: v } })
                        assertFail(r, mode, `invalid opt.${o.key}: must be ${descOf(o)}`, `${o.key}=${label}`)
                        assert.strictEqual(c2.calls, 0, `${o.key}=${label}: fun must not be called`)
                    }
                })
            }

            if (o.kind === 'numor') {
                it(`opt.${o.key} (numor): positive number or numeric string equals number (K4)`, async function() {
                    let rb = await run(newCtx(), { optAt: { [o.key]: o.val } })
                    assertOk(rb, `${o.key}=number`)
                    for (let [label, v] of numVariants(o.val)) {
                        let r = await run(newCtx(), { optAt: { [o.key]: v } })
                        assertOk(r, `${o.key}=${label}`)
                        assert.deepStrictEqual(pick(r.v), pick(rb.v), `${o.key}=${label}: result should equal the numeric one`)
                    }
                })
            }
        }
    })
}
