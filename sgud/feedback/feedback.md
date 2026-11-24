# 回饋

本檔記任務中發現之自有套件、全域技能、全域設定之調整與抽提提案(只增不改;處置結果另記一列並寫明承接哪一列).回饋是紀錄與提案,實際修改仍走通報管道.

| 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|
| 2026-11-24 | 自有套件 | wsemi `randomIntRange`、`randomIntsNdpRange` | 隨機來源無法由呼叫端注入:`randomIntRange` 之 `random.mjs` 於載入時以時間為種子建立自有偽隨機(不經 `Math.random`),`randomIntsNdpRange` 經 lodash `sampleSize` 之 `baseRandom`(載入時捕捉當時之 `Math.random`),故依賴它們之套件無法確定化結果,暫代 `Math.random` 亦無效.本套件(`opt.random`)以自有之 `_random.mjs` 於給了時導出整數與不重複整數(公式同 `randomIntRange`),未給時仍用 wsemi.建議 wsemi 提供可注入亂數來源之選項(如 `opt.random`,契約同 `Math.random`),各依賴者即可取消各自之導出 | `src/_random.mjs:19-24`、`sgud/exp/experience.md`〈取亂數之來源有三個〉 |
| 2026-11-24 | 全域技能 | role-coder-for-validate 之 `references/對拍工具.md`(L3 對拍) | 補一條:以 ESM 對拍時,植入變異須各用獨立之副本目錄載入;同一目錄僅以 query 區分頂層檔時,被傳遞載入之輔助檔受模組快取,變異不生效,工具會把「變異未被載入」誤判為「工具抓不到變異」或反之(撰寫對拍工具時推演發現,改為每個變異一份副本目錄) | `sgud/exp/experience.md`〈「未給時行為不變」以前後對拍驗證〉 |
