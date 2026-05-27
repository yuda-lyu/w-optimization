import w from 'wsemi'
import omlSA from './src/omlSA.mjs'


async function test() {

    //2變數例: sin(y)*x + sin(x)*y + x^2 + y^2, 最佳解約於 (0, 0) 附近, fitness ≈ 0
    let dps = [
        { values: w.rang(-5, 5, 200), n: 201 },
        { values: w.rang(-5, 5, 200), n: 201 },
    ]

    async function fun(params) {
        let x = params[0]
        let y = params[1]
        return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
    }

    let r = await omlSA(dps, fun, {
        Nl: 10000,
        NContiguous: 500,
        saInitialTemperature: 5,
        saAlpha: 0.95,
    })
    console.log('bestSolution', r.bestSolution)
    console.log('stopMode', r.stopMode)
    console.log('stopNl', r.stopNl)
    console.log('stopExecutions', r.stopExecutions)
    // => bestSolution {
    //   ps: [
    //     { ind: 95, value: -0.2500000000000094 },
    //     { ind: 105, value: 0.24999999999999062 }
    //   ],
    //   fitness: 0.0012980203727385453
    // }
    // => stopMode stop by iContinue[500] >= NContiguous[500]
    // => stopNl 935
    // => stopExecutions 937

}

test()
    .catch((err) => {
        console.log(err)
    })

//node g2.omlSA.mjs
