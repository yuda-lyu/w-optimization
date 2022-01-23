import limitBFGS from './src/limitBFGS.mjs'

async function test() {

    async function fun(params) {
        let x = params[0]
        let y = params[1]
        return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
    }

    //此問題limitBFGS的delta得要設小, 否則無法收斂
    console.log(await limitBFGS(fun, [-3.5, 3.5], { delta: 1e-10 }))
    // => {
    //   count: 106,
    //   y: 7.594659717770574e-15,
    //   x: [ -0.00038851464681463914, 0.0003885146448001209 ]
    // }

}

test()
    .catch((err) => {
        console.log(err)
    })

//node --experimental-modules --es-module-specifier-resolution=node g2.limitBFGS.mjs
