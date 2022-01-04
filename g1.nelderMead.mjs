import nelderMead from './src/nelderMead.mjs'

function fun(X) {
    let x = X[0]
    let y = X[1]
    return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
}

let r = nelderMead(fun, [-3.5, 3.5])
console.log(r)

//node --experimental-modules --es-module-specifier-resolution=node g1.nelderMead.mjs
