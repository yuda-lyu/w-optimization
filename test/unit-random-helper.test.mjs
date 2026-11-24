import assert from 'assert'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import { _makeRandom, _defaultRandom } from '../src/_random.mjs'
import _genSolution from '../src/_genSolution.mjs'
import _randPickNeighbor from '../src/_randPickNeighbor.mjs'
import _modifyParameter from '../src/_modifyParameter.mjs'
import _pickByWeights from '../src/_pickByWeights.mjs'
import { scripted, withMathRandom, makeDps } from './tools/randomKit.mjs'


//opt.random 之內部出口 _makeRandom 與其下游輔助(_genSolution、_randPickNeighbor、_modifyParameter、_pickByWeights)
//  內部輔助之單點測試: 以腳本化之產生器(依序回傳給定之數)逐一確認每個取值點之呼叫次數與結果, 補足方法層級測試較難觸達之分支


function expectedInt(u, lo, hi) {
    return Math.min(Math.floor(u * (hi - lo + 1) + lo), hi)
}


describe('_makeRandom', function() {

    it('R3: not given (undefined, null) gives the default; rand follows the current Math.random', async function() {
        assert.strictEqual(_makeRandom(undefined), _defaultRandom)
        assert.strictEqual(_makeRandom(null), _defaultRandom)
        let orig = Math.random
        Math.random = () => 0.625
        try {
            assert.strictEqual(_defaultRandom.rand(), 0.625)
        }
        finally {
            Math.random = orig
        }
        //預設之取整數沿用 wsemi 之 randomIntRange
        assert.strictEqual(_defaultRandom.randInt, randomIntRange)
        for (let i = 0; i < 50; i++) {
            let v = _defaultRandom.randInt(3, 6)
            assert.ok(Number.isInteger(v) && v >= 3 && v <= 6)
        }
    })

    it('R1: rand returns exactly what the generator returns and calls it without arguments', function() {
        let { f, st } = scripted([0, 0.25, 0.999999])
        let R = _makeRandom(f)
        assert.strictEqual(R.rand(), 0)
        assert.strictEqual(R.rand(), 0.25)
        assert.strictEqual(R.rand(), 0.999999)
        assert.strictEqual(st.n, 3)
        assert.strictEqual(st.withArgs, 0)
    })

    it('R1: randInt follows the wsemi randomIntRange formula floor(u * (hi - lo + 1) + lo), one draw per call, both end points reachable', async function() {
        let us = [0, 0.1, 0.2499, 0.25, 0.5, 0.75, 0.9999999999, 1]
        for (let [lo, hi] of [[0, 0], [0, 1], [0, 9], [3, 7], [-5, 5], [-9, -2], [100, 101]]) {
            let { f, st } = scripted(us)
            let R = _makeRandom(f)
            let m = await withMathRandom(async () => us.map(() => R.randInt(lo, hi)))
            assert.strictEqual(m.count, 0, 'Math.random is not used')
            assert.deepStrictEqual(m.r, us.map((u) => expectedInt(u, lo, hi)), `range [${lo},${hi}]`)
            assert.strictEqual(st.n, us.length, 'one draw per randInt')
            assert.strictEqual(m.r[0], lo, 'the lower end point is reachable')
            assert.strictEqual(m.r[us.length - 2], hi, 'the upper end point is reachable')
            assert.strictEqual(m.r[us.length - 1], hi, 'a draw of exactly 1 is clamped to the upper end point')
        }
    })

    it('R1: randInt is uniform (a stratified generator hits every integer equally often)', function() {
        let lo = -2
        let hi = 4
        let range = hi - lo + 1
        let reps = 13
        let total = range * reps
        let k = 0
        let R = _makeRandom(() => (k++ + 0.5) / total)
        let cnt = {}
        for (let i = 0; i < total; i++) {
            let v = R.randInt(lo, hi)
            cnt[v] = (cnt[v] || 0) + 1
        }
        for (let v = lo; v <= hi; v++) {
            assert.strictEqual(cnt[v], reps, `integer ${v}`)
        }
    })

    it('R1: randInt rejects lo > hi with the same message as wsemi randomIntRange, without drawing', function() {
        let { f, st } = scripted([0.5])
        let R = _makeRandom(f)
        let msg
        try {
            randomIntRange(5, 1)
        }
        catch (err) {
            msg = err.message
        }
        assert.strictEqual(typeof msg, 'string')
        assert.throws(() => R.randInt(5, 1), (err) => err instanceof Error && err.message === msg)
        assert.strictEqual(st.n, 0)
    })

    it('R1: randIntsNdp gives n distinct integers within the range (all of them when n exceeds the range) and every order is reachable', function() {
        let { f } = scripted([0.9, 0.9, 0.9, 0.9, 0.9, 0.9])
        let R = _makeRandom(f)
        let a = R.randIntsNdp(10, 14, 3)
        assert.strictEqual(a.length, 3)
        assert.strictEqual(new Set(a).size, 3)
        assert.ok(a.every((v) => v >= 10 && v <= 14))

        let R2 = _makeRandom(scripted([0, 0, 0, 0, 0, 0, 0, 0]).f)
        assert.deepStrictEqual(R2.randIntsNdp(10, 13, 99), [10, 11, 12, 13])

        //以 u = (a + 0.5) / m 之全部組合列舉, 3 個整數之 6 種排列各出現一次
        let seen = new Set()
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 2; y++) {
                let Rp = _makeRandom(scripted([(x + 0.5) / 3, (y + 0.5) / 2, 0.5]).f)
                seen.add(Rp.randIntsNdp(0, 2, 3).join(','))
            }
        }
        assert.deepStrictEqual([...seen].sort(), ['0,1,2', '0,2,1', '1,0,2', '1,2,0', '2,0,1', '2,1,0'])
    })

    it('R1: randIntsNdp with n smaller than the range draws exactly n times and every one of the n results is drawn (partial Fisher-Yates)', function() {
        //m = 5, n = 3: 第 i 次取 randInt(0, m - 1 - i) = floor(u * (m - i)); u = 0.5, 0.9, 0.9 => 位移 2, 3, 2
        //[10,11,12,13,14] -> i=0 換 0 與 2 -> [12,11,10,13,14] -> i=1 換 1 與 4 -> [12,14,10,13,11] -> i=2 換 2 與 4 -> [12,14,11,13,10] -> 取前 3 個
        let { f, st } = scripted([0.5, 0.9, 0.9])
        let R = _makeRandom(f)
        assert.deepStrictEqual(R.randIntsNdp(10, 14, 3), [12, 14, 11])
        assert.strictEqual(st.n, 3, 'one draw per returned element')
        assert.strictEqual(st.withArgs, 0)
        //n = 1: 單一元素亦由產生器取得(floor(0.7 * 5) = 3)
        let s1 = scripted([0.7])
        assert.deepStrictEqual(_makeRandom(s1.f).randIntsNdp(0, 4, 1), [3])
        assert.strictEqual(s1.st.n, 1)
    })

    it('R1: randInt and randIntsNdp accept lo === hi (a single available value)', function() {
        let s1 = scripted([0.3, 0.3, 0.3])
        let R = _makeRandom(s1.f)
        assert.strictEqual(R.randInt(7, 7), 7)
        assert.deepStrictEqual(R.randIntsNdp(5, 5, 1), [5])
        assert.deepStrictEqual(R.randIntsNdp(5, 5, 3), [5], 'n larger than the range gives the range')
    })

    it('R1: randIntsNdp rejects lo > hi and does not use Math.random', async function() {
        let R = _makeRandom(scripted([0.1, 0.2, 0.3, 0.4]).f)
        assert.throws(() => R.randIntsNdp(5, 1, 2), (err) => err instanceof Error && err.message === 'invalid vstart: must be <= vend')
        let m = await withMathRandom(async () => R.randIntsNdp(0, 3, 4))
        assert.strictEqual(m.count, 0)
        assert.deepStrictEqual([...m.r].sort(), [0, 1, 2, 3])
    })

})


