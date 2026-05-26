import isint from 'wsemi/src/isint.mjs'
import isp0int from 'wsemi/src/isp0int.mjs'
import cint from 'wsemi/src/cint.mjs'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'


function _modifyParameter(ind, iUp, mode = 'mapping') {

    //check ind
    if (!isint(ind)) {
        throw new Error(`ind[${ind}] in not an integer`)
    }
    ind = cint(ind)

    //check iUp
    if (!isp0int(iUp)) {
        throw new Error(`iUp[${iUp}]<0`)
    }
    iUp = cint(iUp)

    //若iUp為0, 代表設計變數僅提供1值, 唯一合法ind即為0
    if (iUp === 0) {
        return 0
    }

    if (mode === 'limit') {
        //指標限制0至iUp
        ind = Math.min(ind, iUp)
        ind = Math.max(ind, 0)
    }
    else if (mode === 'mapping') {
        //指標低於0或超過iUp, 則由另一側重算; 合法ind範圍為[0, iUp], 周期為iUp+1
        let n = iUp + 1
        ind = ((ind % n) + n) % n
    }
    else if (mode === 'random') {
        //指標低於0或超過iUp, 則隨機重產
        if (ind < 0 || ind > iUp) {
            ind = randomIntRange(0, iUp)
        }
    }
    else {
        throw new Error(`invalid mode[${mode}]`)
    }

    return ind
}


export default _modifyParameter
