# 規則帳本:R-PARAM 輸入參數之檢測

上位規格:`C:\opensrcOper\dspec\輸入參數之檢測機制.md`(跨套件規格,草案,2026-10-31 改寫).本節只記本套件**程式碼須長成什麼樣**、站點全集與判準;種類之定義、格式、訊息格式以規格為準,不在此重抄.

本輪(2026-10-31,opt 修正輪)只適用規格中已確定之部分:N2 有效數字與範圍子型、B1 布林、K3~K6、§6 訊息(一律不帶值);§11 之待確認(Q1、Q2)與本套件無關.

## 共用檢測實作

- **檔案**:`src/_checkParam.mjs`(種類判定、轉換、opt 解析、訊息)、`src/_optDecl.mjs`(多入口共用之 opt 宣告與列舉)、`src/_validateDps.mjs`(dps、initSolution、schema 之結構檢測).
- **wsemi 共用檢測函數(dspec §7)尚未存在**:本套件以上述檔案實作,**wsemi 共用檢測函數發布後改用之**(屆時 `_checkParam.mjs` 之 `toNum`、`chkValue`、`parseOpt` 由 wsemi 函數取代,各入口之宣告表保留).
- **不用** wsemi `cdbl`/`cint` 作判定或轉換(非數字回 0),**不用** `isnum`(收 `'0x10'`、`'Infinity'`)、`isbol`(無效即靜默改預設)、`ispint` 作入口判定.
- 入口寫法(單一模式):

```js
let c = chkParams([[fun, 'fun', kFun], [xL, 'xL', kNum]], opt, { minTolerance: [kPnum, 1e-8], ... })
if (c.err !== '') { return Promise.reject(c.err) }   //回傳 Promise 者; 同步者 throw new Error(c.err)
xL = c.vs[1]   //檢測之值即使用之值
```

## 本套件使用之種類(對應規格 §3)

| 本套件之種類 | 規格 | 有效輸入 | 轉換 | 用於 |
|---|---|---|---|---|
| `kNum` | N2 | 有限 number;§3.1 數字字串(頭尾空白、正負號、小數點、科學記號) | 轉為 number,其後只用轉換值 | 端點、初始值、目標值、係數 |
| `kPnum` | N2 正數 | 同 N2 且 > 0 | 同上 | 容差、步長、半徑 |
| `kPint` | N2 正整數 | 同 N2 且為 > 0 之安全整數(K6) | 同上 | 次數、個體數、世代數 |
| `kNumOr(['speed'])` | N2 正數或列舉 | 正數(含數字字串)或列舉字串 | 數字轉換,列舉原樣 | setpBracket 之 `dxR` |
| `kNumArr` | A1,元素 N2 | 非空陣列,每個元素為 N2 | 逐一轉換,回傳新陣列(不改寫輸入) | `params`(初始變數組) |
| `kNumArrN1` | A1,元素 N1 | 陣列(可空),元素為 N2 或標記字串 | 數字轉換,標記字串(任何非數字字串,含 `''`)原樣保留於原位置 | arrBinarySearch(Closest) 之 `arr` |
| `kBol` | B1 | 只收 `true`、`false` | 無 | 開關選項(`'n'`、`'false'`、`1`、`0` 皆無效) |
| `kEnum(list)` | S3 | 宣告之字串之一(分大小寫,不去空白,不收陣列包裝) | 無 | 運算子、模式 |
| `kFun` | F1 | `typeof v === 'function'` | 無 | `fun`、`funFit`、回呼 |
| `kObj` | O1 | 原型為 `Object.prototype` 或 `null` | 無 | `opt`、`params`(adapter feedback) |
| `kStr` | S1 | 非空原始字串 | 無 | schema 之 `name` |
| `kFit` | (本套件特例) | 同 N2,另收 `+Infinity`、`-Infinity` | 同 N2 | 適應函數值:`initSolution.fitness`、adapter `feedback` 之 `fitness` |
| `kDps` | A2 | 非空陣列,元素為一般物件 `{ values: 非空陣列, n: N2 正整數且等於 values.length }` | 回傳新陣列,`n` 已為數值,不改寫呼叫端之 dps | `dps` |
| `kInitSolution` | O1 | `{ ps: 非空陣列, fitness: kFit }` | `fitness` 轉換 | `opt.initSolution` |
| `kSchema` | A2 | 非空陣列,元素 `{ name: S1 且不重複, values: 非空陣列 }` | 無 | adapter 之 `schema` |

