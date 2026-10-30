import { kNum, kPnum, kPint, kNumOr, kEnum } from './_checkParam.mjs'


//_optDecl, 多個入口共用之 opt 宣告(單一定義, 轉傳之鍵由入口先行檢測, 使無效時不先執行適應函數)
//宣告格式: { 鍵: [種類, 預設值] }, 種類見 _checkParam.mjs


//ModeOutLimit, 設計變數指標超過範圍之處理方式, 列舉字串
const kModeOutLimit = kEnum(['Mapping', 'Limit', 'Random'])


//LocalSearchMethod, 局部搜尋方法, 列舉字串
const kLocalSearchMethod = kEnum(['None', 'Neighbor', 'TA', 'SA', 'OneGold', 'Gold', 'NelderMead'])


//setpBracket 之 opt
//  delta   步長, N2 正數
//  dxR     步長增長比, N2 正數或 'speed'
//  min     搜尋範圍最小值, N2
//  max     搜尋範圍最大值, N2
const declSetpBracket = {
    delta: [kPnum, 0.1],
    dxR: [kNumOr(['speed']), 2],
    min: [kNum, -1e20],
    max: [kNum, 1e20],
}


//goldenSection 之 opt
//  minTolerance   最小收斂門檻值, N2 正數
//  maxIterations  最大迭代次數, N2 正整數
const declGoldenSection = {
    minTolerance: [kPnum, 1e-8],
    maxIterations: [kPint, 100],
}


export {
    kModeOutLimit,
    kLocalSearchMethod,
    declSetpBracket,
    declGoldenSection
}
