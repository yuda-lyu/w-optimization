import cloneDeep from 'lodash-es/cloneDeep.js'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import _modifyParameter from './_modifyParameter.mjs'


//_randPickNeighbor, 從給定解隨機產生鄰點(動一個變數 ±1), 對應VB之AE_SA/TA_RandPickNeighbor
//僅做結構操作, 不計算fitness — 讓caller自行決定要不要重算
//回傳: { ps: 新ps陣列, changed: ind是否真有變動(_modifyParameter後可能未變) }
function _randPickNeighbor(s, dps, ModeOutLimit) {

    //clone當前ps
    let _ps = cloneDeep(s.ps)

    //隨機選一個設計變數
    let i = randomIntRange(0, dps.length - 1)

    //隨機方向 ±1
    let k = (Math.random() < 0.5) ? -1 : 1

    //新ind
    let oldInd = _ps[i].ind
    let j = oldInd + k

    //Limit
    j = _modifyParameter(j, dps[i].n - 1, ModeOutLimit)

    //update
    _ps[i].ind = j
    _ps[i].value = dps[i].values[j]

    return {
        ps: _ps,
        changed: j !== oldInd,
    }
}


export default _randPickNeighbor
