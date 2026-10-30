import assert from 'assert'
import _adapterACO from '../src/_adapterACO.mjs'
import _adapterHS from '../src/_adapterHS.mjs'
import _adapterSA from '../src/_adapterSA.mjs'
import _adapterTA from '../src/_adapterTA.mjs'
import { runParamSpec, invalidNums, assertFail, SECRET } from './tools/paramMatrix.mjs'


//輸入參數檢測(dspec 輸入參數之檢測機制, rulebook R-PARAM): meta-optimizer 工廠(_adapterACO / _adapterHS / _adapterSA / _adapterTA)
//  schema: 非空陣列, 元素為一般物件 { name: 非空字串且不得重複, values: 非空陣列 }
//  opt: 係數為 N2 有效數字, Ns 為 N2 正整數, 運算子為 S3 列舉字串; 給了而無效即報錯, 不改用預設(K3)
//  feedback(params, fitness): params 為一般物件, fitness 為適應函數值(數字或數字字串轉換後使用, 另收 +-Infinity 作為懲罰值)
//  失敗通道: 同步, throw Error
//
//工廠回傳物件含函數, 不能逐值比對; 以腳本化之 suggest / feedback 後之確定性觀察值作為投影

let schema = () => [{ name: 'a', values: [1, 2, 3] }, { name: 'b', values: [10, 20] }]
let ModeOutLimit = ['Mapping', 'Limit', 'Random']

let specs = [
    {
        name: '_adapterACO',
        fn: _adapterACO,
        //feedback 後之費洛蒙為 acoAlpha 之確定性函數
        pick: (ad) => {
            ad.feedback({ a: 1, b: 10 }, 4)
            ad.feedback({ a: 2, b: 20 }, 0.5)
            return ad.getPheromones()
        },
        opts: [
            { key: 'acoExploitationRate', kind: 'num', val: 0.7 },
            { key: 'acoAlpha', kind: 'num', val: 0.3 },
        ],
    },
    {
        name: '_adapterSA',
        fn: _adapterSA,
        //溫度為 saInitialTemperature 與 saAlpha 之確定性函數(第2次 feedback 為改善, 必接受並降溫)
        pick: (ad) => {
            ad.suggest()
            ad.feedback({ a: 1, b: 10 }, 5)
            ad.suggest()
            ad.feedback({ a: 1, b: 10 }, 3)
            return { t: ad.getTemperature(), best: ad.getBestEver().fitness }
        },
        opts: [
            { key: 'saInitialTemperature', kind: 'num', val: 7 },
            { key: 'saAlpha', kind: 'num', val: 0.4 },
            { key: 'ModeOutLimit', kind: 'enum', list: ModeOutLimit },
        ],
    },
    {
        name: '_adapterTA',
        fn: _adapterTA,
        //門檻為 taThresholdInitial 與 taThresholdRatio 之確定性函數
        pick: (ad) => {
            ad.suggest()
            ad.feedback({ a: 1, b: 10 }, 5)
            ad.suggest()
            ad.feedback({ a: 1, b: 10 }, 3)
            return { t: ad.getThreshold(), best: ad.getBestEver().fitness }
        },
        opts: [
            { key: 'taThresholdInitial', kind: 'num', val: 7 },
            { key: 'taThresholdRatio', kind: 'num', val: 0.4 },
            { key: 'ModeOutLimit', kind: 'enum', list: ModeOutLimit },
        ],
    },
    {
        name: '_adapterHS',
        fn: _adapterHS,
        opt: { Ns: 5 },
        //memory 為 Ns 與 feedback 序列之確定性函數(以 params 反推 ind)
        pick: (ad) => {
            let ps = [[1, 10], [2, 20], [3, 10], [1, 20], [2, 10]]
            ps.forEach((p, i) => ad.feedback({ a: p[0], b: p[1] }, 10 - i))
            return ad.getMemory()
        },
        opts: [
            { key: 'Ns', kind: 'pint', val: 4 },
            { key: 'hsHMCR', kind: 'num', val: 0.7 },
            { key: 'hsPAR', kind: 'num', val: 0.5 },
            { key: 'hsHMC', kind: 'enum', list: ['Original', '2M Consideration', '2MB Consideration', '3M Consideration', '3MB Consideration', '4M Consideration', '4MB Consideration'] },
            { key: 'hsPA', kind: 'enum', list: ['Constant1', 'Constant2', 'Constant3', 'Linear0.1', 'Linear0.2', 'Linear0.3', 'Exponent0.1', 'Exponent0.2', 'Exponent0.3', 'Global Space', 'Available Space', 'Modified Global Best'] },
            { key: 'ModeOutLimit', kind: 'enum', list: ModeOutLimit },
        ],
    },
]


function catchSync(fn) {
    try {
        return { threw: false, v: fn() }
    }
    catch (e) {
        return { threw: true, e }
    }
}


