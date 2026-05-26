import w from 'wsemi'
import omlTA from './src/omlTA.mjs'


async function test() {

    //2變數例: sin(y)*x + sin(x)*y + x^2 + y^2, 最佳解約於 (0, 0) 附近, fitness ≈ 0
    let dps = [
        { values: w.rang(-5, 5, 200), n: 200 },
        { values: w.rang(-5, 5, 200), n: 200 },
    ]

    async function fun(params) {
        let x = params[0]
        let y = params[1]
        return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
    }

    let r = await omlTA(dps, fun, {
        Nl: 10000,
        NContiguous: 500,
        taThresholdType: 'Geometric Series',
        taThresholdInitial: 5,
    })
    console.log('bestSolution', r.bestSolution)
    console.log('stopMode', r.stopMode)
    console.log('stopNl', r.stopNl)
    console.log('stopExecutions', r.stopExecutions)
    // => bestSolution {
    //   ps: [
    //     { ind: 108, value: 0.3999999999999906 },
    //     { ind: 92, value: -0.40000000000000935 }
    //   ],
    //   fitness: 0.0084653261530796
    // }
    // => stopMode stop by iContinue[500] >= NContiguous[500]
    // => stopNl 669
    // => stopExecutions 671

}

test()
    .catch((err) => {
        console.log(err)
    })

//node g2.omlTA.mjs
