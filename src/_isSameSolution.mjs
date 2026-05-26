import size from 'lodash-es/size.js'


//_isSameSolution, 比對兩個解之ind陣列是否完全相同, 對應VB之AE_Compare
//用於strategyImmigration等場景之重複個體偵測
function _isSameSolution(a, b) {

    let pa = a.ps
    let pb = b.ps

    //check size
    if (size(pa) !== size(pb)) {
        return false
    }

    //逐個ind比對
    for (let i = 0; i < pa.length; i++) {
        if (pa[i].ind !== pb[i].ind) {
            return false
        }
    }

    return true
}


export default _isSameSolution
