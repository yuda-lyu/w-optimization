# 規則帳本:R-RANDOM 隨機來源可指定(`opt.random`)

本節記本套件**程式碼須長成什麼樣**:oml 系列(`omlSA`、`omlTA`、`omlDE`、`omlRGA`、`omlHS`、`omlPSO`、`omlACO`)與其局部搜尋所用之 `sdm`,一次呼叫之一切隨機取值之來源可由呼叫端以 `opt.random` 指定,使結果與適應函數被呼叫之序列可重現;未指定時行為不變.當前已做到哪些記於 `sgud/state/state.md`.需求出處:使用端要求(Gitea #211),各取捨已由主控裁定(見〈已知限制與不修〉).

## 共用實作

- **檔案**:`src/_random.mjs`(單一出口 `_makeRandom(random)`,回傳 `{ rand, randInt, randIntsNdp }`;`_defaultRandom` 為未給時之預設).
- **種類**:`opt.random` 為 F1 函數(`kFun`),入口以 `chkParams` 宣告 `random: [kFun, undefined]`;給了而非函數即 `invalid opt.random: must be a function`(reject 字串,不回顯值,先於任何適應函數呼叫);`null`/`undefined` 視為未給.
- **契約**:函數回傳 `[0,1)` 之數字,以零個引數呼叫(同 `Math.random`);回傳值不檢測(同 `funFit` 等回呼之回傳值不檢).
- 入口寫法:

```js
let R = _makeRandom(random)          //random 取自 c.o, 未給為 undefined
let _s = _genSolution(dps, R)        //輔助以最後一個引數收 R
let j = R.randInt(0, n - 1)          //整數 [lo, hi], 含兩端
let u = R.rand()                     //[0,1)
let s = await _localSearch(method, best, dps, funFit, calcFitness, ModeOutLimit, { random })   //局部搜尋之 sdm / omlSA / omlTA 經 opt.random 取得同一產生器
```

## 規則

| 編號 | 規則 |
|---|---|
| R-RANDOM-01 | 8 個入口(7 個 oml 與 `sdm`)皆以 `chkParams` 宣告選配之 `opt.random`(F1 函數);未給(`undefined`/`null`)用預設 |
| R-RANDOM-02 | 給了:該次呼叫內**一切**隨機取值(初始解與初始族群、速度與慣性、親代選擇、交配、突變、和聲即興與音高調整、鄰近解、接受判定、依權重挑選、移民、再搜尋、局部搜尋含巢狀之 `sdm`/`omlSA`/`omlTA`、`ModeOutLimit` 為 `'Random'` 時之指標重產)只經 `_random.mjs` 之 `R`;oml 系列、`sdm` 與其下游輔助之程式碼不得直接出現 `Math.random`、wsemi 之 `randomIntRange`、`randomIntsNdpRange`(靜態守門:`test/unit-random-coverage.test.mjs`) |
| R-RANDOM-03 | 未給:`rand` 於每次呼叫時取 `Math.random`(故呼叫端暫代 `Math.random` 亦生效),`randInt` 為 wsemi 之 `randomIntRange`,`randIntsNdp` 為 wsemi 之 `randomIntsNdpRange`;各處取值之分佈與範圍(含端點是否可取)與未有本規則前相同 |
| R-RANDOM-04 | 給了:`R.randInt(lo, hi)` 之公式同 wsemi `randomIntRange`:`floor(r * (hi - lo + 1) + lo)`,結果大於 `hi` 時鉗制至 `hi`,`lo > hi` 拋同訊息之 Error;`R.randIntsNdp(lo, hi, n)` 為部分 Fisher–Yates(`n` 大於範圍個數時回傳全部) |
| R-RANDOM-05 | 轉傳:`R` 以最後一個引數轉給 `_genSolution`、`_randPickNeighbor`、`_modifyParameter`(省略時用預設,故 adapter 不受影響);`opt.random` 經 `_localSearch` 之 `opt.random` 轉給 `sdm`、`omlSA`、`omlTA`;`_pickByWeights(weights, rnd)` 不取 `R`:`rnd` 由呼叫端經 `R.rand()` 取得,全無正權重時之均勻後備由 `rnd` 換算(`floor(rnd * 個數)`,上端鉗制),不另取亂數 |
| R-RANDOM-06 | 同題、同選項、同一個固定種子之產生器 ⇒ 回傳(`bestSolution`、`hists`、停止原因與代數、`stopExecutions`)與適應函數被呼叫之序列(各次之設計變數取值)逐次相同;不同種子 ⇒ 路徑不同 |

## 站點全集(取值點與轉傳點;以修改版逐點變異,每點改回 1.0.73 原文即有測試轉紅)

| 檔 | 取值或轉傳點數 | 內容 |
|---|---|---|
| `_genSolution.mjs` | 1 | `R.randInt` 取各設計變數之初始指標 |
| `_modifyParameter.mjs` | 1 | `'Random'` 模式越界時 `R.randInt` 重產 |
| `_randPickNeighbor.mjs` | 3 | `R.randInt` 選變數、`R.rand` 選方向、轉傳 `R` 給 `_modifyParameter` |
| `_localSearch.mjs` | 3 | 轉傳 `opt.random` 給 `sdm`(`Neighbor`/`OneGold`/`Gold`)、`omlSA`、`omlTA` |
| `omlPSO.mjs` | 7 | 初始解、初始速度、初始慣性、`rGamma1`、`rGamma2`、位置越界重產、局部搜尋 |
| `omlACO.mjs` | 10 | 開發/探索判定、無費洛蒙時隨機取一點、依費洛蒙權重挑選之 `rnd`、探索時由無費洛蒙清單取一、`_genSolution` ×4(初始、移民、再搜尋、強制探索)、局部搜尋 |
| `omlDE.mjs` | 8 | 初始解、移民、再搜尋、親代排列 `R.randIntsNdp`、必交配變數 `R.randInt`、交配判定 `R.rand`、突變越界重產、局部搜尋 |
| `omlHS.mjs` | 35 | 初始解、移民、再搜尋、記憶體挑選(含不重複挑選)、HMCR/PAR 判定、12 種音高調整、`Available Space` 兩側、全隨機、越界重產、局部搜尋 |
| `omlRGA.mjs` | 38 | 初始解、移民、再搜尋、選擇(不重複挑選、錦標賽、輪盤、排名之 `rnd`)、交配(區間、`Chung`、`Arithmetical`、`Guiding Function` 之 `rnd`、比例疊加類之越界重產)、突變(判定、10 種增量、`Global Space`、越界重產)、局部搜尋 |
| `omlSA.mjs` | 3 | 初始解、鄰近解、接受判定 |
| `omlTA.mjs` | 2 | 初始解、鄰近解 |
| `sdm.mjs` | 3 | 初始解、`sdmNeighbor` 之越界重產(含轉傳 `R`) |

盤點指令(可重跑,預期無輸出:`src` 內除 `_random.mjs` 與 4 個 adapter 外不得有其他命中;JSDoc 與行註解中之字樣以 `grep -v` 略去,`--untracked` 使尚未入版控之新檔亦被掃到):

```
git grep --untracked -n -E "Math\.random|randomIntRange\(|randomIntsNdpRange\(" -- src ":!src/_random.mjs" ":!src/_adapter*.mjs" | grep -v -E ":[0-9]+:\s*(\*|//)"
```

取值點與轉傳點之枚舉(逐點變異之母集;各數字須與下列相符,不符即站點全集已變):`R.rand()` 41、`R.randInt(` 35、`R.randIntsNdp(` 1(合 77 個取值點);轉傳 `, R)` 29(`_genSolution` 17、`_modifyParameter` 9、`_randPickNeighbor` 2、`sdmNeighbor` 1)、`{ random }` 5、`random: opt.random` 3(合 37 個轉傳點);另 `_makeRandom(` 8、`random: [kFun, undefined]` 8、輔助之預設參數 `R = _defaultRandom` 3.

## 測試對應

| 測試檔 | 內容 |
|---|---|
| `test/unit-random-oml.test.mjs` | 7 個 oml 各依「各軸涵蓋設定」(operator 軸每個取值至少一次,另加 `ModeOutLimit: 'Random'` 與各局部搜尋、各交配運算子之交叉、極小設計空間使族群出現重複個體)逐一:固定種子之產生器兩次執行之回傳與適應函數呼叫序列逐次相同、另一種子之路徑不同、暫代 `Math.random` 計數為 0、產生器以零引數呼叫;未給(含 `undefined`、`null`)時 `Math.random` 呼叫數 > 0;`sdm` 直測(含 `'Random'` 越界重產);`omlACO` 適應值恆為 `Infinity`(費洛蒙恆為 0 之分支);8 個入口之 `opt.random` 種類檢測(表驅動輔助),另加假值案(`0`、`''`、`false`、`NaN`、`-0`、`0n` 為給了而非函數,須以固定訊息拒絕且先於任何適應函數呼叫,不得被當作未給) |
| `test/unit-random-helper.test.mjs` | `_makeRandom`(公式、端點、鉗制、均勻性、`lo > hi` 與 `lo === hi`、`randIntsNdp` 之排列全集與 `n` 小於範圍時之逐次取值〔部分 Fisher–Yates〕)與 `_genSolution`、`_modifyParameter`、`_randPickNeighbor`、`_pickByWeights` 之逐點取值次數與結果(腳本化之產生器);未給 `R` 時之預設來源須隨機(多次呼叫之結果相異者達下限,否則預設被改為常數之變異體存活) |
| `test/unit-random-coverage.test.mjs` | 靜態守門:上列檔案不得直接出現 `Math.random`、wsemi 之隨機函數;8 個入口宣告 `random: [kFun, undefined]` 並以 `_makeRandom` 建出口;局部搜尋轉傳 `{ random }` |
| `test/tools/randomKit.mjs` | 共用輔助:`mulberry32`、腳本化與計數之產生器、暫代 `Math.random`、測試題、涵蓋設定 |

## 逐點變異與前後對拍之作法與結果(2026-11-24;腳本不納入套件)

**逐點變異**:於副本(`src` 與新測試三檔)逐一套用單點變異,每個變異體只跑 `unit-random-helper` 與 `unit-random-oml`(動態);存活者再補跑 `unit-random-coverage`(靜態守門).`spawnSync` 加逾時與 `SIGKILL`(逾時視為殺死);mocha 無摘要行(通過數加失敗數為 0)判為未定,不判殺死或存活;錨點不存在或不唯一即失敗;每輪結束核對副本已還原.變異點由腳本依規則掃描 `src` 枚舉,另以獨立之 `Grep` 計數核對(取值點 41/35/1、轉傳點 29/5/3,見上〈盤點指令〉).變異類:

| 類 | 變異 | 數 |
|---|---|---|
| K1 | `R.rand()` → `Math.random()` | 41 |
| K2 | `R.randInt(` → `randomIntRange(`(補回原 import,使變異體等同 1.0.73,不因 `ReferenceError` 假性轉紅) | 35 |
| K3 | `R.randIntsNdp(` → `randomIntsNdpRange(`(同上) | 1 |
| K4 | 刪去輔助之轉傳引數 `, R` | 29 |
| K5 | 刪去 `_localSearch` 呼叫端之 `{ random }` | 5 |
| K6 | 刪去 `_localSearch` 內之 `random: opt.random` | 3 |
| K7 | `_makeRandom(...)` 不給 random | 8 |
| K8 | 刪去入口之 `random: [kFun, undefined]` 宣告 | 8 |
| K9 | 輔助之預設參數 `R = _defaultRandom` 改為常數產生器 | 3 |
| K10 | `_pickByWeights` 全無正權重後備之 6 種改寫(去鉗制、常數、少一個、改用 `Math.random`、取末位、四捨五入) | 6 |
| K11 | `_random.mjs` 內部:公式、鉗制、`lo > hi` 檢查與 `>=`、`Math.min`、偏移、Fisher–Yates 之範圍、交換與迴圈次數、零引數、預設三成員、`null` 視為未給、回傳之三成員 | 37 |

**結果**:共 176 個變異體,**175 個由動態測試殺死**(無一僅靠靜態守門),存活 1 個為**等價變異**(K11:`random === undefined || random === null` 改 `!random`;入口以 `kFun` 檢測後,到 `_makeRandom` 者只有 `undefined`、`null` 與函數,兩種寫法判定相同).首輪(沿用提出端之測試)存活 6 個:K9 三個(預設參數改常數產生器,原測試只驗索引合法)、`randIntsNdp` 迴圈少一次(`n` 小於範圍時末位不取亂數;`omlDE` 之唯一呼叫 `n` 等於範圍個數,故方法層級測不到,須輔助層測試殺)、`lo > hi` 改 `lo >= hi`(`randIntsNdp` 一側,`lo === hi` 時誤拋)、另 1 個等價;已補 `unit-random-helper` 之 3 案(`n` 小於範圍之逐次取值與抽取次數、`lo === hi`、未給時之預設來源須隨機)後,除等價者外全數殺死.

**未給時行為不變之對拍**:兩份 `src`(1.0.73 與修改版)之 wsemi 隨機函數 import 皆改指同一個本地 shim(經 `Math.random`),`Math.random` 以固定種子之產生器替換;7 個 oml 依涵蓋設定(同 `unit-random-oml`)× 3 個種子,另 `sdm`(3 模式 × 3 種 `ModeOutLimit` × 有無 `initSolution` × 3 個種子),共 384 次;每次記適應函數呼叫序列、回傳與 `Math.random` 呼叫數之雜湊.修改版未給、`random: undefined`、`random: null` 三種皆與 1.0.73 逐次相同(0 處不同).工具之鑑別力:於修改版副本植入「多一次取亂數」「少一次取亂數」「改一個數字」(兩處),四者皆被判為不同.

## 已知限制與不修(有理由)

1. **產生器之回傳值不檢測**(主控裁定;`NaN`、負數、`>= 1` 皆不攔):同 `funFit`、`funGenerationBefore` 回傳值不檢之原則(`rulebook_param.md` 已知不修之 1);`R.randInt` 僅鉗制上端至 `hi`(同 wsemi).
2. **同一個產生器勿同時交給多個進行中之呼叫**(呼叫間之取值次序將不確定);適應函數本身須確定性,否則結果仍不可重現.
3. **adapter 工廠**(`_adapterACO`、`_adapterHS`、`_adapterSA`、`_adapterTA`)不納入本規則(主控裁定),仍用 `Math.random` 與 wsemi 之 `randomIntRange`;其共用之 `_modifyParameter`、`_pickByWeights` 以預設運作(行為不變;`_adapterACO` 經 `_pickByWeights` 之全無正權重後備,分佈同).**非死碼、非未完成之預期功能**:它們是 `rulebook_param.md` 之 R-PARAM 站點(21 個入口檔之 4 個,含其 `feedback`),使用方為 25 個套件根範例腳本(`g4.oml*.adapter*.mjs`、`g4.oml*.benchmarkAdapter.mjs`)、20 個 `test/p4.oml*.adapter*.test.mjs`、`test/unit-param-adapters.test.mjs`、README〈Breaking changes〉;`src` 內無其他模組匯入它們,亦不在 `src/WOptimization.mjs` 之匯出內(使用端以 `w-optimization/src/_adapterXXX.mjs` 引入).日後若要讓 adapter 收 `opt.random`:其為同步工廠,取值點約 40 處(含 `Math.random`/`randomIntRange(` 之列:`_adapterACO` 5、`_adapterHS` 31、`_adapterSA` 4、`_adapterTA` 3),可沿用 `_random.mjs`,須另案裁定.
4. **不另收 `opt.seed`**(數字種子加內建產生器;主控裁定):使用端自備產生器(README 有 mulberry32 範例);同種子跨版本是否須同結果之問題因此不存在.
5. **`_pickByWeights` 之全無正權重後備**(僅適應值含 `NaN` 等非常態輸入時走到)由已取得之 `rnd` 換算,不再另取一個隨機整數(主控同意):分佈同(各 index 機率相同),但每次呼叫恆只消耗一個 `rnd`;全無正權重時之空 `weights` 改回 `-1`(原為 `randomIntRange(0, -1)` 拋錯),呼叫端皆保證 `weights` 非空,走不到.
6. **`sdm` 公開收 `opt.random`**(主控裁定;JSDoc 列入):其為局部搜尋(`Neighbor`/`OneGold`/`Gold`)所用,不給 `initSolution` 之初始解與 `ModeOutLimit` 為 `'Random'` 時用到亂數;`OneGold`/`Gold` 之 `sdmGold` 固定用 `'Limit'`,不取亂數.
7. 未給時之整數取值仍經 wsemi 之 `randomIntRange`/`randomIntsNdpRange`(其自有時間種子之偽隨機與 lodash 之 `sampleSize` 不經呼叫當下之 `Math.random`),故未給時僅能以 `opt.random` 確定化,不能靠暫代 `Math.random`.
8. **逐點變異之腳本不納入套件**(主控裁定):腳本依工作區路徑並需另一份含依賴之副本;作法與結果記於下節.
