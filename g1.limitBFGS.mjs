import limitBFGS from './src/limitBFGS.mjs'

async function test() {

    function fun(params) {
        let x = params[0] / 180 * Math.PI
        return Math.sin(x)
    }

    console.log(await limitBFGS(fun, [0]))
    // => { count: 85, y: -1, x: [ -90.00000038876705 ] }

    console.log(await limitBFGS(fun, [87]))
    // => { count: 98, y: -1, x: [ -89.99999967036541 ] }

    console.log(await limitBFGS(fun, [90]))
    // => { count: 2, y: 100000000000000000000, x: null }

}

test()
    .catch((err) => {
        console.log(err)
    })

//node --experimental-modules --es-module-specifier-resolution=node g1.limitBFGS.mjs
