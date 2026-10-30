/* eslint-disable no-new-wrappers */
import assert from 'assert'
import { toNum, isPlainObj, kNum, kPnum, kPint, kBol, kFun, kObj, kStr, kEnum, kNumOr, kNumArr, kNumArrN1, kFit, kCustom, chkValue, parseOpt, chkParams } from '../src/_checkParam.mjs'
import { invalidNums, SECRET } from './tools/paramMatrix.mjs'


//共用檢測輔助(src/_checkParam.mjs)之種類判定與轉換; wsemi 共用檢測函數發布後改用之
//規格: C:\opensrcOper\dspec\輸入參數之檢測機制.md §3.1(數字字串格式)、§3.2(N1/N2/範圍子型)、§3.3(B1)、§3.4(S1/S3)、§4(opt)、§6(訊息)


describe('_checkParam toNum (dspec §3.1 數字字串之格式)', function() {

    it('valid: finite numbers and decimal numeric strings (trimmed, signed, decimal point, exponent)', function() {
        let cases = [
            [0, 0], [5, 5], [-5, -5], [1.25, 1.25], [1e-8, 1e-8],
            ['123.45', 123.45], [' 12 ', 12], ['-0.5', -0.5], ['.5', 0.5], ['5.', 5], ['+5', 5], ['1.2e-5', 1.2e-5], ['1E3', 1000], ['  1e+3 ', 1000], ['007', 7], ['\t5\n', 5],
        ]
        for (let [v, e] of cases) {
            assert.strictEqual(toNum(v), e, `toNum(${JSON.stringify(v)})`)
        }
    })

    it('invalid: the dspec §8 number matrix', function() {
        for (let [label, v] of invalidNums({ withNull: true, withUndefined: true })) {
            assert.strictEqual(toNum(v), null, `toNum(${label})`)
        }
    })

    //dspec §3.1: 十六進位、二進位、八進位、千分位、全形、'Infinity'、'NaN'、''、純空白為非數字
    it('invalid strings of §3.1: hex, binary, octal, thousands separator, fullwidth, Infinity, NaN, empty, blank, bare sign and bare exponent', function() {
        for (let v of ['0x10', '0b11', '0o7', '1,234', '１２３', 'Infinity', '-Infinity', 'NaN', '', ' ', '+', '-', '.', 'e5', '1e', '1e+', '1 2', '1_000', '--5', '5-', '1e999', '-1e999']) {
            assert.strictEqual(toNum(v), null, `toNum(${JSON.stringify(v)})`)
        }
    })

})


