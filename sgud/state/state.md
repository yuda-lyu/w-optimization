# 現況

本檔記當前已開發功能之最新狀態(各功能做到哪裡、對應之規則帳本條目與測試檔、已知缺口與待辦、最近一次驗證或發布之版本),只記現況、不寫過程(過程寫入 `sgud/exp/experience.md`).規則帳本為藍圖、本檔為現況,兩者比對即知尚未做到者.過長時依功能類型拆為 `state_<類型>.md`,本檔只留索引.

## 輸入參數之檢測(R-PARAM)

- **範圍**:17 個匯出函數(`arrBinarySearch`、`arrBinarySearchClosest`、`binarySearch`、`cobyla`、`goldenSection`、`goldenSectionLiberate`、`limitBFGS`、`nelderMead`、`setpBracket`、`sdm`、`omlSA`、`omlTA`、`omlDE`、`omlRGA`、`omlHS`、`omlPSO`、`omlACO`)與 4 個 adapter 工廠(`_adapterACO`、`_adapterHS`、`_adapterSA`、`_adapterTA`,含其 `feedback`)之一般參數與 opt 全部已套(站點全集 258 列見 `sgud/rule/rulebook_param.md`,其中 8 列為 `opt.random`,見下節).
- **做到哪裡**:
  - 種類由程式碼以 `chkParams` 宣告(`src/_checkParam.mjs`、`src/_optDecl.mjs`、`src/_validateDps.mjs`);數字字串轉換後只用轉換值;opt 給了而無效即報錯,不改用預設;失敗通道依函數型態(Promise 者 reject 字串、同步者 throw Error);訊息不帶輸入值.
  - 規格:跨套件規格〈輸入參數之檢測機制〉(草案);本套件只適用已確定之部分(N2、範圍子型、B1、K3~K6、§6).
- **對應規則帳本**:`sgud/rule/rulebook_param.md`(R-PARAM-01~10).
- **對應測試**:`test/unit-param-checkParam.test.mjs`、`unit-param-search1d`、`unit-param-arrSearch`、`unit-param-multi`、`unit-param-oml`、`unit-param-adapters`、`unit-param-coverage`(表驅動輔助 `test/tools/paramMatrix.mjs`).
- **對外行為變化**:見 README〈Breaking changes〉(原本靜默改用預設或回奇怪結果者,現在報錯;`version` 未改,發布由主控處理).

### 已知缺口與待辦

- wsemi 共用檢測函數(dspec §7)發布後,`src/_checkParam.mjs` 之 `toNum`/`chkValue`/`parseOpt` 改用之(宣告表保留).
- 已知不修(理由見規則帳本):回呼回傳值不檢(`funFit` 輸出、`funGenerationBefore` 回傳之覆寫值)、`dps[i].values` 元素為任意值、係數類 opt 只收 N2 未加範圍、`binarySearch` 之 `opt.delta` 未被演算法使用.
- 範圍外發現(未修):`goldenSectionLiberate` 於 `goldenSection` 未收斂回 `null` 時 `TypeError`.

### 最近一次驗證

- 2026-10-31:`npm test`(`quiet-run --lock`)639 passing、0 failing(52 個測試檔,其中新增 `unit-param-*` 7 檔共 579 項);`eslint src test` 無錯誤;範例 g1~g4(29 個,含 omlDE 之四種 adapter)執行無 `invalid` 報錯.
- 變異測試:60 個變異體,被殺 55、存活 5(皆為等價變異或預設值變動,分析見修正報告第 5 節).
- `package.json` 之 `version` 為 1.0.43(本輪未改).

## 隨機來源可指定(R-RANDOM,`opt.random`)

