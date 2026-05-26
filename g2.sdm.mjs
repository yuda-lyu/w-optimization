import w from 'wsemi'
import sdm from './src/sdm.mjs'


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

    let r

    //Neighbor: 對每變數試 ±1 選最大改善方向
    r = await sdm(dps, fun, { sdmMode: 'Neighbor' })
    // console.log('[Neighbor] bestSolution', r1.bestSolution, 'stopExecutions', r1.stopExecutions)
    console.log('[Neighbor] bestSolution', r.bestSolution)
    console.log('[Neighbor] stopExecutions', r.stopExecutions)
    // => [Neighbor] bestSolution {
    //   ps: [
    //     { ind: 100, value: -9.395262345890387e-15 },
    //     { ind: 100, value: -9.395262345890387e-15 }
    //   ],
    //   fitness: 3.5308381819242297e-28
    // }
    // => [Neighbor] stopExecutions 152

    //OneGold: 做一次梯度+黃金比例搜尋
    r = await sdm(dps, fun, { sdmMode: 'OneGold' })
    console.log('[OneGold]  bestSolution', r.bestSolution)
    console.log('[OneGold]  stopExecutions', r.stopExecutions)
    // => [OneGold]  bestSolution {
    //   ps: [
    //     { ind: 183, value: 4.149999999999984 },
    //     { ind: 73, value: -1.35000000000001 }
    //   ],
    //   fitness: 16.137826061471117
    // }
    // => [OneGold]  stopExecutions 10

    //Gold: 重複 OneGold 直到無改善
    r = await sdm(dps, fun, { sdmMode: 'Gold' })
    console.log('[Gold] bestSolution', r.bestSolution)
    console.log('[Gold] stopExecutions', r.stopExecutions)
    // => [Gold] bestSolution {
    //   ps: [
    //     { ind: 94, value: -0.30000000000000937 },
    //     { ind: 106, value: 0.2999999999999906 }
    //   ],
    //   fitness: 0.0026878760031962406
    // }
    // => [Gold] stopExecutions 45

}

test()
    .catch((err) => {
        console.log(err)
    })

//node g2.sdm.mjs
