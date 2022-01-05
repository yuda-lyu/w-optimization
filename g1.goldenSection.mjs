import goldenSection from './src/goldenSection.mjs'

function fun(param) {
    let x = param / 180 * Math.PI
    return Math.sin(x)
}

console.log(goldenSection(fun, 0, { min: -360, max: 360 }))
// => { min: -360, max: 0.1 }

console.log(goldenSection(fun, 87, { min: -360, max: 360 }))
// => { min: -360, max: 87.1 }

console.log(goldenSection(fun, 90, { min: -360, max: 360 }))
// => { min: -360, max: 129.66247495978098 }

//node --experimental-modules --es-module-specifier-resolution=node g1.goldenSection.mjs
