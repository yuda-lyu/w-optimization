//_checkParam, 輸入參數檢測之共用輔助(依 C:\opensrcOper\dspec\輸入參數之檢測機制.md)
//
//wsemi 共用檢測函數(dspec §7)發布後改用之, 屆時本檔刪除; 在此之前全套件之入口只經本檔判定與轉換, 不另寫等價實作
//不用 wsemi 之 isnum / cdbl / cint / isbol 作判定: isnum 收 '0x10' 與 'Infinity', cdbl / cint 對非數字回0, isbol 無效即靜默改預設
//
//種類(dspec §3):
//  N2  有效數字     有限number或數字字串(§3.1), 轉換後只用轉換值(K4); '-'、'NP'、''、null、布林、NaN、Infinity、BigInt、包裝物件皆無效
//      範圍子型     kPnum 正數, kPint 正整數(Number.isSafeInteger, K6)
//  N1  廣義數字     僅用於陣列元素: 同N2, 但非數字字串(標記字串, 含'')原樣保留且不算錯
//  B1  布林         只收true/false
//  F1  函數         typeof為function
//  O1  一般物件     原型為Object.prototype或null
//  S1  非空字串     原始字串且長度大於0
//  S3  列舉字串     宣告之值之一
//
//失敗不拋錯, 回傳 { ok:false, msg }; 訊息格式 `invalid <名稱>: must be <種類描述>`, 不回顯輸入值(dspec §6, K9)
//失敗通道由各入口依函數型態決定(回傳Promise者reject字串, 同步者throw Error)


//數字字串之格式(dspec §3.1): 先去頭尾空白, 十進位寫法, 可帶正負號、小數點、科學記號
const reNumStr = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/


//toNum, 判定N2並轉換, 有效回傳數值, 無效回傳null; 不拋錯, 不呼叫被檢測值之方法
function toNum(v) {
    if (typeof v === 'number') {
        return Number.isFinite(v) ? v : null
    }
    if (typeof v === 'string') {
        let s = v.trim()
        if (!reNumStr.test(s)) {
            return null
        }
        let n = Number(s)
        return Number.isFinite(n) ? n : null
    }
    return null
}


//isPlainObj, 原型為Object.prototype或null
function isPlainObj(v) {
    if (v === null || typeof v !== 'object') {
        return false
    }
    let p = Object.getPrototypeOf(v)
    return p === Object.prototype || p === null
}


//種類宣告
const kNum = { t: 'num', d: 'a valid number' }
const kPnum = { t: 'num', pos: true, d: 'a positive number' }
const kPint = { t: 'num', int: true, pos: true, d: 'a positive integer' }
const kBol = { t: 'bol', d: 'a boolean' }
const kFun = { t: 'fun', d: 'a function' }
const kObj = { t: 'obj', d: 'a plain object' }
const kStr = { t: 'str', d: 'a non-empty string' }

//kEnum, S3列舉字串
function kEnum(list) {
    return { t: 'enum', list, d: `one of ${list.map((v) => `'${v}'`).join(', ')}` }
}

//kNumOr, N2正數或列舉字串
function kNumOr(list) {
    return { t: 'numor', list, d: `a positive number or one of ${list.map((v) => `'${v}'`).join(', ')}` }
}

//kNumArr, 非空陣列且各元素為N2; 元素檢測之名稱帶索引
const kNumArr = { t: 'arr', elem: 'N2', d: 'a non-empty array', de: 'a valid number' }

//kNumArrN1, 陣列且各元素為N1(標記字串原樣保留於原位置), 可為空陣列
const kNumArrN1 = { t: 'arr', elem: 'N1', empty: true, d: 'an array', de: 'a number, numeric string or marker string' }

//kFit, 適應函數值(目標函數之輸出, 非輸入參數): 同N2, 另收+-Infinity(懲罰值); NaN與其餘無效
const kFit = { t: 'fit', d: 'a number or numeric string' }

//kCustom, 自訂檢測: fn(v, name) 回傳 { ok, v, msg }
function kCustom(fn) {
    return { t: 'custom', fn }
}


