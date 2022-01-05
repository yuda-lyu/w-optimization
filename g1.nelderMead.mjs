import nelderMead from './src/nelderMead.mjs'

function fun(params) {
    let x = params[0] / 180 * Math.PI
    return Math.sin(x)
}

console.log(nelderMead(fun, [0]))
// => { y: -1, x: [ -90.0000000000001 ] }

console.log(nelderMead(fun, [87]))
// => { y: -1, x: [ -90.00000057220495 ] }

console.log(nelderMead(fun, [90]))
// => { y: -1, x: [ 270 ] }

//node --experimental-modules --es-module-specifier-resolution=node g1.nelderMead.mjs
