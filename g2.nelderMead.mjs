import nelderMead from './src/nelderMead.mjs'

function fun(params) {
    let x = params[0]
    let y = params[1]
    return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
}

let r = nelderMead(fun, [-3.5, 3.5])
console.log(r)
// => {
//   y: 5.786322126017525e-19,
//   x: [ 0.000007191110664735547, -0.00000719035057196422 ]
// }

//node --experimental-modules --es-module-specifier-resolution=node g2.nelderMead.mjs
