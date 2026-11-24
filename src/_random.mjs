import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import randomIntsNdpRange from 'wsemi/src/randomIntsNdpRange.mjs'


//_random, 隨機取值之統一出口(對應 opt.random)
//
//oml 系列(omlSA, omlTA, omlDE, omlRGA, omlHS, omlPSO, omlACO)與 sdm 之一切隨機取值皆經本檔產生之物件 R, 不直接用 Math.random 或 wsemi 之隨機函數(靜態守門見 test/unit-random-coverage.test.mjs)
//
//_makeRandom(random) 回傳 { rand, randInt, randIntsNdp }
//  rand()                    回傳 [0,1) 之數, 同 Math.random 之約定
//  randInt(lo, hi)           回傳 [lo,hi] 內整數(含兩端), 各整數機率相同
//  randIntsNdp(lo, hi, n)    回傳 [lo,hi] 內 n 個不重複整數(順序亦隨機), n 大於範圍個數時回傳全部
//
//random 為 undefined 或 null(未給): 回傳預設, 行為同未有本檔之前: rand 用 Math.random, randInt 用 wsemi 之 randomIntRange, randIntsNdp 用 wsemi 之 randomIntsNdpRange
//random 為函數(已由入口以 kFun 檢測): 一切隨機取值只經它, randInt 與 randIntsNdp 皆由它導出, 公式同 wsemi 之 randomIntRange(floor(r * (hi - lo + 1) + lo), 結果大於 hi 時鉗制至 hi), 故取整數之分佈與範圍(含端點是否可取)與預設相同
//回傳值不檢測(同 funFit 等回呼之回傳值不檢)


//預設: 未給 opt.random 時使用, 每次呼叫才取 Math.random, 故呼叫端暫代 Math.random 亦生效
const _defaultRandom = {
    rand: () => Math.random(),
    randInt: randomIntRange,
    randIntsNdp: randomIntsNdpRange,
}


function _makeRandom(random) {

    //未給
    if (random === undefined || random === null) {
        return _defaultRandom
    }

    let rand = () => random()

    //randInt, 公式同 wsemi 之 randomIntRange
    let randInt = (lo, hi) => {
        if (lo > hi) {
            throw new Error('invalid vstart: must be <= vend')
        }
        let r = Math.floor(rand() * (hi - lo + 1) + lo)
        if (r > hi) {
            r = hi
        }
        return r
    }

    //randIntsNdp, 部分 Fisher-Yates, 取前 k 個, 各子集與各順序機率相同
    let randIntsNdp = (lo, hi, n) => {
        if (lo > hi) {
            throw new Error('invalid vstart: must be <= vend')
        }
        let m = hi - lo + 1
        let k = Math.min(n, m)
        let a = new Array(m)
        for (let i = 0; i < m; i++) {
            a[i] = lo + i
        }
        for (let i = 0; i < k; i++) {
            let j = i + randInt(0, m - 1 - i)
            let t = a[i]
            a[i] = a[j]
            a[j] = t
        }
        return a.slice(0, k)
    }

    return { rand, randInt, randIntsNdp }
}


export { _makeRandom, _defaultRandom }