**`kFit` 為本套件之特例(決策,見 `sgud/exp/experience.md` 與修正報告)**:適應函數值是**目標函數之輸出**而非一般輸入參數,使用者常以 `Infinity` 作為不可行點之懲罰值,且 `_localSearch` 會把含此值之現解傳給 sdm/omlSA/omlTA 作 `initSolution`;若依 N2 收嚴,最佳化中途會以 `invalid opt.initSolution...` 失敗.故 `kFit` 收 `±Infinity`,其餘(NaN、標記字串、null、布林、BigInt 等)一律無效.

## 規則

| 編號 | 規則 | 規格 |
|---|---|---|
| R-PARAM-01 | 全部入口於函式開頭以 `chkParams` 宣告各參數與 opt 鍵之種類;種類由程式碼宣告,JSDoc 以文字寫明種類與處置 | K1、§8 V23 |
| R-PARAM-02 | 一般參數必給(`undefined` 無效);`opt` 與其各鍵 `undefined`/`null` 視為未給取預設 | K2、V4、V5 |
| R-PARAM-03 | opt 鍵給了而不符種類即無效,**不得靜默改用預設**;未宣告之鍵忽略;不改寫呼叫端之 opt | K3、V7、V9 |
| R-PARAM-04 | 檢測之值即使用之值:數字字串轉換後只用轉換值(端點、初始值、目標值、陣列元素、dps 之 n、initSolution 之 fitness、adapter 之 fitness) | K4 |
| R-PARAM-05 | 布林只收 `true`/`false`;true/false 不當 1/0,1/0 不當 true/false;不支援 BigInt 與超出安全整數之整數 | K5、K6 |
| R-PARAM-06 | 失敗通道:回傳 Promise 者(`goldenSection`、`goldenSectionLiberate`、`setpBracket`、`nelderMead`、`cobyla`、`limitBFGS`、`sdm`、`oml*`)reject **字串**;同步者(`binarySearch`、`arrBinarySearch`、`arrBinarySearchClosest`、`_adapter*` 及其 `feedback`)throw **Error** | §5.1、V16 |
| R-PARAM-07 | 訊息格式 `invalid <名稱>: must be <種類描述>`,名稱為參數名、`opt.<鍵>` 或帶索引;**不回顯輸入值**;跨鍵依賴之訊息(如 `Np` 下限)亦不帶值 | §6、K9、V19、V20 |
| R-PARAM-08 | 全部檢測先於任何副作用(任何適應函數呼叫);轉傳給下游之鍵於本層先檢 | V17、V8 |
| R-PARAM-09 | 標記字串(N1)原樣保留於原位置、不參與運算、不算錯:僅 `arrBinarySearch(Closest)` 之 `arr` 為 N1,`ind` 為原陣列索引 | K8 |
| R-PARAM-10 | 跨鍵依賴不成立而給了即無效:`omlDE` 之 `Np` ≥ `deMutation` 所需,`omlRGA` 之 `Np` ≥ `rgaCrossover` 所需,`omlHS` 與 `_adapterHS` 之 `Ns` ≥ `hsHMC` 所需 | V10 |

## 盤點指令(可重跑)

```
# 站點全集: 每個入口檔須含 chkParams( (預期 21 檔: 17 個匯出函數 + 4 個 adapter)
git grep -c "chkParams(" -- src
# 舊式判定殘留(預期: 僅 _modifyParameter.mjs 之 cint(內部, 已檢測值)與 nelderMead.mjs JSDoc 範例內之 w.isnum/w.cdbl; 入口檢測不得再出現 isnum/ispint/isbol/arrHas/cdbl/cint/isearr)
git grep -n -E "isnum\(|ispint\(|isbol\(|arrHas\(|cdbl\(|cint\(|isearr\(" -- src
# 測試(全套, 鎖由 quiet-run 取得)
node C:/opensrcOper/tools/quiet-run.mjs --lock --name opt -- npm test
# 僅參數檢測
node node_modules/mocha/bin/mocha.js --no-parallel test/unit-param-*.test.mjs --timeout 180000
```

