import nelderMead from './src/nelderMead.mjs'

async function test() {

    async function fun(params) {
        let x = params[0]
        let y = params[1]
        return Math.sin(y) * x + Math.sin(x) * y + x * x + y * y
    }

    console.log(await nelderMead(fun, [-3.5, 3.5]))
    // => {
    //   count: 130,
    //   y: 5.786322126017525e-19,
    //   x: [ 0.000007191110664735547, -0.00000719035057196422 ]
    // }

}

test()
    .catch((err) => {
        console.log(err)
    })
// {
//   count: 130,
//   y: 5.786322126017525e-19,
//   x: [ 0.000007191110664735547, -0.00000719035057196422 ]
// }

//node --experimental-modules g2.nelderMead.mjs