describe('_checkParam chkValue', function() {

    it('num (N2): converts and returns the converted value; message has no value', function() {
        assert.deepStrictEqual(chkValue('5', 'x', kNum), { ok: true, v: 5, msg: '' })
        assert.deepStrictEqual(chkValue(' 5 ', 'x', kNum), { ok: true, v: 5, msg: '' })
        assert.deepStrictEqual(chkValue(0, 'x', kNum), { ok: true, v: 0, msg: '' })
        assert.deepStrictEqual(chkValue(-0.5, 'x', kNum), { ok: true, v: -0.5, msg: '' })
        let r = chkValue(SECRET, 'xL', kNum)
        assert.deepStrictEqual(r, { ok: false, v: undefined, msg: 'invalid xL: must be a valid number' })
    })

    it('pnum: positive number', function() {
        for (let v of [1, 1e-9, '0.1', ' 2 ']) {
            assert.strictEqual(chkValue(v, 'x', kPnum).ok, true, JSON.stringify(v))
        }
        for (let v of [0, -0, -1, '0', '-1', '0e0', NaN, '-', '']) {
            let r = chkValue(v, 'x', kPnum)
            assert.strictEqual(r.ok, false, JSON.stringify(v))
            assert.strictEqual(r.msg, 'invalid x: must be a positive number')
        }
    })

    it('pint: positive safe integer (K6)', function() {
        for (let v of [1, 5, '5', ' 5 ', '5.0', '1e3', 9007199254740991, '9007199254740991']) {
            assert.strictEqual(chkValue(v, 'x', kPint).ok, true, JSON.stringify(v))
        }
        for (let v of [0, -1, 1.5, '1.5', '0', 2 ** 53, '9007199254740993', 1e21, 5n, Infinity, '-', '']) {
            let r = chkValue(v, 'x', kPint)
            assert.strictEqual(r.ok, false, String(v))
            assert.strictEqual(r.msg, 'invalid x: must be a positive integer')
        }
        assert.strictEqual(chkValue('5.0', 'x', kPint).v, 5)
        assert.strictEqual(chkValue('1e3', 'x', kPint).v, 1000)
    })

    it('bol (B1): only true/false (K5)', function() {
        assert.strictEqual(chkValue(true, 'x', kBol).ok, true)
        assert.strictEqual(chkValue(false, 'x', kBol).ok, true)
        assert.strictEqual(chkValue(false, 'x', kBol).v, false)
        for (let v of ['true', 'false', 'TRUE', 'y', 'n', 'Y', 'yes', 1, 0, '1', '0', '', null, undefined, NaN, {}, [], new Boolean(true)]) {
            let r = chkValue(v, 'opt.u', kBol)
            assert.strictEqual(r.ok, false, String(v))
            assert.strictEqual(r.msg, 'invalid opt.u: must be a boolean')
        }
    })

    it('fun (F1) and obj (O1) and str (S1)', function() {
        assert.strictEqual(chkValue(() => 1, 'f', kFun).ok, true)
        assert.strictEqual(chkValue(async () => 1, 'f', kFun).ok, true)
        assert.strictEqual(chkValue(function() {}, 'f', kFun).ok, true)
        for (let v of [null, undefined, 5, 'abc', {}, [], new Boolean(true)]) {
            assert.strictEqual(chkValue(v, 'f', kFun).msg, 'invalid f: must be a function')
        }
        assert.strictEqual(chkValue({}, 'o', kObj).ok, true)
        assert.strictEqual(chkValue(Object.create(null), 'o', kObj).ok, true)
        for (let v of [null, undefined, 5, 'abc', [], new Date(), new Map(), () => 1, new (class A {})()]) {
            assert.strictEqual(chkValue(v, 'o', kObj).msg, 'invalid o: must be a plain object')
        }
        assert.strictEqual(chkValue('a', 's', kStr).ok, true)
        for (let v of ['', null, undefined, 5, new String('a'), []]) {
            assert.strictEqual(chkValue(v, 's', kStr).msg, 'invalid s: must be a non-empty string')
        }
    })

    it('enum (S3): strict string equality, case sensitive, no array wrapping, no trimming', function() {
        let k = kEnum(['Mapping', 'Limit'])
        assert.strictEqual(chkValue('Limit', 'm', k).ok, true)
        for (let v of ['limit', ' Limit', 'Limit ', '', null, undefined, 1, ['Limit'], new String('Limit'), {}]) {
            let r = chkValue(v, 'm', k)
            assert.strictEqual(r.ok, false, JSON.stringify(v))
            assert.strictEqual(r.msg, 'invalid m: must be one of \'Mapping\', \'Limit\'')
        }
    })

    it('numor: positive number (or numeric string) or a listed string', function() {
        let k = kNumOr(['speed'])
        assert.deepStrictEqual(chkValue('speed', 'd', k), { ok: true, v: 'speed', msg: '' })
        assert.deepStrictEqual(chkValue('3', 'd', k), { ok: true, v: 3, msg: '' })
        assert.deepStrictEqual(chkValue(2.5, 'd', k), { ok: true, v: 2.5, msg: '' })
        for (let v of [0, -1, '0', 'Speed', ' speed', '', '-', 'NP', NaN, Infinity, true, null, 5n]) {
            let r = chkValue(v, 'd', k)
            assert.strictEqual(r.ok, false, String(v))
            assert.strictEqual(r.msg, 'invalid d: must be a positive number or one of \'speed\'')
        }
    })

    it('fit: number or numeric string, +-Infinity allowed as a penalty value; NaN and others invalid', function() {
        assert.deepStrictEqual(chkValue('5', 'f', kFit), { ok: true, v: 5, msg: '' })
        assert.strictEqual(chkValue(Infinity, 'f', kFit).v, Infinity)
        assert.strictEqual(chkValue(-Infinity, 'f', kFit).v, -Infinity)
        for (let v of [NaN, null, undefined, true, '-', 'NP', '', 'Infinity', '0x10', 5n, {}, []]) {
            let r = chkValue(v, 'f', kFit)
            assert.strictEqual(r.ok, false, String(v))
            assert.strictEqual(r.msg, 'invalid f: must be a number or numeric string')
        }
    })

    it('arr of N2 (non-empty, converted elements, first invalid index in message)', function() {
        assert.deepStrictEqual(chkValue([1, '2', ' 3 '], 'params', kNumArr), { ok: true, v: [1, 2, 3], msg: '' })
        for (let v of [[], null, undefined, 5, 'abc', {}, { length: 1, 0: 1 }, new Set([1])]) {
            assert.strictEqual(chkValue(v, 'params', kNumArr).msg, 'invalid params: must be a non-empty array')
        }
        assert.strictEqual(chkValue([1, 'NP', null], 'params', kNumArr).msg, 'invalid params[1]: must be a valid number')
        assert.strictEqual(chkValue([1, 2, null], 'params', kNumArr).msg, 'invalid params[2]: must be a valid number')
        //稀疏陣列之空洞視為 undefined, 無效
        assert.strictEqual(chkValue([1, , 3], 'params', kNumArr).msg, 'invalid params[1]: must be a valid number') // eslint-disable-line no-sparse-arrays
        //不改寫輸入
        let a = ['1', '2']
        chkValue(a, 'params', kNumArr)
        assert.deepStrictEqual(a, ['1', '2'])
    })

    it('arr of N1 (markers kept in place, may be empty, invalid elements named by index)', function() {
        let r = chkValue([1, '-', '2', 'NP', '', '0x10', ' '], 'arr', kNumArrN1)
        assert.deepStrictEqual(r, { ok: true, v: [1, '-', 2, 'NP', '', '0x10', ' '], msg: '' })
        assert.deepStrictEqual(chkValue([], 'arr', kNumArrN1), { ok: true, v: [], msg: '' })
        for (let v of [null, undefined, 5, 'abc', {}, new Set()]) {
            assert.strictEqual(chkValue(v, 'arr', kNumArrN1).msg, 'invalid arr: must be an array')
        }
        for (let e of [null, undefined, true, false, NaN, Infinity, -Infinity, 5n, {}, [], () => 1, new Number(5), new String('5')]) {
            assert.strictEqual(chkValue([1, e], 'arr', kNumArrN1).msg, 'invalid arr[1]: must be a number, numeric string or marker string')
        }
    })

    it('custom kind and unknown kind', function() {
        let k = kCustom((v, name) => (v === 1 ? { ok: true, v: 'one', msg: '' } : { ok: false, v: undefined, msg: `invalid ${name}: custom` }))
        assert.strictEqual(chkValue(1, 'c', k).v, 'one')
        assert.strictEqual(chkValue(2, 'c', k).msg, 'invalid c: custom')
        assert.throws(() => chkValue(1, 'c', { t: 'zzz', d: '' }), /unknown kind/)
    })

})