## 判準

- **已套**:入口以 `chkParams` 宣告該參數/鍵,且有對應之測試(`test/unit-param-*.test.mjs`,表驅動,矩陣見下).
- **刻意不套**:內部輔助(`_genSolution`、`_defSolution`、`_discreteValue`、`_dynamicValue`、`_modifyParameter`、`_isSameSolution`、`_pickByWeights`、`_randPickNeighbor`、`_localSearch`;規格 §5.2「未匯出之內部函數」),其輸入皆來自已檢測之值.
- **未套**:無(下列已知不修除外).

### 已知不修(有理由)

1. **回呼之回傳值不檢**:`funFit`/`fun` 之回傳值(目標函數輸出)與 `funGenerationBefore` 回傳之 `{ params }` 覆寫值非入口參數(規格 §1 入口之定義),不檢.後續若要檢,須另定「適應函數值」之失敗處置(中途 reject 或換懲罰值).
2. **`dps[i].values` 之元素為任意值**:設計變數可用值由 `funFit` 自行解讀(可為數字、字串、列舉),不檢;`initSolution.ps` 之元素為本套件內部結構,不逐一檢.
3. **係數類 opt 只收 N2,未加範圍**:`saAlpha`、`deF`、`psoC1`、`hsHMCR`、`acoAlpha`、`rgaMutationRate` 等(語意上多為 [0,1] 或正數)現行演算法未強制範圍,收嚴恐拒絕既有可用設定;日後依演算法定範圍時改宣告表即可.
4. **`binarySearch` 之 `opt.delta`**:讀入後原演算法即未使用(原碼死變數),僅檢測、不使用;屬未完成之預期功能(JSDoc 載有),保留.
5. **範圍外發現(未修)**:`goldenSectionLiberate` 於 `goldenSection` 未收斂回 `null` 時以 `r.count` 取值而 `TypeError`(原碼即如此,與入口參數無關).

## 測試矩陣(規格 §8)

| 軸 | 取值 | 測試檔 |
|---|---|---|
| 數字類 | number、數字字串(頭尾空白、正號、科學記號)、`'-'`、`'NP'`、`''`、空白、`null`、`undefined`、`true`/`false`、`NaN`、`Infinity`、`-Infinity`、`'Infinity'`、`'NaN'`、`'0x10'`、`'0b11'`、`'1,234'`、`'1e999'`、全形數字、BigInt、包裝物件、物件、陣列、函數 | `test/tools/paramMatrix.mjs` 之 `invalidNums`、`numVariants` |
| 正數/正整數 | 另加 `0`、`-1`、`-0`、`'0'`、`'-1'`、`1.5`、`'1.5'`、2^53、`'9007199254740993'` | 同上 |
| 布林 | `true`、`false`、`'y'`、`'n'`、`'true'`、`'false'`、`'TRUE'`、`1`、`0`、`'1'`、`'0'`、`''`、`NaN`、物件、陣列、包裝物件 | 同上 |
| 列舉 | 全部列舉值、`''`、空白、未列之字串、大小寫、前後空白、數字、`true`、陣列包裝、包裝物件 | 同上 |
| 回呼 | 數字、字串、`true`、物件、陣列、包裝物件 | 同上 |
| opt | 非一般物件(字串、數字、`true`、陣列、Map、函數、類別實例);`null`、`{}`、未宣告之鍵、無原型物件取預設;每鍵錯種類、`null`/`undefined` 取預設;讀取拋錯 | 同上、`test/unit-param-checkParam.test.mjs` |
| K4 | 數字字串輸入之結果與數值輸入相同(一般參數、陣列元素、opt 鍵) | `test/unit-param-*.test.mjs` |
| 訊息與通道 | 全文相同、不含輸入值(以 `ZZ-secret-9317` 探測)、Promise 者 reject 字串且不同步 throw、同步者 throw Error、無效時不呼叫適應函數 | `test/tools/paramMatrix.mjs` 之 `assertFail` |

