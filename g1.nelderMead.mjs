import nelderMead from './src/nelderMead.mjs'

async function test() {

    async function fun(params) {
        let x = params[0] / 180 * Math.PI
        return Math.sin(x)
    }

    console.log(await nelderMead(fun, [0]))
    // => { count: 78, y: -1, x: [ -90.0000000000001 ] }

    console.log(await nelderMead(fun, [87]))
    // => { count: 58, y: -1, x: [ -90.00000057220495 ] }

    console.log(await nelderMead(fun, [90]))
    // => { count: 58, y: -1, x: [ 270 ] }

}

test()
    .catch((err) => {
        console.log(err)
    })
// { count: 78, y: -1, x: [ -90.0000000000001 ] }
// { count: 58, y: -1, x: [ -90.00000057220495 ] }
// { count: 58, y: -1, x: [ 270 ] }

//node --experimental-modules --es-module-specifier-resolution=node g1.nelderMead.mjs