describe('_genSolution', function() {

    it('R1: the index of each design variable comes from R.randInt, one draw per variable in order', async function() {
        let dps = makeDps([9, 7, 11])
        let us = [0.5, 0.99, 0]
        let { f, st } = scripted(us)
        let R = _makeRandom(f)
        let m = await withMathRandom(async () => _genSolution(dps, R))
        assert.strictEqual(m.count, 0)
        assert.strictEqual(st.n, 3)
        let inds = us.map((u, i) => expectedInt(u, 0, dps[i].n - 1))
        assert.deepStrictEqual(m.r.ps.map((p) => p.ind), inds)
        assert.deepStrictEqual(m.r.ps.map((p) => p.value), inds.map((j, i) => dps[i].values[j]))
    })

    it('R3: R not given uses the default (valid indices)', function() {
        let dps = makeDps([9, 7, 11])
        let seen = new Set()
        for (let i = 0; i < 60; i++) {
            let s = _genSolution(dps)
            s.ps.forEach((p, k) => {
                assert.ok(Number.isInteger(p.ind) && p.ind >= 0 && p.ind < dps[k].n)
                assert.strictEqual(p.value, dps[k].values[p.ind])
            })
            seen.add(s.ps.map((p) => p.ind).join(','))
        }
        //預設來源確實隨機(非常數): 9 * 7 * 11 = 693 種組合, 60 次取得少於 10 種相異者之機率可忽略
        assert.ok(seen.size >= 10, `R3: the default source varies between calls (${seen.size} distinct solutions in 60 calls)`)
    })

})


