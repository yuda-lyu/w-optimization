import get from 'lodash-es/get.js'
import each from 'lodash-es/each.js'
import isearr from 'wsemi/src/isearr.mjs'
import iseobj from 'wsemi/src/iseobj.mjs'
import ispint from 'wsemi/src/ispint.mjs'


//_validateDps, 檢測 dps 是否符合不變式
//dps = [{ values: [...可用值], n: 總數量 }, ...]
//核心不變式: n === values.length, 即 n 是 values 的數量(非「切分數」也非「上界」)
//
//常見錯誤: caller 寫 `{ values: w.rang(s,e,N), n: N }`
//  w.rang(s,e,N) 是「切 N 段、回 N+1 點」, caller 把 N 當點數就會違反 n===values.length
//  正確: `{ values: w.rang(s,e,N), n: N+1 }` 或 `{ values: w.rang(s,e,N-1), n: N }`
//
//失敗即 throw Error, 訊息含 dp index、欄位名、實際值, 方便 caller 修正
function _validateDps(dps) {

    if (!isearr(dps)) {
        throw new Error(`dps is not an effective array`)
    }

    each(dps, (dp, i) => {

        if (!iseobj(dp)) {
            throw new Error(`dps[${i}] is not an effective object`)
        }

        let values = get(dp, 'values')
        if (!isearr(values)) {
            throw new Error(`dps[${i}].values is not an effective array`)
        }
        let m = values.length

        let n = get(dp, 'n')
        if (!ispint(n)) {
            throw new Error(`dps[${i}].n is not a positive integer, got ${n}`)
        }

        if (n !== m) {
            throw new Error(`dps[${i}] invariant violated: n[${n}] !== values.length[${m}]`)
        }

    })

}


export default _validateDps