describe('_checkParam parseOpt (dspec §4)', function() {

    let decl = {
        n: [kPint, 10],
        b: [kBol, true],
        e: [kEnum(['a', 'b']), 'a'],
        f: [kFun, undefined],
        x: [kNum, 1],
    }

    it('undefined, null and {} are treated as not given: defaults for every key', function() {
        for (let opt of [undefined, null, {}]) {
            let r = parseOpt(opt, decl)
            assert.strictEqual(r.err, '')
            assert.deepStrictEqual(r.o, { n: 10, b: true, e: 'a', f: undefined, x: 1 })
        }
    })

    it('non-plain-object opt is invalid', function() {
        for (let opt of ['abc', 5, true, [], new Map(), () => 1, new (class A {})(), SECRET]) {
            let r = parseOpt(opt, decl)
            assert.strictEqual(r.err, 'invalid opt: must be a plain object')
            assert.strictEqual(r.o, null)
        }
    })

    it('null/undefined key takes the default; a given invalid key is an error and never falls back to the default (K3)', function() {
        assert.deepStrictEqual(parseOpt({ n: null, b: undefined }, decl).o, { n: 10, b: true, e: 'a', f: undefined, x: 1 })
        assert.strictEqual(parseOpt({ n: 0 }, decl).err, 'invalid opt.n: must be a positive integer')
        assert.strictEqual(parseOpt({ b: 'n' }, decl).err, 'invalid opt.b: must be a boolean')
        assert.strictEqual(parseOpt({ b: 'false' }, decl).err, 'invalid opt.b: must be a boolean')
        assert.strictEqual(parseOpt({ e: 'c' }, decl).err, 'invalid opt.e: must be one of \'a\', \'b\'')
        assert.strictEqual(parseOpt({ f: 'abc' }, decl).err, 'invalid opt.f: must be a function')
        assert.strictEqual(parseOpt({ x: 'NP' }, decl).err, 'invalid opt.x: must be a valid number')
    })

    it('converts numeric strings and ignores undeclared keys (V7); the caller opt is not changed (V9)', function() {
        let opt = { n: '5', x: ' 2.5 ', zzz: 1 }
        let snap = JSON.stringify(opt)
        let r = parseOpt(opt, decl)
        assert.deepStrictEqual(r.o, { n: 5, b: true, e: 'a', f: undefined, x: 2.5 })
        assert.strictEqual(Object.prototype.hasOwnProperty.call(r.o, 'zzz'), false)
        assert.strictEqual(JSON.stringify(opt), snap)
    })

    it('a throwing accessor is invalid (V11) and each key is read once', function() {
        let opt = {}
        Object.defineProperty(opt, 'n', {
            enumerable: true,
            get() {
                throw new Error(SECRET)
            },
        })
        let r = parseOpt(opt, decl)
        assert.strictEqual(r.err, 'invalid opt.n: must be readable')

        let reads = 0
        let opt2 = {}
        Object.defineProperty(opt2, 'n', {
            enumerable: true,
            get() {
                reads++
                return '7'
            },
        })
        assert.strictEqual(parseOpt(opt2, decl).o.n, 7)
        assert.strictEqual(reads, 1)
    })

    it('the first invalid key (declaration order) is reported', function() {
        assert.strictEqual(parseOpt({ x: 'NP', n: 0 }, decl).err, 'invalid opt.n: must be a positive integer')
    })

})


