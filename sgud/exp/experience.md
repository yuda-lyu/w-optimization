# 累積經驗

本檔為執行工作時特有之累積經驗,留給後續之嘗試、執行與判斷,由agent自行編列、擴充與維護.過長時抽出舊者為`experience_<年月日>.md`,並於本檔註明何時抽出.

## 輸入參數之檢測(2026-10-31,opt 修正輪)

### 判定與轉換不可借用 wsemi 既有函數

- `isnum` 收 `'0x10'`、`'0b11'`、`'Infinity'`;`cdbl`/`cint` 對非數字回 0(`cdbl('NP')` 為 0);`isbol` 無效即靜默改預設;`ispint`/`isint` 對 `Infinity`、`1e21` 之判定不一.入口檢測一律經 `src/_checkParam.mjs`(`toNum`),**不得**用這些函數作判定或轉換.
- 舊碼之共同形狀:`if (!isnum(x)) { x = 預設 }; x = cdbl(x)`(靜默改預設)、`if (!isnum(x)) { reject }` 後**未轉換**即使用(`goldenSection('1','5')` 回 `x:'1'`);同一套件內 `binarySearch` 有轉換、`goldenSection` 沒有,兄弟函數不對稱即屬缺陷.
- `arrHas(值, 列表)` 會把值包成陣列比對,故 `ModeOutLimit: ['Limit']` 通過檢測而值仍為陣列;列舉須以 `typeof v === 'string'` 加嚴格相等.

### 原碼中發現之「有宣告而無效果」

- `setpBracket` 之 `opt.dxR`:`isnum(dxR) && dxR === 'speed'` 恆為假(字串不是 isnum),任何 `dxR` 值皆被忽略成 2,但迴圈內 `'speed'` 分支與數值分支都存在.依 K3/K4「給了即生效」改為生效(`'speed'` 或正數);此為行為變化,README 已列.
- `binarySearch` 之 `opt.delta`:讀入後未被使用(原碼死變數),JSDoc 卻載為步長.依規則帳本「有宣告之預期功能不得當死碼刪」保留,僅檢測.
- `cobyla` 之 JSDoc 為 `nelderMead` 複製而來(載有 `delta`、`rho`、`chi` 等 cobyla 不使用之鍵,卻漏載實際使用之 `rhobeg`、`rhoend`),已改為實際使用之鍵.
- `nelderMead` 把呼叫端之 `params` 陣列直接放入 simplex 並寫入 `.y`、`.id`,排序後該陣列之元素內容亦可能被 `updateSimplex` 覆寫;改為轉換後之新陣列,不改寫呼叫端.
- `arrBinarySearch`(`Closest`)以 `filter` 後之索引作 `ind`,陣列含非數字時 `ind` 非原索引;改為保留原位置之索引.

### 測試之作法與陷阱

- **隨機演算法不能以種子逐值比對**:wsemi `random.mjs` 於模組載入時以時間為種子建立自有偽隨機(`fr`),不經 `Math.random`,測試無法重設;lodash-es 之 `baseRandom` 亦於載入時捕捉 `Math.random`.改以**退化之設計變數**(各變數僅一值,`n=1`)使搜尋確定化,再比對 `bestSolution`、`hists` 長度、停止資訊(投影排除 PSO 之 `inertia` 等隨機欄位).
- **adapter 之投影會操作其狀態**(以 `feedback` 腳本化後讀溫度、費洛蒙、memory):同一結果投影兩次會累加,表驅動輔助以 `WeakMap` 快取每個結果之投影.
- **limitBFGS 不收斂於二次函數**:前向差分梯度對二次函數之誤差約等於 `delta`(1e-5),大於預設收斂門檻 1e-6,恆 `iterator > maxIterations`;測試改用既有範例之 `sin` 函數由 `[87]` 起算.
- **修前紅**:以 `git archive HEAD src | tar -x -C ./tmp/opt/old/` 取舊版 src,連同新測試複製到 `./tmp/opt/old/test/` 執行(裸套件如 `wsemi`、`lodash-es` 由 `./tmp` 之上層 `node_modules` 解析,不需連結 `node_modules`).本輪舊碼:293 項失敗、221 項通過(同批 5 檔 514 項;通過者多為舊碼已具備之行為,如 `fun` 非函數之 reject、`opt` 取預設).
- **變異測試**:`tmp/opt/mutate.mjs` 在 `./tmp/opt/mut/run` 之 `src`+`test` 副本逐一套用單點變異並跑全部測試;`spawnSync` 期間事件迴圈被阻塞,`console.log` 要等全部結束才出現在 quiet-run 之 log,勿以為卡住.
- 全套 `npm test`(mocha --parallel)約 5 秒(639 項,含新增之 579 項).
- 變異測試之同步無窮迴圈:變異體讓 `toNum` 收 NaN/Infinity、或讓正數檢測收 0 時,某些演算法會同步無窮迴圈(mocha 之逾時救不了同步迴圈);`spawnSync` 必加 `timeout` 與 `killSignal: 'SIGKILL'`,逾時視為被殺.第一次未加逾時,背景任務卡住,以 `TaskStop` 停止後以 `quiet-run --release-stale --cwd <本套件>` 回收殘留鎖.
- **選項「給了即生效」須另測**:只比對「數字字串結果 = 數值結果」抓不到「該選項被忽略」(兩邊皆忽略仍相等);表驅動加 `effect`(指定值之結果須異於預設)才殺得死 `minTolerance`、`maxIterations`、`min`/`max` 被忽略之變異.`nelderMead` 之 `sigma` 只在收縮失敗時用到,需高原中之窄谷函數才觀察得到.
- 等價變異:下游本就會再轉換或 JS 強制轉型使數字字串結果相同者(如 `setpBracket` 會再轉 `x`、`arrBinarySearchClosest` 之減法、adapter ACO 之算術),不回寫轉換值之變異測試不到;實作仍回寫以守 K4.

### 決策

- **`kFit`(適應函數值收 ±Infinity)**:`initSolution.fitness` 與 adapter `feedback` 之 `fitness` 是目標函數之輸出而非輸入參數;使用者常以 `Infinity` 作懲罰值,且 `_localSearch` 以現解作 `initSolution` 傳給 sdm/omlSA/omlTA,若依 N2 收嚴會於最佳化中途失敗.舊碼 `isnum(Infinity)` 為真,故收之不構成回歸;NaN、標記字串、null、布林一律無效.
- **`arrBinarySearch(Closest)` 之 `arr` 取 N1**(非 N2):試驗數據陣列常含 `'-'`、`'NP'` 標記,舊碼即略過非數字(`filter(isnum)`),N1 保留此語意並修正 `ind` 為原索引;`null`、布林、NaN、Infinity 等改為報錯.若主控裁為 N2,只須把 `kNumArrN1` 換 `kNumArr` 並改測試.
- **跨鍵下限訊息不帶數值**(`invalid opt.Np: must be at least the minimum required by opt.deMutation`),最小值改載於 JSDoc.
- **回呼回傳值不檢**(`funFit` 輸出、`funGenerationBefore` 回傳之 `{ params }`):非入口參數,另案.
