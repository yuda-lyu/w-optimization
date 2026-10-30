import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'


//站點全集之靜態守門(rulebook R-PARAM): 每個入口檔須以 chkParams 宣告參數種類, 且入口檢測不得再使用舊式判定
//  入口 = src/WOptimization.mjs 匯出之函數 + 範例所用之 _adapter* 工廠(規格 §5.2: 未匯出之內部函數不套)

let fdSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

function read(fn) {
    return fs.readFileSync(path.resolve(fdSrc, fn), 'utf8').replace(/\r\n/g, '\n')
}

//去除註解(行註解與區塊註解), 供舊式判定之偵測
function stripComments(c) {
    return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\/.*$/gm, '')
}

let entries = []
let m = read('WOptimization.mjs')
for (let x of m.matchAll(/^import (\w+) from '\.\/(\w+)\.mjs'/gm)) {
    entries.push(x[2] + '.mjs')
}
entries.push('_adapterACO.mjs', '_adapterHS.mjs', '_adapterSA.mjs', '_adapterTA.mjs')

describe('R-PARAM site coverage', function() {

    it('the entry list has 17 exported functions and 4 adapters', function() {
        assert.strictEqual(entries.length, 21)
    })

    for (let fn of entries) {

        it(`${fn} declares its parameter kinds with chkParams`, function() {
            let c = stripComments(read(fn))
            assert.ok(c.indexOf('chkParams(') >= 0, 'chkParams( not found')
        })

        it(`${fn} does not use legacy checks (isnum, ispint, isbol, arrHas, cdbl, cint, isearr) for input`, function() {
            let c = stripComments(read(fn))
            let hit = c.match(/\b(isnum|ispint|isbol|arrHas|cdbl|cint|isearr)\(/g)
            assert.strictEqual(hit, null, `legacy check found: ${hit}`)
        })

    }

})
