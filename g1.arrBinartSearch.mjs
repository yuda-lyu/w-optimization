import arrBinarySearch from './src/arrBinarySearch.mjs'

let arr = [1, 2, 4, 6, 1, 100, 0, 10000, 3]

console.log(arrBinarySearch(arr, 2))
// => { ind: 1, indSorted: 3, value: 2 }

console.log(arrBinarySearch(arr, 5))
// => null

//node --experimental-modules --es-module-specifier-resolution=node g1.arrBinartSearch.mjs
