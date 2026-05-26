//_dynamicValue, 計算動態因子之當前值
//當 dynamic 介於 [-4, 4] 時以指數插值在 start 與 end 之間, 由 iContinue / NContiguous 推進
//- dynamic >  4: 強趨向 start (進度永不離開起點)
//- dynamic < -4: 強趨向 end   (進度立即跳到終點)
//- dynamic =  0: 線性插值
//- |dynamic| 越大, 趨向越陡
//start === end 時直接回 start; NContiguous <= 1 時無進度概念故回 start
function _dynamicValue(start, end, dynamic, iContinue, NContiguous) {

    if (start === end) {
        return start
    }
    if (dynamic < -4) {
        return end
    }
    if (dynamic > 4) {
        return start
    }
    if (NContiguous <= 1) {
        return start
    }

    let rValueNow
    if (dynamic >= 0) {
        rValueNow = Math.pow((iContinue / (NContiguous - 1)), Math.exp(dynamic))
    }
    else {
        rValueNow = 1 - Math.pow(((NContiguous - 1 - iContinue) / (NContiguous - 1)), Math.exp(-dynamic))
    }

    return rValueNow * (end - start) + start
}


export default _dynamicValue
