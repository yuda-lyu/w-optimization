//randomKit, opt.random 測試之共用輔助(固定種子之產生器、Math.random 暫代計數、可重現之測試題與追蹤執行)


//mulberry32, 固定種子之偽隨機產生器(測試內自寫, 回傳 [0,1) 之函數)
export function mulberry32(seed) {
    let a = seed >>> 0
    return function() {
        a = (a + 0x6D2B79F5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}


//scripted, 依序回傳給定之數列(用盡即拋錯, 使呼叫次數多於預期者即失敗), 並記錄呼叫次數與各次是否帶引數
export function scripted(values) {
    let st = { n: 0, withArgs: 0 }
    let f = function() {
        if (arguments.length > 0) {
            st.withArgs++
        }
        if (st.n >= values.length) {
            throw new Error(`scripted random exhausted after ${values.length} draws`)
        }
        return values[st.n++]
    }
    return { f, st }
}


//counted, 包裝產生器以記錄呼叫次數與各次是否帶引數(契約: 如 Math.random 以零個引數呼叫)
export function counted(g) {
    let st = { n: 0, withArgs: 0 }
    let f = function() {
        st.n++
        if (arguments.length > 0) {
            st.withArgs++
        }
        return g()
    }
    return { f, st }
}


//withMathRandom, 於 fn 執行期間暫代 Math.random, 結束即還原; 回傳 { r, count, first }
//fn 執行期間若有 await, 僅經微任務(適應函數為同步或回傳已解決之 Promise), 不會讓出給其他巨任務, 故計數不會混入非本呼叫之取值
export async function withMathRandom(fn) {
    let orig = Math.random
    let count = 0
    let first = ''
    Math.random = function() {
        if (count === 0) {
            first = String(new Error('first Math.random call').stack).split('\n').slice(1, 5).join(' | ')
        }
        count++
        return orig()
    }
    try {
        let r = await fn()
        return { r, count, first }
    }
    finally {
        Math.random = orig
    }
}


//makeDps, 設計變數: 各變數之可用值於變數內逐筆相異(等差), 各變數之起點與間距不同
export function makeDps(ns) {
    return ns.map((n, k) => {
        let values = []
        for (let i = 0; i < n; i++) {
            values.push((i - Math.floor(n / 3)) * (k + 1) * 0.5 + k * 0.125)
        }
        return { values, n }
    })
}


//fitOf, 確定性之適應函數: 二次項加交互作用與擾動, 最佳解不在邊界, 非平凡(多變數時有多個局部起伏)
export function fitOf(x) {
    let f = 0
    for (let i = 0; i < x.length; i++) {
        f += (i + 1) * (x[i] - 0.5 * i) * (x[i] - 0.5 * i)
    }
    if (x.length >= 2) {
        f += 0.3 * Math.sin(3 * x[0] * x[1])
    }
    return f
}


//traced, 追蹤執行: 回傳 { r, calls }, calls 為適應函數被呼叫之序列(各次之設計變數取值)
//asyncFit 為 true 時適應函數回傳 Promise; fit 為適應函數之計算(預設 fitOf)
export async function traced(fn, dps, opt, asyncFit = false, fit = fitOf) {
    let calls = []
    let funFit = null
    if (asyncFit) {
        funFit = async (x) => {
            calls.push(x.slice())
            return fit(x)
        }
    }
    else {
        funFit = (x) => {
            calls.push(x.slice())
            return fit(x)
        }
    }
    let r = await fn(dps, funFit, opt)
    return { r, calls }
}


//covering, 由各軸之取值清單產生涵蓋設定: 第 i 個設定取各軸 list[(i + 軸序) % 長度], 設定數為最長之軸, 故各軸每個取值至少出現一次
export function covering(axes) {
    let keys = Object.keys(axes)
    let len = Math.max(...keys.map((k) => axes[k].length))
    let cfgs = []
    for (let i = 0; i < len; i++) {
        let c = {}
        keys.forEach((k, ki) => {
            c[k] = axes[k][(i + ki) % axes[k].length]
        })
        cfgs.push(c)
    }
    return cfgs
}
