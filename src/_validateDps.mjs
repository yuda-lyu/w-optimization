import { toNum, isPlainObj, kCustom, chkValue, kFit, kStr } from './_checkParam.mjs'


//_validateDps, 檢測 dps 是否符合不變式, 回傳 { ok, v, msg }(同 _checkParam 之 chkValue)
//dps = [{ values: [...可用值], n: 總數量 }, ...]
//核心不變式: n === values.length, 即 n 是 values 的數量(非「切分數」也非「上界」)
//
//常見錯誤: caller 寫 `{ values: w.rang(s,e,N), n: N }`
//  w.rang(s,e,N) 是「切 N 段、回 N+1 點」, caller 把 N 當點數就會違反 n===values.length
//  正確: `{ values: w.rang(s,e,N), n: N+1 }` 或 `{ values: w.rang(s,e,N-1), n: N }`
//
//種類(dspec 輸入參數之檢測機制):
//  dps                非空陣列, 各元素為一般物件
//  dps[i].values      非空陣列, 元素為設計變數之可用值(任意值, 由 funFit 自行解讀, 不檢)
//  dps[i].n           N2 正整數(數字字串轉換後使用, 回傳之 v 為新陣列且 n 已為數值, 不改寫呼叫端之 dps)
//
//訊息不回顯輸入值(dspec §6), 僅含名稱與索引
function _validateDps(dps, name = 'dps') {

    if (!Array.isArray(dps) || dps.length === 0) {
        return { ok: false, v: undefined, msg: `invalid ${name}: must be a non-empty array` }
    }

    let vs = []
    for (let i = 0; i < dps.length; i++) {

        let dp = dps[i]
        if (!isPlainObj(dp)) {
            return { ok: false, v: undefined, msg: `invalid ${name}[${i}]: must be a plain object` }
        }

        let values = dp.values
        if (!Array.isArray(values) || values.length === 0) {
            return { ok: false, v: undefined, msg: `invalid ${name}[${i}].values: must be a non-empty array` }
        }

        let n = toNum(dp.n)
        if (n === null || !Number.isSafeInteger(n) || n <= 0) {
            return { ok: false, v: undefined, msg: `invalid ${name}[${i}].n: must be a positive integer` }
        }

        if (n !== values.length) {
            return { ok: false, v: undefined, msg: `invalid ${name}[${i}].n: must equal the length of ${name}[${i}].values` }
        }

        vs.push({ ...dp, n })
    }

    return { ok: true, v: vs, msg: '' }
}


//_validateInitSolution, 檢測 opt.initSolution(LocalSearch模式由 _localSearch 傳入之現解), 回傳 { ok, v, msg }
//initSolution = { ps: [{ ind, value }, ...], fitness }
//  ps          非空陣列(元素為本套件內部產生之結構, 不逐一檢測)
//  fitness     適應函數值(kFit: 數字或數字字串, 另收+-Infinity), 轉換後使用
function _validateInitSolution(v, name = 'opt.initSolution') {

    if (!isPlainObj(v)) {
        return { ok: false, v: undefined, msg: `invalid ${name}: must be a plain object` }
    }

    if (!Array.isArray(v.ps) || v.ps.length === 0) {
        return { ok: false, v: undefined, msg: `invalid ${name}.ps: must be a non-empty array` }
    }

    let r = chkValue(v.fitness, `${name}.fitness`, kFit)
    if (!r.ok) {
        return r
    }

    return { ok: true, v: { ...v, fitness: r.v }, msg: '' }
}


//_validateSchema, 檢測 adapter 之 schema(要調適之超參數清單), 回傳 { ok, v, msg }
//schema = [{ name, values }, ...]
//  schema            非空陣列, 各元素為一般物件
//  schema[i].name    非空字串, 不得重複(以 name 作為 params 之鍵)
//  schema[i].values  非空陣列(元素為候選值, 任意值, 不檢)
function _validateSchema(v, name = 'schema') {

    if (!Array.isArray(v) || v.length === 0) {
        return { ok: false, v: undefined, msg: `invalid ${name}: must be a non-empty array` }
    }

    let names = Object.create(null)
    for (let i = 0; i < v.length; i++) {

        let s = v[i]
        if (!isPlainObj(s)) {
            return { ok: false, v: undefined, msg: `invalid ${name}[${i}]: must be a plain object` }
        }

        let rn = chkValue(s.name, `${name}[${i}].name`, kStr)
        if (!rn.ok) {
            return rn
        }
        if (names[s.name] === true) {
            return { ok: false, v: undefined, msg: `invalid ${name}[${i}].name: must be unique` }
        }
        names[s.name] = true

        if (!Array.isArray(s.values) || s.values.length === 0) {
            return { ok: false, v: undefined, msg: `invalid ${name}[${i}].values: must be a non-empty array` }
        }

    }

    return { ok: true, v, msg: '' }
}


const kDps = kCustom(_validateDps)
const kInitSolution = kCustom(_validateInitSolution)
const kSchema = kCustom(_validateSchema)


export {
    kDps,
    kInitSolution,
    kSchema
}