describe('_modifyParameter', function() {

    it('R1: Random mode re-draws an out-of-range index through R.randInt (one draw), in-range and the other modes do not draw', function() {
        let { f, st } = scripted([0.5, 0.99])
        let R = _makeRandom(f)
        assert.strictEqual(_modifyParameter(4, 9, 'Random', R), 4, 'in range: unchanged')
        assert.strictEqual(st.n, 0)
        assert.strictEqual(_modifyParameter(-1, 9, 'Random', R), expectedInt(0.5, 0, 9), 'below range')
        assert.strictEqual(st.n, 1)
        assert.strictEqual(_modifyParameter(10, 9, 'Random', R), expectedInt(0.99, 0, 9), 'above range')
        assert.strictEqual(st.n, 2)
        assert.strictEqual(_modifyParameter(-1, 9, 'Mapping', R), 9)
        assert.strictEqual(_modifyParameter(10, 9, 'Limit', R), 9)
        assert.strictEqual(_modifyParameter(5, 0, 'Random', R), 0, 'a single available value needs no draw')
        assert.strictEqual(st.n, 2)
    })

    it('R3: R not given uses the default (result within the range)', function() {
        let seen = new Set()
        for (let i = 0; i < 100; i++) {
            let v = _modifyParameter(-3, 9, 'Random')
            assert.ok(Number.isInteger(v) && v >= 0 && v <= 9)
            seen.add(v)
        }
        //預設來源確實隨機(非常數): 10 個可能值, 100 次取得少於 5 種相異者之機率可忽略
        assert.ok(seen.size >= 5, `R3: the default source varies between calls (${seen.size} distinct values in 100 calls)`)
    })

})


