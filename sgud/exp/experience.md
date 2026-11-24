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

- **隨機演算法不能以種子逐值比對**:wsemi `random.mjs` 於模組載入時以時間為種子建立自有偽隨機(`fr`),不經 `Math.random`,測試無法重設;lodash-es 之 `baseRandom` 亦於載入時捕捉 `Math.random`.改以**退化之設計變數**(各變數僅一值,`n=1`)使搜尋確定化,再比對 `bestSolution`、`hists` 長度、停止資訊(投影排除 PSO 之 `inertia` 等隨機欄位).(2026-11-24 起 oml 系列與 `sdm` 可由 `opt.random` 確定化,見〈隨機來源可指定〉一節;未給時仍適用本條.)
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

## 隨機來源可指定(2026-11-24,`opt.random` 修正輪)

### 取亂數之來源有三個,暫代 `Math.random` 只擋得住其中一個

- 舊碼之隨機取值經三處:`Math.random`(直接用)、wsemi 之 `randomIntRange`(其 `random.mjs` 於載入時以時間為種子建立自有偽隨機,**不經 `Math.random`**,測試無法重設)、wsemi 之 `randomIntsNdpRange`(經 lodash `sampleSize` 之 `baseRandom`,於載入時捕捉當時之 `Math.random`,事後暫代無效).故「暫代 `Math.random`」固定不了路徑,也數不到後兩者之呼叫;`opt.random` 給了時,整數與不重複整數皆改由同一產生器導出(`src/_random.mjs`,公式同 `randomIntRange`),才使一切取值只經呼叫端之函數.
- 未給時維持舊來源(整數仍經 wsemi),以不改變各處取值之分佈與範圍;因此未給時只有 `rand()` 之取值能被暫代之 `Math.random` 數到.

### 作法與陷阱

- **單一出口物件 `R` 套到多個呼叫點**:每個取值點(`R.rand()`、`R.randInt(`、`R.randIntsNdp(`)與每個轉傳點(輔助之最後引數 `R`、`_localSearch` 之 `{ random }`)都可能漏接,漏接時預設值會靜默退回舊來源,結果看似正常.故以逐點變異驗證:將每一處改回 `Math.random()`、`randomIntRange(`、`randomIntsNdpRange(` 或刪去轉傳引數(補回原 import,使變異體等同 1.0.73,而非因 `ReferenceError` 假性轉紅),須有測試轉紅;另以靜態守門(`unit-random-coverage`)擋「新增一處直接用 `Math.random`」.
- **變異體數須固定**:變異點之枚舉數須與獨立之 `Grep` 計數相符(`R.rand()` 41、`R.randInt(` 35、`R.randIntsNdp(` 1、`, R)` 29、`{ random }` 5、`random: opt.random` 3),枚舉數不符即失敗;錨點(第 k 個出現處)不存在或不唯一、變異後全文不變也失敗,不得靜默略過.mocha 無摘要行(通過數加失敗數為 0)判為未定,不判殺死.
- **預設參數、邊界與「次數」類變異體易存活**:輔助之預設參數(`R = _defaultRandom`)被改為常數產生器時,只驗「索引合法」之測試仍綠——須另斷言預設來源確實隨機(多次呼叫之相異結果數達下限,機率上可忽略誤報);部分 Fisher–Yates 之「迴圈少一次」在 `n` 等於範圍個數時為等價,方法層級測不到,須於輔助層以 `n` 小於範圍加腳本化產生器,斷言精確輸出與抽取次數;`lo === hi`(單一可用值)須有案.
- **後備分支走不到時,先簡化結構,不留存活變異體**:`_pickByWeights` 於全無正權重時原另取一個隨機整數,該分支於有限適應值下走不到(輪盤權重恆有正值、費洛蒙非零處恆正),使「把 `R` 轉給它」之變異體無從被殺;改為由已取得之 `rnd` 換算(分佈相同)後,轉傳點與後備分支一併消失.
- **走不到之分支要找走得到之輸入**:`omlACO` 之「全部節點皆無費洛蒙」分支(`noPheromoneN === pn`)在適應值有限時走不到(初始化即已更新費洛蒙),但適應值恆為 `Infinity`(全部個體不可行之懲罰值)時費洛蒙恆為 0,即走到;以此輸入補測.
- **各取值點須由涵蓋設定走到**:operator 軸(`rgaCrossover` 13 種、`rgaMutation` 10 種、`hsPA` 12 種、`hsHMC` 7 種、`deMutation` 7 種、局部搜尋 7 種、`ModeOutLimit` 3 種)逐軸輪替使每個取值至少出現一次;並需與 `ModeOutLimit: 'Random'`、局部搜尋交叉(越界重產與局部搜尋內之 `sdm`/`omlSA`/`omlTA` 只在該組合走到),及極小設計空間(族群出現重複個體才觸發移民).
- **暫代 `Math.random` 之計數窗**:適應函數為同步或回傳已解決之 Promise 時,整個呼叫只經微任務,不讓出給其他巨任務,計數不會混入 mocha 或其他碼之呼叫;函數結束即還原(`finally`).
- **`sdm` 之 `Gold`/`OneGold`** 固定以 `'Limit'` 處理越界,不取亂數;`sdm` 之 `Neighbor` 於下界越界且 `ModeOutLimit` 為 `'Random'` 時才重產(以 `initSolution` 置於下界測之).
- **編輯與換行**:此套件各檔之換行混用 CRLF 與 LF(`_genSolution.mjs`、`README.md` 為 CRLF,多數 `src`/`test`/`sgud` 為 LF);編輯工具會保留各檔原有形式,新檔用 LF.判定換行請用位元組檢查(如 node 之 `Buffer.indexOf('\r\n')`).
- **套用差異檔與換行**:差異檔只含 LF,`git -c core.autocrlf=false apply` 套到 CRLF 之檔時會把新增行轉為該檔之 CRLF(各檔仍為單一換行形);GNU `patch --binary` 則視換行不同而拒絕整檔.交叉驗證時,鏡像之改前檔須還原為改前工作樹之換行形(`git archive` 於 `core.autocrlf=true` 會把全部轉 CRLF,須以 `git -c core.autocrlf=false show` 取 blob 後自行轉換),再以兩種工具套用並逐檔比 sha.
- **盤點指令須先實跑**:以 `Math.random` 等字樣為 `git grep` 之判準時,JSDoc 與行註解之說明文字也會命中,須以 `grep -v` 略去註解列;新檔尚未入版控時 `git grep` 看不到,須加 `--untracked`.
- **「未給時行為不變」以前後對拍驗證**:兩份 `src`(改前、改後)之隨機來源皆改指同一個固定種子之來源(wsemi 之隨機函數 import 改指本地 shim、`Math.random` 以固定種子之產生器替換),逐設定比對適應函數呼叫序列、回傳與取亂數次數之雜湊;工具先以「多一次取亂數」「少一次」「改一個數字」三種變異驗過,各變異須用獨立之副本目錄載入(傳遞載入之模組會被模組快取,只以 query 區分頂層檔不足以載入被變異之輔助檔).