測試檔:`test/unit-param-checkParam.test.mjs`(共用檢測輔助)、`unit-param-search1d`、`unit-param-arrSearch`、`unit-param-multi`、`unit-param-oml`、`unit-param-adapters`(各函數)、`unit-param-coverage`(站點全集之靜態守門:21 個入口檔皆含 `chkParams(` 且無舊式判定).表驅動輔助 `test/tools/paramMatrix.mjs` 另支援 `effect`(選項「給了即生效」:指定值之結果須異於預設)與隨機演算法之退化設計變數(n=1)確定化.

## 站點全集(函數 × 參數 × 種類 × 狀態)

逐格之「改前處置/改後處置」全表見修正報告(`C:\opensrcOper\dnow\20261031010508\agent-out\opt-修正報告.md`);下表為站點全集與狀態,可由 `chkParams(` 之宣告表重跑對照.

| 函數 | 參數 | 種類 | 狀態 |
|---|---|---|---|
| goldenSection | fun | F1 函數 | 已套 |
| goldenSection | xL | N2 有效數字 | 已套 |
| goldenSection | xU | N2 有效數字 | 已套 |
| goldenSection | opt | O1 一般物件 | 已套 |
| goldenSection | opt.minTolerance | N2 正數 | 已套 |
| goldenSection | opt.maxIterations | N2 正整數 | 已套 |
| goldenSectionLiberate | fun | F1 函數 | 已套 |
| goldenSectionLiberate | x | N2 有效數字 | 已套 |
| goldenSectionLiberate | opt | O1 一般物件 | 已套 |
| goldenSectionLiberate | opt.min | N2 有效數字 | 已套 |
| goldenSectionLiberate | opt.max | N2 有效數字 | 已套 |
| goldenSectionLiberate | opt.delta(轉傳 setpBracket) | N2 正數 | 已套 |
| goldenSectionLiberate | opt.dxR(轉傳 setpBracket) | N2 正數或列舉字串 | 已套 |
| goldenSectionLiberate | opt.minTolerance(轉傳 goldenSection) | N2 正數 | 已套 |
| goldenSectionLiberate | opt.maxIterations(轉傳 goldenSection) | N2 正整數 | 已套 |
| setpBracket | fun | F1 函數 | 已套 |
| setpBracket | x | N2 有效數字 | 已套 |
| setpBracket | opt | O1 一般物件 | 已套 |
| setpBracket | opt.delta | N2 正數 | 已套 |
| setpBracket | opt.dxR | N2 正數或列舉字串 | 已套 |
| setpBracket | opt.min | N2 有效數字 | 已套 |
| setpBracket | opt.max | N2 有效數字 | 已套 |
| binarySearch | fun | F1 函數 | 已套 |
| binarySearch | xMin | N2 有效數字 | 已套 |
| binarySearch | xMax | N2 有效數字 | 已套 |
| binarySearch | opt | O1 一般物件 | 已套 |
| binarySearch | opt.delta | N2 正數 | 已套 |
| binarySearch | opt.maxIterations | N2 正整數 | 已套 |
| arrBinarySearch | arr | A1 資料陣列, 元素 N1(廣義數字) | 已套 |
| arrBinarySearch | x | N2 有效數字 | 已套 |
| arrBinarySearch | opt | O1 一般物件 | 已套 |
| arrBinarySearch | opt.sorted | B1 布林 | 已套 |
| arrBinarySearchClosest | arr | A1 資料陣列, 元素 N1(廣義數字) | 已套 |
| arrBinarySearchClosest | x | N2 有效數字 | 已套 |
| arrBinarySearchClosest | opt | O1 一般物件 | 已套 |
| arrBinarySearchClosest | opt.sorted | B1 布林 | 已套 |
| nelderMead | fun | F1 函數 | 已套 |
| nelderMead | params | A1 非空資料陣列, 元素 N2 | 已套 |
| nelderMead | opt | O1 一般物件 | 已套 |
| nelderMead | opt.maxIterations | N2 正整數 | 已套 |
| nelderMead | opt.nonZeroDelta | N2 有效數字 | 已套 |
| nelderMead | opt.delta | N2 正數 | 已套 |
| nelderMead | opt.minErrorDelta | N2 正數 | 已套 |
| nelderMead | opt.minTolerance | N2 正數 | 已套 |
| nelderMead | opt.rho | N2 有效數字 | 已套 |
| nelderMead | opt.chi | N2 有效數字 | 已套 |
| nelderMead | opt.psi | N2 有效數字 | 已套 |
| nelderMead | opt.sigma | N2 有效數字 | 已套 |
| cobyla | fun | F1 函數 | 已套 |
| cobyla | params | A1 非空資料陣列, 元素 N2 | 已套 |
| cobyla | opt | O1 一般物件 | 已套 |
| cobyla | opt.maxIterations | N2 正整數 | 已套 |
| cobyla | opt.rhobeg | N2 正數 | 已套 |
| cobyla | opt.rhoend | N2 正數 | 已套 |
| limitBFGS | fun | F1 函數 | 已套 |
| limitBFGS | params | A1 非空資料陣列, 元素 N2 | 已套 |
| limitBFGS | opt | O1 一般物件 | 已套 |
| limitBFGS | opt.maxIterations | N2 正整數 | 已套 |
| limitBFGS | opt.minTolerance | N2 正數 | 已套 |
| limitBFGS | opt.delta | N2 正數 | 已套 |
| sdm | dps | A2 設計變數陣列 | 已套 |
| sdm | funFit | F1 函數 | 已套 |
| sdm | opt | O1 一般物件 | 已套 |
| sdm | opt.sdmMode | S3 列舉字串 | 已套 |
| sdm | opt.ModeOutLimit | S3 列舉字串 | 已套 |
| sdm | opt.calcFitness | F1 函數 | 已套 |
| sdm | opt.initSolution | O1 一般物件(ps 非空陣列, fitness 適應函數值) | 已套 |
| omlSA | dps | A2 設計變數陣列 | 已套 |
| omlSA | funFit | F1 函數 | 已套 |
| omlSA | opt | O1 一般物件 | 已套 |
| omlSA | opt.Nl | N2 正整數 | 已套 |
| omlSA | opt.NContiguous | N2 正整數 | 已套 |
| omlSA | opt.NCore | N2 正整數 | 已套 |
| omlSA | opt.ModeOutLimit | S3 列舉字串 | 已套 |
| omlSA | opt.saInitialTemperature | N2 有效數字 | 已套 |
| omlSA | opt.saAlpha | N2 有效數字 | 已套 |
| omlSA | opt.UseHists | B1 布林 | 已套 |
| omlSA | opt.funGetBetter | F1 函數 | 已套 |
| omlSA | opt.funEndLoop | F1 函數 | 已套 |
| omlSA | opt.calcFitness | F1 函數 | 已套 |
| omlSA | opt.initSolution | O1 一般物件(ps 非空陣列, fitness 適應函數值) | 已套 |
| omlTA | dps | A2 設計變數陣列 | 已套 |
| omlTA | funFit | F1 函數 | 已套 |
| omlTA | opt | O1 一般物件 | 已套 |
| omlTA | opt.Nl | N2 正整數 | 已套 |
| omlTA | opt.NContiguous | N2 正整數 | 已套 |
| omlTA | opt.NCore | N2 正整數 | 已套 |
| omlTA | opt.ModeOutLimit | S3 列舉字串 | 已套 |
| omlTA | opt.taThresholdType | S3 列舉字串 | 已套 |
| omlTA | opt.taThresholdInitial | N2 有效數字 | 已套 |
| omlTA | opt.UseHists | B1 布林 | 已套 |
| omlTA | opt.funGetBetter | F1 函數 | 已套 |
| omlTA | opt.funEndLoop | F1 函數 | 已套 |
| omlTA | opt.calcFitness | F1 函數 | 已套 |
| omlTA | opt.initSolution | O1 一般物件(ps 非空陣列, fitness 適應函數值) | 已套 |
| omlDE | dps | A2 設計變數陣列 | 已套 |
| omlDE | funFit | F1 函數 | 已套 |
| omlDE | opt | O1 一般物件 | 已套 |
| omlDE | opt.Ng | N2 正整數 | 已套 |
| omlDE | opt.Np | N2 正整數 | 已套 |
| omlDE | opt.NContiguous | N2 正整數 | 已套 |
| omlDE | opt.NRepeat | N2 正整數 | 已套 |
| omlDE | opt.NCore | N2 正整數 | 已套 |
| omlDE | opt.Np 下限 | 跨鍵: Np ≥ deMutation 所需 | 已套 |
| omlDE | opt.ModeOutLimit | S3 列舉字串 | 已套 |
| omlDE | opt.UseRepeat | B1 布林 | 已套 |
| omlDE | opt.UseImmigration | B1 布林 | 已套 |
| omlDE | opt.LocalSearchMethod | S3 列舉字串 | 已套 |
| omlDE | opt.funGetBetter | F1 函數 | 已套 |
| omlDE | opt.funGenerationBefore | F1 函數 | 已套 |
| omlDE | opt.funGenerationAfter | F1 函數 | 已套 |
| omlDE | opt.deCrossoverFactorStart | N2 有效數字 | 已套 |
| omlDE | opt.deCrossoverFactorEnd | N2 有效數字 | 已套 |
| omlDE | opt.deCrossoverFactorDynamic | N2 有效數字 | 已套 |
| omlDE | opt.deFStart | N2 有效數字 | 已套 |
| omlDE | opt.deFEnd | N2 有效數字 | 已套 |
| omlDE | opt.deFDynamic | N2 有效數字 | 已套 |
| omlDE | opt.deLandaStart | N2 有效數字 | 已套 |
| omlDE | opt.deLandaEnd | N2 有效數字 | 已套 |
| omlDE | opt.deLandaDynamic | N2 有效數字 | 已套 |
| omlDE | opt.deMutation | S3 列舉字串 | 已套 |
| omlRGA | dps | A2 設計變數陣列 | 已套 |
| omlRGA | funFit | F1 函數 | 已套 |
| omlRGA | opt | O1 一般物件 | 已套 |
| omlRGA | opt.Ng | N2 正整數 | 已套 |
| omlRGA | opt.Np | N2 正整數 | 已套 |
| omlRGA | opt.NContiguous | N2 正整數 | 已套 |
| omlRGA | opt.NRepeat | N2 正整數 | 已套 |
| omlRGA | opt.NCore | N2 正整數 | 已套 |
| omlRGA | opt.Np 下限 | 跨鍵: Np ≥ rgaCrossover 所需 | 已套 |
| omlRGA | opt.ModeOutLimit | S3 列舉字串 | 已套 |
| omlRGA | opt.UseRepeat | B1 布林 | 已套 |
| omlRGA | opt.UseImmigration | B1 布林 | 已套 |
| omlRGA | opt.LocalSearchMethod | S3 列舉字串 | 已套 |
| omlRGA | opt.funGetBetter | F1 函數 | 已套 |
| omlRGA | opt.funGenerationBefore | F1 函數 | 已套 |
| omlRGA | opt.funGenerationAfter | F1 函數 | 已套 |
| omlRGA | opt.rgaMutationRateStart | N2 有效數字 | 已套 |
| omlRGA | opt.rgaMutationRateEnd | N2 有效數字 | 已套 |
| omlRGA | opt.rgaMutationRateDynamic | N2 有效數字 | 已套 |
| omlRGA | opt.rgaSelection | S3 列舉字串 | 已套 |
| omlRGA | opt.rgaCrossover | S3 列舉字串 | 已套 |
| omlRGA | opt.rgaMutation | S3 列舉字串 | 已套 |
| omlRGA | opt.rgaElitism | S3 列舉字串 | 已套 |
| omlHS | dps | A2 設計變數陣列 | 已套 |
| omlHS | funFit | F1 函數 | 已套 |
| omlHS | opt | O1 一般物件 | 已套 |
| omlHS | opt.Ni | N2 正整數 | 已套 |
| omlHS | opt.Ns | N2 正整數 | 已套 |
| omlHS | opt.NContiguous | N2 正整數 | 已套 |
| omlHS | opt.NRepeat | N2 正整數 | 已套 |
| omlHS | opt.NCore | N2 正整數 | 已套 |
| omlHS | opt.Ns 下限 | 跨鍵: Ns ≥ hsHMC 所需 | 已套 |
| omlHS | opt.ModeOutLimit | S3 列舉字串 | 已套 |
| omlHS | opt.UseRepeat | B1 布林 | 已套 |
| omlHS | opt.UseImmigration | B1 布林 | 已套 |
| omlHS | opt.LocalSearchMethod | S3 列舉字串 | 已套 |
| omlHS | opt.funGetBetter | F1 函數 | 已套 |
| omlHS | opt.funGenerationBefore | F1 函數 | 已套 |
| omlHS | opt.funGenerationAfter | F1 函數 | 已套 |
| omlHS | opt.hsHMCRStart | N2 有效數字 | 已套 |
| omlHS | opt.hsHMCREnd | N2 有效數字 | 已套 |
| omlHS | opt.hsHMCRDynamic | N2 有效數字 | 已套 |
| omlHS | opt.hsPARStart | N2 有效數字 | 已套 |
| omlHS | opt.hsPAREnd | N2 有效數字 | 已套 |
| omlHS | opt.hsPARDynamic | N2 有效數字 | 已套 |
| omlHS | opt.hsHMC | S3 列舉字串 | 已套 |
| omlHS | opt.hsPA | S3 列舉字串 | 已套 |
| omlPSO | dps | A2 設計變數陣列 | 已套 |
| omlPSO | funFit | F1 函數 | 已套 |
| omlPSO | opt | O1 一般物件 | 已套 |
| omlPSO | opt.Nl | N2 正整數 | 已套 |
| omlPSO | opt.Np | N2 正整數 | 已套 |
| omlPSO | opt.NContiguous | N2 正整數 | 已套 |
| omlPSO | opt.NRepeat | N2 正整數 | 已套 |
| omlPSO | opt.NCore | N2 正整數 | 已套 |
| omlPSO | opt.ModeOutLimit | S3 列舉字串 | 已套 |
| omlPSO | opt.UseRepeat | B1 布林 | 已套 |
| omlPSO | opt.UseImmigration | B1 布林 | 已套 |
| omlPSO | opt.LocalSearchMethod | S3 列舉字串 | 已套 |
| omlPSO | opt.funGetBetter | F1 函數 | 已套 |
| omlPSO | opt.funEndLoop | F1 函數 | 已套 |
| omlPSO | opt.funGenerationBefore | F1 函數 | 已套 |
| omlPSO | opt.funGenerationAfter | F1 函數 | 已套 |
| omlPSO | opt.psoC1Start | N2 有效數字 | 已套 |
| omlPSO | opt.psoC1End | N2 有效數字 | 已套 |
| omlPSO | opt.psoC1Dynamic | N2 有效數字 | 已套 |
| omlPSO | opt.psoC2Start | N2 有效數字 | 已套 |
| omlPSO | opt.psoC2End | N2 有效數字 | 已套 |
| omlPSO | opt.psoC2Dynamic | N2 有效數字 | 已套 |
| omlPSO | opt.psoBeta | N2 有效數字 | 已套 |
| omlPSO | opt.psoGamma | N2 有效數字 | 已套 |
| omlPSO | opt.psoInertiaMin | N2 有效數字 | 已套 |
| omlACO | dps | A2 設計變數陣列 | 已套 |
| omlACO | funFit | F1 函數 | 已套 |
| omlACO | opt | O1 一般物件 | 已套 |
| omlACO | opt.Nl | N2 正整數 | 已套 |
| omlACO | opt.Na | N2 正整數 | 已套 |
| omlACO | opt.NContiguous | N2 正整數 | 已套 |
| omlACO | opt.NRepeat | N2 正整數 | 已套 |
| omlACO | opt.NCore | N2 正整數 | 已套 |
| omlACO | opt.ModeOutLimit | S3 列舉字串 | 已套 |
| omlACO | opt.UseForcedExplore | B1 布林 | 已套 |
| omlACO | opt.UseRepeat | B1 布林 | 已套 |
| omlACO | opt.UseImmigration | B1 布林 | 已套 |
| omlACO | opt.LocalSearchMethod | S3 列舉字串 | 已套 |
| omlACO | opt.funGetBetter | F1 函數 | 已套 |
| omlACO | opt.funEndLoop | F1 函數 | 已套 |
| omlACO | opt.funGenerationBefore | F1 函數 | 已套 |
| omlACO | opt.funGenerationAfter | F1 函數 | 已套 |
| omlACO | opt.acoExploitationRateStart | N2 有效數字 | 已套 |
| omlACO | opt.acoExploitationRateEnd | N2 有效數字 | 已套 |
| omlACO | opt.acoExploitationRateDynamic | N2 有效數字 | 已套 |
| omlACO | opt.acoAlphaStart | N2 有效數字 | 已套 |
| omlACO | opt.acoAlphaEnd | N2 有效數字 | 已套 |
| omlACO | opt.acoAlphaDynamic | N2 有效數字 | 已套 |
| omlACO | opt.acoRoStart | N2 有效數字 | 已套 |
| omlACO | opt.acoRoEnd | N2 有效數字 | 已套 |
| omlACO | opt.acoRoDynamic | N2 有效數字 | 已套 |
| _adapterACO | schema | A2 [{name, values}] | 已套 |
| _adapterACO | opt | O1 一般物件 | 已套 |
| _adapterACO | opt.acoExploitationRate | N2 有效數字 | 已套 |
| _adapterACO | opt.acoAlpha | N2 有效數字 | 已套 |
| _adapterACO.feedback | params | O1 一般物件 | 已套 |
| _adapterACO.feedback | fitness | 適應函數值(N2 另收 ±Infinity) | 已套 |
| _adapterSA | schema | A2 [{name, values}] | 已套 |
| _adapterSA | opt | O1 一般物件 | 已套 |
| _adapterSA | opt.saInitialTemperature | N2 有效數字 | 已套 |
| _adapterSA | opt.saAlpha | N2 有效數字 | 已套 |
| _adapterSA | opt.ModeOutLimit | S3 列舉字串 | 已套 |
| _adapterSA.feedback | params | O1 一般物件 | 已套 |
| _adapterSA.feedback | fitness | 適應函數值(N2 另收 ±Infinity) | 已套 |
| _adapterTA | schema | A2 [{name, values}] | 已套 |
| _adapterTA | opt | O1 一般物件 | 已套 |
| _adapterTA | opt.taThresholdInitial | N2 有效數字 | 已套 |
| _adapterTA | opt.taThresholdRatio | N2 有效數字 | 已套 |
| _adapterTA | opt.ModeOutLimit | S3 列舉字串 | 已套 |
| _adapterTA.feedback | params | O1 一般物件 | 已套 |
| _adapterTA.feedback | fitness | 適應函數值(N2 另收 ±Infinity) | 已套 |
| _adapterHS | schema | A2 [{name, values}] | 已套 |
| _adapterHS | opt | O1 一般物件 | 已套 |
| _adapterHS | opt.Ns | N2 正整數 | 已套 |
| _adapterHS | opt.hsHMCR | N2 有效數字 | 已套 |
| _adapterHS | opt.hsPAR | N2 有效數字 | 已套 |
| _adapterHS | opt.hsHMC | S3 列舉字串 | 已套 |
| _adapterHS | opt.hsPA | S3 列舉字串 | 已套 |
| _adapterHS | opt.ModeOutLimit | S3 列舉字串 | 已套 |
| _adapterHS | opt.Ns 下限 | 跨鍵: Ns ≥ hsHMC 所需 | 已套 |
| _adapterHS.feedback | params | O1 一般物件 | 已套 |
| _adapterHS.feedback | fitness | 適應函數值(N2 另收 ±Infinity) | 已套 |

內部輔助(刻意不套): _validateDps、_localSearch、_genSolution、_defSolution、_discreteValue、_dynamicValue、_modifyParameter、_isSameSolution、_pickByWeights、_randPickNeighbor、_class、WOptimization