describe('_randPickNeighbor', function() {

    let dps = makeDps([9, 7, 11])
    let s0 = () => ({ ps: dps.map((dp, i) => ({ ind: i === 1 ? 0 : 3, value: dp.values[i === 1 ? 0 : 3] })), fitness: 1 })

    it('R1: the variable and the direction come from R (two draws); Mapping mode needs no more', async function() {
        //變數序 = floor(0.5 * 3) = 1 (ind 0), 方向 u < 0.5 為 -1: 0 - 1 經 Mapping 回繞至 6
        let { f, st } = scripted([0.5, 0.25])
        let R = _makeRandom(f)
        let m = await withMathRandom(async () => _randPickNeighbor(s0(), dps, 'Mapping', R))
        assert.strictEqual(m.count, 0)
        assert.strictEqual(st.n, 2)
        assert.strictEqual(m.r.ps[1].ind, 6)
        assert.strictEqual(m.r.ps[1].value, dps[1].values[6])
        assert.strictEqual(m.r.changed, true)
        //方向 u >= 0.5 為 +1
        let { f: f2 } = scripted([0, 0.5])
        let r2 = _randPickNeighbor(s0(), dps, 'Mapping', _makeRandom(f2))
        assert.deepStrictEqual(r2.ps.map((p) => p.ind), [4, 0, 3])
    })

    it('R1: Random mode re-draws the out-of-range index through R as the third draw; Limit mode keeps the index (unchanged)', function() {
        let { f, st } = scripted([0.5, 0.25, 0.8])
        let r = _randPickNeighbor(s0(), dps, 'Random', _makeRandom(f))
        assert.strictEqual(st.n, 3)
        assert.strictEqual(r.ps[1].ind, expectedInt(0.8, 0, 6))
        let { f: f2, st: st2 } = scripted([0.5, 0.25])
        let r2 = _randPickNeighbor(s0(), dps, 'Limit', _makeRandom(f2))
        assert.strictEqual(st2.n, 2)
        assert.strictEqual(r2.ps[1].ind, 0)
        assert.strictEqual(r2.changed, false)
    })

    it('R3: R not given uses the default (a neighbour with a valid index)', function() {
        let seen = new Set()
        for (let i = 0; i < 100; i++) {
            let r = _randPickNeighbor(s0(), dps, 'Random')
            r.ps.forEach((p, k) => {
                assert.ok(Number.isInteger(p.ind) && p.ind >= 0 && p.ind < dps[k].n)
            })
            seen.add(r.ps.map((p) => p.ind).join(','))
        }
        //預設來源確實隨機(非常數): 3 個變數 x 2 個方向(含 'Random' 越界重產)至少 6 種鄰點, 100 次取得少於 3 種相異者之機率可忽略
        assert.ok(seen.size >= 3, `R3: the default source varies between calls (${seen.size} distinct neighbours in 100 calls)`)
    })

})


describe('_pickByWeights', function() {

    //本函數不另取亂數(rnd 由呼叫端經 opt.random 之產生器取得)
    it('R1: positive weights are picked from the given rnd only; non-positive weights are skipped; no random source is used', async function() {
        let m = await withMathRandom(async () => [
            _pickByWeights([1, 2, 1], 0),
            _pickByWeights([1, 2, 1], 0.26),
            _pickByWeights([1, 2, 1], 0.74),
            _pickByWeights([1, 2, 1], 0.76),
            _pickByWeights([0, -1, 3], 0.9),
        ])
        assert.strictEqual(m.count, 0)
        assert.deepStrictEqual(m.r, [0, 1, 1, 2, 2])
    })

    it('R1: when no weight is positive, the uniform fallback is derived from rnd (every index equally likely, the upper end clamped), no source is used', async function() {
        let m = await withMathRandom(async () => [
            _pickByWeights([0, 0, -1, 0], 0),
            _pickByWeights([0, 0, -1, 0], 0.7),
            _pickByWeights([0, 0, -1, 0], 0.999999),
            _pickByWeights([0, 0, -1, 0], 1),
            _pickByWeights([NaN, 0], 0.6),
        ])
        assert.strictEqual(m.count, 0)
        assert.deepStrictEqual(m.r, [0, 2, 3, 3, 1])
        let cnt = [0, 0, 0, 0]
        for (let k = 0; k < 40; k++) {
            cnt[_pickByWeights([0, 0, 0, 0], (k + 0.5) / 40)]++
        }
        assert.deepStrictEqual(cnt, [10, 10, 10, 10])
    })

})
