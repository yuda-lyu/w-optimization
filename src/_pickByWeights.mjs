import randomIntRange from 'wsemi/src/randomIntRange.mjs'


//_pickByWeights, 加權挑選, 對應f90之ME_NonUniformPick
//僅累計weight>0之位置(負/零權重一律跳過, 對齊f90); 全無正權重時silent退到均勻隨機
//用於Roulette Selection / Ranking Selection / Guiding Function / ACO Exploitation等加權抽樣場景
function _pickByWeights(weights, rnd) {

    //對齊f90: 僅累計正權重
    let total = 0
    for (let w of weights) {
        if (w > 0) {
            total += w
        }
    }

    //全為非正權重之silent fallback(f90是回-1錯誤訊號, JS取silent較不會中斷演化)
    if (total <= 0) {
        return randomIntRange(0, weights.length - 1)
    }

    //累進inverse-CDF比對, 等同f90之半開區間[cum[j], cum[j+1])
    let r = rnd * total
    let acc = 0
    for (let i = 0; i < weights.length; i++) {
        if (weights[i] > 0) {
            acc += weights[i]
            if (r < acc) {
                return i
            }
        }
    }
    return weights.length - 1
}


export default _pickByWeights
