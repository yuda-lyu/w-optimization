import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'


//opt.random 之靜態守門(R1 無殘留): oml 系列、sdm 與其下游輔助不得直接使用 Math.random 或 wsemi 之隨機函數, 一切隨機取值經 src/_random.mjs
//  不含 _adapterACO / _adapterHS / _adapterSA / _adapterTA(另一組入口, 不在 opt.random 之範圍, 仍用 Math.random 與 randomIntRange)

let fdSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

function read(fn) {
    return fs.readFileSync(path.resolve(fdSrc, fn), 'utf8').replace(/\r\n/g, '\n')
}

//去除註解(行註解與區塊註解)
function stripComments(c) {
    return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\/.*$/gm, '')
}

let publics = ['omlSA', 'omlTA', 'omlDE', 'omlRGA', 'omlHS', 'omlPSO', 'omlACO', 'sdm']
let helpers = ['_genSolution', '_randPickNeighbor', '_modifyParameter', '_pickByWeights', '_localSearch', '_defSolution', '_isSameSolution', '_dynamicValue', '_discreteValue', '_validateDps', '_optDecl', '_checkParam']


describe('R-RANDOM site coverage', function() {

    for (let fn of [...publics, ...helpers].map((v) => `${v}.mjs`)) {

        it(`${fn} uses no random source of its own (Math.random, wsemi randomIntRange, randomIntsNdpRange)`, function() {
            let c = stripComments(read(fn))
            assert.strictEqual(c.match(/\bMath\.random\b/g), null, 'Math.random found')
            assert.strictEqual(c.match(/\brandomInts?(Ndp)?Range\b/g), null, 'wsemi random function found')
            assert.strictEqual(c.match(/wsemi\/src\/random/g), null, 'wsemi random import found')
        })

    }

    for (let fn of publics.map((v) => `${v}.mjs`)) {

        it(`${fn} declares opt.random as a function and builds its generator with _makeRandom`, function() {
            let c = stripComments(read(fn))
            assert.ok(/\brandom: \[kFun, undefined\]/.test(c), 'opt.random is not declared with kFun')
            assert.ok(/_makeRandom\(/.test(c), '_makeRandom( not found')
        })

    }

    for (let fn of ['omlDE', 'omlRGA', 'omlHS', 'omlPSO', 'omlACO'].map((v) => `${v}.mjs`)) {

        it(`${fn} passes opt.random on to the local search`, function() {
            let c = stripComments(read(fn))
            assert.ok(/_localSearch\([^\n]*\{ random \}\)/.test(c), '_localSearch is not given { random }')
        })

    }

    it('_random.mjs imports the wsemi random functions for the default (opt.random not given) path', function() {
        let c = stripComments(read('_random.mjs'))
        assert.ok(/from 'wsemi\/src\/randomIntRange\.mjs'/.test(c))
        assert.ok(/from 'wsemi\/src\/randomIntsNdpRange\.mjs'/.test(c))
    })

})
