import cobyla from './src/cobyla.mjs'

async function test() {

    async function fun(params) {
        let x = params[0] / 180 * Math.PI
        return Math.sin(x)
    }

    console.log(await cobyla(fun, [0]))
    // => { count: 32, y: -1, x: [ -90 ] }

    //rhobeg需給小否則x會跑去較遠的270
    console.log(await cobyla(fun, [87], { rhobeg: 5 }))
    // => { count: 66, y: -0.9999999999999911, x: [ -90.00000762939453 ] }

    console.log(await cobyla(fun, [90]))
    // => { count: 40, y: -1, x: [ 270 ] }

}

test()
    .catch((err) => {
        console.log(err)
    })

//node --experimental-modules --es-module-specifier-resolution=node g1.cobyla.mjs