describe('_checkParam chkParams', function() {

    it('general params are checked in order before opt; returns converted values and parsed opt', function() {
        let r = chkParams([[() => 1, 'fun', kFun], ['1', 'xL', kNum]], { n: '3' }, { n: [kPint, 1] })
        assert.strictEqual(r.err, '')
        assert.strictEqual(r.vs[1], 1)
        assert.deepStrictEqual(r.o, { n: 3 })
        assert.strictEqual(chkParams([[5, 'fun', kFun], ['NP', 'xL', kNum]], {}, {}).err, 'invalid fun: must be a function')
        assert.strictEqual(chkParams([[() => 1, 'fun', kFun], ['NP', 'xL', kNum]], { n: 0 }, { n: [kPint, 1] }).err, 'invalid xL: must be a valid number')
        assert.strictEqual(chkParams([[() => 1, 'fun', kFun]], { n: 0 }, { n: [kPint, 1] }).err, 'invalid opt.n: must be a positive integer')
        //未給宣告表: 僅檢一般參數
        let r2 = chkParams([[5, 'x', kNum]], 'ignored')
        assert.deepStrictEqual(r2, { err: '', vs: [5], o: null })
    })

})


describe('_checkParam isPlainObj', function() {

    it('prototype is Object.prototype or null', function() {
        assert.strictEqual(isPlainObj({}), true)
        assert.strictEqual(isPlainObj(Object.create(null)), true)
        for (let v of [null, undefined, 1, 'a', [], new Date(), new Map(), () => 1, new (class A {})()]) {
            assert.strictEqual(isPlainObj(v), false)
        }
    })

})