- **範圍**:7 個 oml(`omlSA`、`omlTA`、`omlDE`、`omlRGA`、`omlHS`、`omlPSO`、`omlACO`)與局部搜尋所用之 `sdm` 各收選配之 `opt.random`(回傳 `[0,1)` 之函數);給了則該次呼叫之一切隨機取值(含局部搜尋內巢狀之 `sdm`/`omlSA`/`omlTA`、`ModeOutLimit` 為 `'Random'` 之越界重產、依權重挑選)只經它,結果與適應函數被呼叫之序列可重現;未給(`undefined`/`null`)行為不變.4 個 adapter 工廠不在範圍(仍用 `Math.random`).
- **做到哪裡**:`src/_random.mjs` 為單一出口;各入口以 `random: [kFun, undefined]` 宣告並以 `_makeRandom(random)` 建出口 `R`;輔助(`_genSolution`、`_randPickNeighbor`、`_modifyParameter`)以最後引數收 `R`(省略即預設),`_localSearch` 以 `{ random }` 轉給 `sdm`/`omlSA`/`omlTA`;`_pickByWeights` 之全無正權重後備改由已取得之 `rnd` 換算(分佈同).README 已補〈oml*〉一節(用法、選項、可重現之範例).
- **對應規則帳本**:`sgud/rule/rulebook_random.md`(R-RANDOM-01~06;站點全集、測試對應、已知限制).
- **對應測試**:`test/unit-random-oml.test.mjs`、`unit-random-helper.test.mjs`、`unit-random-coverage.test.mjs`(輔助 `test/tools/randomKit.mjs`).
- **已裁定不做(主控,Gitea #211)**:(1) 4 個 adapter 工廠不納入 `opt.random`(非死碼:為 R-PARAM 站點,有 25 個範例腳本與 21 個測試檔使用,使用方清單見 `rulebook_random.md` 已知限制 3);(2) 不另收 `opt.seed`,使用端自備產生器;(3) 產生器之回傳值不檢測;(4) 逐點變異之腳本不納入套件.
- **待辦(本案不做)**:類別型設計變數(值無大小次序,如數百個因子之序號).現以值之清單之索引做鄰近搜尋,各演算法之位置更新(`omlPSO` 之速度更新、`omlDE`/`omlRGA` 之算術疊加與 ±整數突變、`omlHS` 之音高調整、`omlSA`/`omlTA`/`sdm` 之 ±1 鄰點、預設局部搜尋 `'NelderMead'`)皆假設「索引相近即值相近」,類別型之索引差無意義,運算退化為近乎隨機之跳動而收斂差;只有 `omlACO` 之依費洛蒙選點不做索引算術.另預設局部搜尋 `'NelderMead'` 把各值當數字,`dps[i].values` 含非數字時整個呼叫以 `invalid params[0]: must be a valid number` reject(須改 `LocalSearchMethod`,如 `'None'`).可行方向(供評估):(a) `dps[i].kind`(預設 `'ordinal'`,行為不變;`'categorical'` 改用不依賴索引差之運算:離散化 PSO、均勻交叉與以突變率重抽、SA/TA/Neighbor 以重抽或交換取代 ±1,忽略 `ModeOutLimit`,局部搜尋之 `NelderMead`/`Gold` 對其跳過);(b) `dps[i].order`(各值之排序鍵)或 `dps[i].distance(a, b)`,使索引有意義而現有運算子不必改.二者可並存,與 `opt.random` 無相依(重抽同樣只經 `R`).出處:使用端建議(Gitea #211〈觀察〉).
- **最近一次驗證(2026-11-24)**:`npm test` 870 passing(既有 639 不改一字 + 新增 231:`unit-random-oml` 179、`unit-random-helper` 18、`unit-random-coverage` 34)、0 failing、0 pending(本庫並行 5 次與非並行 1 次;`npm pack` 發布包解開之目錄並行 2 次與非並行 1 次,掛解析守門);含隨機之新測試三檔各單獨連跑 20 次皆過;`eslint src test --ext .mjs` 無錯誤;逐點變異 176 個(取值點與轉傳點 114、入口與預設 19、`_pickByWeights` 後備 6、`_random.mjs` 內部 37),175 個由動態測試殺死、存活 1 個為等價變異(見 `rulebook_random.md`);未給時行為不變之前後對拍 384 次 0 處不同.`package.json` 之 `version` 本輪未改(發布由主控處理).
