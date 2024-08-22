import get from 'lodash-es/get.js'
import size from 'lodash-es/size.js'
import map from 'lodash-es/map.js'


function omlDefSolution(dps) {

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
        let ind = null

        //value
        let value = null

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


export default omlDefSolution
