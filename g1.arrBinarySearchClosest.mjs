import arrBinarySearchClosest from './src/arrBinarySearchClosest.mjs'

let arr = [1, 2, 4, 6, 1, 100, 0, 10000, 3]

console.log(arrBinarySearchClosest(arr, 2))
// => { ind: 1, indSorted: 3, value: 2, diff: 0 }

console.log(arrBinarySearchClosest(arr, 4.5))
// => { ind: 2, indSorted: 5, value: 4, diff: 0.5 }

console.log(arrBinarySearchClosest(arr, 5))
// => { ind: 3, indSorted: 6, value: 6, diff: 1 }

//node --experimental-modules g1.arrBinarySearchClosest.mjs
