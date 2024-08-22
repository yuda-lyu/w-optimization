import goldenSectionLiberate from './src/goldenSectionLiberate.mjs'

async function test() {

    function fun(param) {
        let x = param / 180 * Math.PI
        return Math.sin(x)
    }

    console.log(await goldenSectionLiberate(fun, 0))
    // => { count: 67, y: -1, x: -89.99999939787351 }

}

test()
    .catch((err) => {
        console.log(err)
    })

//node --experimental-modules g1.goldenSectionLiberate.mjs
