import get from 'lodash-es/get.js'
import size from 'lodash-es/size.js'
import map from 'lodash-es/map.js'
import { _defaultRandom } from './_random.mjs'


//R, 隨機取值之統一出口(見 _random.mjs), 未給用預設(同未有 opt.random 之前)
function _genSolution(dps, R = _defaultRandom) {

    //check
    if (size(dps) === 0) {
        throw new Error(`dps is not an effective array`)
    }

    //ps
    let ps = map(dps, (dp) => {

        // //low, up
        // let low = get(dp, 'low', '')
        // let up = get(dp, 'up', '')

        //values
        let values = get(dp, 'values', [])

        //check
        if (size(values) === 0) {
            throw new Error(`dp.values is not an effective array`)
        }

        //n
        let n = get(dp, 'n', 0)

        //check
        if (n <= 0) {
            throw new Error(`n<=0`)
        }

        //ind
        let ind = R.randInt(0, n - 1)

        //value
        let value = values[ind]

        //p
        let p = {
            ind,
            value,
            // low,
            // up,
        }

        return p
    })

    //r
    let r = {
        ps,
        fitness: null,
    }

    return r
}


export default _genSolution
