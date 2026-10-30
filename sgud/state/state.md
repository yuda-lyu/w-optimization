# 現況

本檔記當前已開發功能之最新狀態(各功能做到哪裡、對應之規則帳本條目與測試檔、已知缺口與待辦、最近一次驗證或發布之版本),只記現況、不寫過程(過程寫入 `sgud/exp/experience.md`).規則帳本為藍圖、本檔為現況,兩者比對即知尚未做到者.過長時依功能類型拆為 `state_<類型>.md`,本檔只留索引.

## 輸入參數之檢測(R-PARAM)

- **範圍**:17 個匯出函數(`arrBinarySearch`、`arrBinarySearchClosest`、`binarySearch`、`cobyla`、`goldenSection`、`goldenSectionLiberate`、`limitBFGS`、`nelderMead`、`setpBracket`、`sdm`、`omlSA`、`omlTA`、`omlDE`、`omlRGA`、`omlHS`、`omlPSO`、`omlACO`)與 4 個 adapter 工廠(`_adapterACO`、`_adapterHS`、`_adapterSA`、`_adapterTA`,含其 `feedback`)之一般參數與 opt 全部已套(站點全集 250 列見 `sgud/rule/rulebook_param.md`).
- **做到哪裡**:
  - 種類由程式碼以 `chkParams` 宣告(`src/_checkParam.mjs`、`src/_optDecl.mjs`、`src/_validateDps.mjs`);數字字串轉換後只用轉換值;opt 給了而無效即報錯,不改用預設;失敗通道依函數型態(Promise 者 reject 字串、同步者 throw Error);訊息不帶輸入值.
  - 規格:`C:\opensrcOper\dspec\輸入參數之檢測機制.md`(草案);本套件只適用已確定之部分(N2、範圍子型、B1、K3~K6、§6).
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