for (let s of specs) {

    runParamSpec({
        name: s.name,
        fn: s.fn,
        mode: 'sync',
        args: () => [schema()],
        opt: s.opt,
        pick: s.pick,
        gen: [],
        opts: s.opts,
    })

    describe(`${s.name} schema and feedback`, function() {

        //spec(dspec V19, K2): schema 必給且須為非空陣列, 元素為一般物件, name 為非空字串且不得重複, values 為非空陣列
        it('schema must be a non-empty array of { name, values }', function() {
            let cases = [
                ['undefined', undefined, 'invalid schema: must be a non-empty array'],
                ['null', null, 'invalid schema: must be a non-empty array'],
                ['number', 5, 'invalid schema: must be a non-empty array'],
                ['secret string', SECRET, 'invalid schema: must be a non-empty array'],
                ['object', {}, 'invalid schema: must be a non-empty array'],
                ['empty array', [], 'invalid schema: must be a non-empty array'],
                ['null element', [null], 'invalid schema[0]: must be a plain object'],
                ['string element', ['a'], 'invalid schema[0]: must be a plain object'],
                ['no name', [{ values: [1] }], 'invalid schema[0].name: must be a non-empty string'],
                ['empty name', [{ name: '', values: [1] }], 'invalid schema[0].name: must be a non-empty string'],
                ['number name', [{ name: 5, values: [1] }], 'invalid schema[0].name: must be a non-empty string'],
                ['duplicate name', [{ name: 'a', values: [1] }, { name: 'a', values: [2] }], 'invalid schema[1].name: must be unique'],
                ['no values', [{ name: 'a' }], 'invalid schema[0].values: must be a non-empty array'],
                ['empty values', [{ name: 'a', values: [] }], 'invalid schema[0].values: must be a non-empty array'],
                ['values not array', [{ name: 'a', values: 'abc' }], 'invalid schema[0].values: must be a non-empty array'],
                ['second element bad', [{ name: 'a', values: [1] }, { name: 'b' }], 'invalid schema[1].values: must be a non-empty array'],
            ]
            for (let [label, v, msg] of cases) {
                let r = catchSync(() => s.fn(v))
                assertFail(r, 'sync', msg, `schema=${label}`)
            }
        })

        //spec(dspec V10 跨鍵依賴): _adapterHS 之 Ns 不得小於 hsHMC 所需
        if (s.name === '_adapterHS') {
            it('opt.Ns must be at least the minimum required by opt.hsHMC', function() {
                let r = catchSync(() => s.fn(schema(), { Ns: 3, hsHMC: '4M Consideration' }))
                assertFail(r, 'sync', 'invalid opt.Ns: must be at least the minimum required by opt.hsHMC', 'Ns=3,hsHMC=4M')
                assert.doesNotThrow(() => s.fn(schema(), { Ns: 4, hsHMC: '4M Consideration' }))
            })
        }

        //spec(dspec K2, V10): feedback 之 params 為一般物件
        it('feedback: params must be a plain object', function() {
            for (let [label, v] of [['undefined', undefined], ['null', null], ['number', 5], ['string', 'abc'], ['secret string', SECRET], ['array', []]]) {
                let ad = s.fn(schema(), s.opt)
                let r = catchSync(() => ad.feedback(v, 3))
                assertFail(r, 'sync', 'invalid params: must be a plain object', `params=${label}`)
            }
        })

        //spec(dspec N2, K5, K9): feedback 之 fitness 為數字或數字字串, '-'、'NP'、''、null、布林、NaN 等為無效, 訊息不回顯值
        it('feedback: fitness must be a number or numeric string', function() {
            let bads = invalidNums({ withNull: true, withUndefined: true }).filter((v) => v[1] !== Infinity && v[1] !== -Infinity)
            for (let [label, v] of bads) {
                let ad = s.fn(schema(), s.opt)
                let r = catchSync(() => ad.feedback({ a: 1, b: 10 }, v))
                assertFail(r, 'sync', 'invalid fitness: must be a number or numeric string', `fitness=${label}`)
            }
        })

        //spec(dspec K4): fitness 為數字字串時轉換後使用, 結果與數值相同; +-Infinity 作為懲罰值可收
        it('feedback: numeric-string fitness equals number fitness; Infinity is accepted as a penalty value', function() {
            let seq = (f1, f2) => {
                let ad = s.fn(schema(), s.opt)
                ad.suggest && ad.suggest()
                ad.feedback({ a: 1, b: 10 }, f1)
                ad.suggest && ad.suggest()
                ad.feedback({ a: 2, b: 20 }, f2)
                return JSON.stringify([
                    ad.getPheromones && ad.getPheromones(),
                    ad.getTemperature && ad.getTemperature(),
                    ad.getThreshold && ad.getThreshold(),
                    ad.getBestEver && ad.getBestEver() && ad.getBestEver().fitness,
                    ad.getMemory && ad.getMemory().map((m) => m.fitness),
                ])
            }
            assert.strictEqual(seq('5', ' 3 '), seq(5, 3))
            let ad = s.fn(schema(), s.opt)
            ad.suggest && ad.suggest()
            assert.doesNotThrow(() => ad.feedback({ a: 1, b: 10 }, Infinity))
        })

    })

}