//chkValue, 單值檢測, 回傳 { ok, v, msg }; v為轉換後之值
function chkValue(v, name, k) {

    let fail = { ok: false, v: undefined, msg: `invalid ${name}: must be ${k.d}` }

    if (k.t === 'num') {
        let n = toNum(v)
        if (n === null) {
            return fail
        }
        if (k.int && !Number.isSafeInteger(n)) {
            return fail
        }
        if (k.pos && !(n > 0)) {
            return fail
        }
        return { ok: true, v: n, msg: '' }
    }

    if (k.t === 'numor') {
        if (typeof v === 'string' && k.list.indexOf(v) >= 0) {
            return { ok: true, v, msg: '' }
        }
        let n = toNum(v)
        if (n === null || !(n > 0)) {
            return fail
        }
        return { ok: true, v: n, msg: '' }
    }

    if (k.t === 'fit') {
        if (v === Infinity || v === -Infinity) {
            return { ok: true, v, msg: '' }
        }
        let n = toNum(v)
        if (n === null) {
            return fail
        }
        return { ok: true, v: n, msg: '' }
    }

    if (k.t === 'bol') {
        if (v === true || v === false) {
            return { ok: true, v, msg: '' }
        }
        return fail
    }

    if (k.t === 'fun') {
        if (typeof v === 'function') {
            return { ok: true, v, msg: '' }
        }
        return fail
    }

    if (k.t === 'obj') {
        if (isPlainObj(v)) {
            return { ok: true, v, msg: '' }
        }
        return fail
    }

    if (k.t === 'str') {
        if (typeof v === 'string' && v.length > 0) {
            return { ok: true, v, msg: '' }
        }
        return fail
    }

    if (k.t === 'enum') {
        if (typeof v === 'string' && k.list.indexOf(v) >= 0) {
            return { ok: true, v, msg: '' }
        }
        return fail
    }

    if (k.t === 'arr') {
        if (!Array.isArray(v) || (!k.empty && v.length === 0)) {
            return fail
        }
        let vs = []
        for (let i = 0; i < v.length; i++) {
            let e = v[i]
            let n = toNum(e)
            if (n !== null) {
                vs.push(n)
            }
            else if (k.elem === 'N1' && typeof e === 'string') {
                vs.push(e) //標記字串原樣保留
            }
            else {
                return { ok: false, v: undefined, msg: `invalid ${name}[${i}]: must be ${k.de}` }
            }
        }
        return { ok: true, v: vs, msg: '' }
    }

    if (k.t === 'custom') {
        return k.fn(v, name)
    }

    throw new Error('unknown kind of parameter')
}


//parseOpt, opt解析, 回傳 { err, o }
//decl: { 鍵: [種類, 預設值] }
//  - opt為undefined或null視為{}, 其餘非一般物件無效
//  - 鍵為undefined或null取預設; 給了而不屬該鍵種類者無效, 不改用預設(K3)
//  - 未宣告之鍵忽略; o為新物件, 只含宣告之鍵, 不改寫呼叫端之opt
//  - 每鍵只讀一次, 讀取拋錯即無效
function parseOpt(opt, decl) {

    if (opt === undefined || opt === null) {
        opt = {}
    }
    else if (!isPlainObj(opt)) {
        return { err: 'invalid opt: must be a plain object', o: null }
    }

    let o = {}
    let keys = Object.keys(decl)
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i]
        let k = decl[key][0]
        let def = decl[key][1]

        let v
        try {
            v = opt[key]
        }
        catch (err) {
            return { err: `invalid opt.${key}: must be readable`, o: null }
        }

        if (v === undefined || v === null) {
            o[key] = def
            continue
        }

        let r = chkValue(v, `opt.${key}`, k)
        if (!r.ok) {
            return { err: r.msg, o: null }
        }
        o[key] = r.v
    }

    return { err: '', o }
}


//chkParams, 一般參數與opt之統一檢測, 回傳 { err, vs, o }
//args: [[值, 名稱, 種類], ...], vs為轉換後之值(與args逐筆對應)
//先檢一般參數(依序), 再檢opt; err為空字串代表通過
function chkParams(args, opt, decl) {

    let vs = []
    for (let i = 0; i < args.length; i++) {
        let r = chkValue(args[i][0], args[i][1], args[i][2])
        if (!r.ok) {
            return { err: r.msg, vs: null, o: null }
        }
        vs.push(r.v)
    }

    if (decl === undefined) {
        return { err: '', vs, o: null }
    }

    let p = parseOpt(opt, decl)
    if (p.err !== '') {
        return { err: p.err, vs: null, o: null }
    }

    return { err: '', vs, o: p.o }
}


export {
    toNum,
    isPlainObj,
    kNum,
    kPnum,
    kPint,
    kBol,
    kFun,
    kObj,
    kStr,
    kEnum,
    kNumOr,
    kNumArr,
    kNumArrN1,
    kFit,
    kCustom,
    chkValue,
    parseOpt,
    chkParams
}
