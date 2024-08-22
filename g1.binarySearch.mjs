import binarySearch from './src/binarySearch.mjs'

function fun(param) {
    let x = param / 180 * Math.PI
    return Math.sin(x)
}

console.log(binarySearch(fun, 90, 300))
// => { y: -0.8660254037844386, x: 300 }

console.log(binarySearch(fun, 90, 267))
// => { y: -0.9986295347545739, x: 267 }

console.log(binarySearch(fun, 90, 270))
// => { y: -1, x: 270 }

//node --experimental-modules g1.binarySearch.mjs
