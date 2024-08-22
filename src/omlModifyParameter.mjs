import isint from 'wsemi/src/isint.mjs'
import ispint from 'wsemi/src/ispint.mjs'
import cint from 'wsemi/src/cint.mjs'
import randomIntRange from 'wsemi/src/randomIntRange.mjs'


function omlModifyParameter(ind, iUp, mode = 'mapping') {

    //check ind
    if (!isint(ind)) {
        throw new Error(`ind[${ind}] in not an Integer`)
    }
    ind = cint(ind)

    //check iUp
    if (!ispint(iUp)) {
        throw new Error(`iUp[${iUp}]<=0`)
    }
    iUp = cint(iUp)

    if (mode === 'limit') {
        //指標限制0至iUp
        ind = Math.min(ind, iUp)
        ind = Math.max(ind, 0)
    }
    else if (mode === 'mapping') {
        //指標低於0或超過iUp, 則由另一側重算
        ind = ind % iUp
        if (ind <= 0) {
            ind += iUp
        }
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


export default omlModifyParameter
