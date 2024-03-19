import get from 'lodash-es/get'
import each from 'lodash-es/each'
import map from 'lodash-es/map'
import size from 'lodash-es/size'
import times from 'lodash-es/times'
import random from 'lodash-es/random'
import range from 'lodash-es/range'
import cdbl from 'wsemi/src/cdbl.mjs'


function rnd(min = 0, max = 1) {
    return random(min, max, true)
}


function rndint(min, max) {
    return random(min, max)
}


function rangeint(min, max) {
    return range(min, max + 1)
}


function getDynValue(dyn, vs, ve, Nc, c) {
    let r = null
    if (vs === ve) {
        r = vs
    }
    else if (dyn < -4) {
        r = ve
    }
    else if (dyn > 4) {
        r = vs
    }
    else {
        if (Nc > 1) {
            let t
            if (dyn >= 0) {
                t = (cdbl(c) / cdbl(Nc - 1)) ** Math.exp(dyn)
            }
            else {
                t = 1 - (cdbl(Nc - 1 - c) / cdbl(Nc - 1)) ** Math.exp(-dyn)
            }
            r = t * (ve - vs) + vs
        }
        else {
            r = vs
        }
    }
    return r
}


function deGenChild3P(kind, Np, Nd) {

    //ir1, ir2, ir3
    let ir1
    let ir2
    let ir3
    if (kind === '1R2RR') {
        ir1 = rndint(1, Np)
        ir2 = rndint(1, Np)
        ir3 = rndint(1, Np)
    }
    else if (kind === '1B2RR') {
        ir1 = 1
        ir2 = rndint(1, Np)
        ir3 = rndint(1, Np)
    }
    else if (kind === '1R2BR') {
        ir1 = rndint(1, Np)
        ir2 = 1
        ir3 = rndint(1, Np)
    }
    else {
        throw new Error(`invalid kind[${kind}]`)
    }

    //kRand
    let kRand = rndint(1, Nd)

    for (let k = 1; k <= Nd; k++) {

        //Crossover
        if (rnd() < CrossoverFactor || k === kRand) {

            //Mutation
            // let vk=

            //     ' Mutation
            //     ' New Index
            //     j = NInt(parents(ir1).algIndex(i) + sDE.deSettings.deF * (parents(ir2).algIndex(i) - parents(ir3).algIndex(i)))


            //     ' Limit
            //     j = AE_ModifyParameter(j, sDE.deDPS.algDPI(i).algCorrespondingArrayN, sDE.deSettings.deOutofLimit)


            //     ' Parameter
            //     AE_DE_Scheme_3P.algIndex(i) = j
            //     AE_DE_Scheme_3P.algParameter(i) = sDE.deDPS.algDPI(i).algCorrespondingArray(j)

        }
        else {

            //     ' Parameter
            //     AE_DE_Scheme_3P.algIndex(i) = parents(k).algIndex(i)
            //     AE_DE_Scheme_3P.algParameter(i) = parents(k).algParameter(i)

        }

    }


}

function de(opt = {}) {

    //總世代數Ng
    let Ng = get(opt, 'Ng', 2)

    //最佳解連續未更新次數Nc
    let Nc = get(opt, 'Nc', 2)

    //最大再搜尋次數Nr
    let Nr = get(opt, 'Nr', 2)

    //最大核心次數Nw
    let Nw = get(opt, 'Nw', 10)

    //族群個體數Np
    let Np = get(opt, 'Np', 10)

    //設計變數數量Nd
    let Nd = get(opt, 'Nd', 10)

    //各設計變數設定物件陣列, 長度為Nd
    let xs = get(opt, 'xs', [])

    //check
    if (size(xs) !== Nd) {
        throw new Error('xs長度不等於Nd')
    }

    let i //現在世代數
    let c = 0 //現在連續世代數
    let e = 0 //現在再搜尋次數

    let CrossoverFactor //交配因子, 0~1
    let CrossoverFactorDynamic //動態交配因子, -4~4
    let CrossoverFactorStart //初始交配因子
    let CrossoverFactorEnd //最終交配因子

    let F //縮放因子, 0~2
    let FDynamic //動態縮放因子, -4~4
    let FStart //初始縮放因子
    let FEnd //最終縮放因子

    let Landa //線性疊加率, 0~1
    let LandaDynamic //動態線性疊加率, -4~4
    let LandaStart //初始線性疊加率
    let LandaEnd //最終線性疊加率

    let parents = []
    let children = []
    each(times(Np), (j) => {

    })
    for (let j = 1; j <= Np; j++) {
        for (let k = 0; k < Nd; k++) {

        }
        parents.push({
            // ind:null,
            vx: [],
        })
    }


    for (i = 1; i <= Ng; i++) {

        //CrossoverFactor
        CrossoverFactor = getDynValue(CrossoverFactorDynamic, CrossoverFactorStart, CrossoverFactorEnd, Nc, c)

        //F
        F = getDynValue(FDynamic, FStart, FEnd, Nc, c)

        //Landa
        Landa = getDynValue(LandaDynamic, LandaStart, LandaEnd, Nc, c)

    }


}


export default de
