import get from 'lodash-es/get.js'
import size from 'lodash-es/size.js'
import each from 'lodash-es/each.js'


function omlDiscreteValue(value, i, dps) {

    //check
    if (size(dps) === 0) {
        throw new Error(`dps is not an effective array`)
    }

    //dp
    let dp = get(dps, i)

    //values
    let values = get(dp, 'values', [])

    //查找最接近value的dp資訊
    let _ind = null
    let _value = null
    let diff = 1e20
    each(values, (v, k) => {
        let d = value - v
        d = Math.abs(d)
        if (d < diff) {
            d = diff
            _ind = k
            _value = v
        }
    })

    //r
    let r = {
        ind: _ind,
        value: _value,
    }

    return r
}


export default omlDiscreteValue
