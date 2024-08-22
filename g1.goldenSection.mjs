import goldenSection from './src/goldenSection.mjs'

async function test() {

    function fun(param) {
        let x = param / 180 * Math.PI
        return Math.sin(x)
    }

    console.log(await goldenSection(fun, -360, 360))
    // => { count: 56, y: -1, x: -89.99999939558693 }

}

test()
    .catch((err) => {
        console.log(err)
    })

//node --experimental-modules g1.goldenSection.mjs
