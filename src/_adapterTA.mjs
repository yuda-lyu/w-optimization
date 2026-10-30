import randomIntRange from 'wsemi/src/randomIntRange.mjs'
import { kNum, kObj, kFit, chkParams } from './_checkParam.mjs'
import { kModeOutLimit } from './_optDecl.mjs'
import { kSchema } from './_validateDps.mjs'
import _modifyParameter from './_modifyParameter.mjs'


//_adapterTA, Threshold Accepting meta-optimizer 工廠
//用於把 TA 機制(單點軌跡 + 門檻接受)作為「**控制器**」接入任意最佳化方法之
//funXxxBefore / funXxxAfter 兩個自適應接口。
//
//演算法對映: 對齊 omlTA 之單點搜尋邏輯(隨機鄰點 + ΔF < threshold 確定性接受)
//streaming 場景採用 Geometric Series 衰減(對齊 omlTA Support 版預設), 不採用 Arithmetic / Trapezoid
//(後兩者需預知總迭代數, 不適合 streaming)
//
//跟 _adapterSA 對比:
//  SA: 惡化機率接受 exp(-ΔF/T), 隨機性
//  TA: 惡化門檻接受 ΔF < threshold, 確定性(同 seed 同結果)
//
//schema: caller 提供, 列出要 adapt 的超參數 (格式同 dps: { name, values })
//
//opt:
//  taThresholdInitial: number, 初始門檻, 預設 1
//                      提示: 門檻應跟 fitness 量級匹配, 例 fitness ≈ 1000 時建議 threshold ≈ 10-100
//  taThresholdRatio:   number, 門檻衰減率 (每代 threshold = ratio · threshold), 預設 0.99
//                      值越小衰減越快; 0.99 平緩, 0.6 快(對齊 omlTA Support 版預設)
//  ModeOutLimit:       string, 'Mapping' / 'Limit' / 'Random', 預設 'Mapping'
//
//API:
//  suggest()                    —抽一組 params 物件
//  feedback(params, fitness)    —TA 接受判定: ΔF < threshold 則接受, 否則拒絕
//  getCurrent()                 —讀目前 current point
//  getBestEver()                —讀歷史最佳
//  getThreshold()               —讀目前門檻值
//  getSchema()                  —讀目前 schema
//
//種類(dspec 輸入參數之檢測機制), 輸入無效時同步 throw Error(訊息格式 `invalid <名稱>: must be <種類描述>`, 不含輸入值):
//  schema                 非空陣列, 元素為一般物件 { name, values }: name 為非空字串且不得重複, values 為非空陣列(候選值, 任意值)
//  opt                    一般物件, undefined 或 null 視為未給; 各鍵給了而不符種類即無效, 不改用預設
//  opt.taThresholdInitial, opt.taThresholdRatio   有效數字(數字字串轉換後使用)
//  opt.ModeOutLimit       列舉字串 'Mapping' / 'Limit' / 'Random'
//  feedback(params, fitness)  params 為一般物件; fitness 為適應函數值(數字或數字字串, 轉換後使用, 另收 +-Infinity 作為懲罰值)
function _adapterTA(schema, opt = {}) {

    //check, 檢測之值即使用之值
    let c = chkParams([[schema, 'schema', kSchema]], opt, {
        taThresholdInitial: [kNum, 1],
        taThresholdRatio: [kNum, 0.99],
        ModeOutLimit: [kModeOutLimit, 'Mapping'],
    })
    if (c.err !== '') {
        throw new Error(c.err)
    }
    let { taThresholdInitial, taThresholdRatio, ModeOutLimit } = c.o

    //Nd = schema 維度數
    let Nd = schema.length

    //state
    let currentThreshold = taThresholdInitial
    let current = {
        ind: schema.map((s) => randomIntRange(0, s.values.length - 1)),
        fitness: null,
    }
    let proposed = null //待 caller feedback 之鄰點 ind 向量
    let bestEver = null

    //indToParams: ind 向量 → params 物件
    let indToParams = (ind) => {
        let params = {}
        schema.forEach((s, i) => {
            params[s.name] = s.values[ind[i]]
        })
        return params
    }

    //pickNeighbor: 從 current.ind 隨機選一個變數 ±1
    let pickNeighbor = () => {
        let ind = [...current.ind]
        let i = randomIntRange(0, Nd - 1)
        let k = (Math.random() < 0.5) ? -1 : 1
        let j = ind[i] + k
        j = _modifyParameter(j, schema[i].values.length - 1, ModeOutLimit)
        ind[i] = j
        return ind
    }

    return {

        //suggest: 第 1 次 yield current; 之後 yield current 之鄰點
        suggest() {
            if (current.fitness === null) {
                proposed = null
                return indToParams(current.ind)
            }
            proposed = pickNeighbor()
            return indToParams(proposed)
        },

        //feedback: ΔF < threshold 接受, 否則拒絕; threshold 每次衰減 ratio
        feedback(params, fitness) {

            //check, 檢測之值即使用之值
            let cf = chkParams([[params, 'params', kObj], [fitness, 'fitness', kFit]])
            if (cf.err !== '') {
                throw new Error(cf.err)
            }
            fitness = cf.vs[1]

            if (proposed === null) {
                //第 1 次: 設 current.fitness
                current.fitness = fitness
                bestEver = { ind: [...current.ind], fitness }
                return
            }

            //TA 門檻接受
            let delta = fitness - current.fitness
            if (delta < currentThreshold) {
                //接受(改善 delta<0 必接受; 惡化 delta<threshold 才接受)
                current = { ind: proposed, fitness }
            }
            //else: 拒絕, current 保持

            //threshold 衰減
            currentThreshold = currentThreshold * taThresholdRatio

            //更新歷史最佳
            if (bestEver.fitness > current.fitness) {
                bestEver = { ind: [...current.ind], fitness: current.fitness }
            }

            proposed = null
        },

        getCurrent: () => ({ ind: [...current.ind], fitness: current.fitness }),
        getBestEver: () => bestEver ? { ind: [...bestEver.ind], fitness: bestEver.fitness } : null,
        getThreshold: () => currentThreshold,
        getSchema: () => schema,
    }
}


export default _adapterTA
