import cobyla from './src/cobyla.mjs'

async function test() {

    async function fun(params) {
        let x = params[0]
        let y = params[1]
        return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
    }

    console.log(await cobyla(fun, [-3.5, 3.5]))
    // => {
    //   count: 3163,
    //   y: 2.8261772207227327e-7,
    //   x: [ -0.030346528297292275, 0.030342179424102497 ]
    // }

}

test()
    .catch((err) => {
        console.log(err)
    })

//node --experimental-modules --es-module-specifier-resolution=node g2.cobyla.mjs
