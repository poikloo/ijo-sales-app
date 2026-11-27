# 요청 받기 (요청함) — 요청 파일 형식 v1

Grok Bot 같은 외부 도우미가 **JSON 파일**을 정해진 폴더에 넣으면, 앱의 **요청함**에 카드로 뜹니다.
사용자가 카드 내용을 확인하고 **[적용]** 을 눌러야만 데이터가 바뀝니다. **[거부]** 를 누르면 아무것도 바뀌지 않고 파일만 옮겨집니다.
적용할 때 앱은 화면에서 직접 입력할 때와 **같은 함수**(오더 정리, 거래명세서 작성, 출고 연동 등)로 데이터를 만듭니다.

> 이 문서의 회사·거래처·품목·숫자는 모두 **(예시)** 입니다.

## 1. 폴더

| 폴더 | 용도 |
|---|---|
| `requests/inbox` | 여기에 요청 파일(`*.json`)을 넣습니다 |
| `requests/done` | 적용한 요청 + `<이름>.result.json` (적용 시각, 백업 파일명, 만든 거래명세서 id) |
| `requests/rejected` | 거부한 요청 + `<이름>.result.json` |
| `requests/error` | 형식이 잘못된 요청 + `<이름>.result.json` (`reason`에 이유) |

위치(앱 데이터 폴더 아래):

- **Windows**: `%APPDATA%\이조 영업관리\requests\inbox` (앱 이름은 'LEEJO 영업관리'로 바뀌었지만 데이터 폴더 이름은 예전 그대로)
  (보통 `C:\Users\<사용자>\AppData\Roaming\이조 영업관리\requests\inbox`)
- macOS: `~/Library/Application Support/이조 영업관리/requests/inbox`
- Linux: `~/.config/이조 영업관리/requests/inbox`

앱의 **설정 › 요청함** 과 **요청함** 화면 맨 위에 실제 경로가 보이고, [폴더 열기]·[경로 복사]·[지금 확인] 버튼이 있습니다.
폴더는 앱이 처음 켜질 때 자동으로 만들어집니다.

### 파일을 넣는 방법 (권장)

1. 같은 폴더에 `이름.json.tmp`(또는 `.이름.json`)로 먼저 다 쓴 뒤
2. `이름.json`으로 **이름을 바꿉니다** (rename).

앱은 `.json`으로 끝나고 `.`/`~`로 시작하지 않는 파일만 읽고, 마지막 수정 후 1.5초가 지난 파일만 읽습니다(쓰는 도중인 파일을 읽지 않도록).
파일 하나는 2MB까지, 인코딩은 UTF-8(BOM 허용)입니다. 파일 이름은 자유지만 `2026-10-28_001_설명.json`처럼 날짜·순번을 넣으면 보기 좋습니다.

### 언제 확인하나

- 폴더 감시(fs.watch) — 넣자마자 거의 바로
- 5초마다 한 번 확인 (감시가 안 되는 환경 대비)
- 앱을 켤 때, 앱 창으로 돌아올 때(포커스)
- [지금 확인] 버튼

새 요청이 오면 토스트 알림이 뜨고, 사이드바 **요청함** 옆 숫자(배지)가 대기 중인 요청 수를 보여 줍니다.

## 2. 최상위 형식

```json
{
  "version": 1,
  "id": "req-20261028-001",
  "createdAt": "2026-10-28T17:40:00+09:00",
  "source": "grokbot",
  "note": "(예시) 요청 설명 — 카드 제목으로 보입니다",
  "actions": [ { "type": "...", ... } ]
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `version` | ✔ | 반드시 `1` |
| `id` | ✔ | 요청 고유 id (문자열, 100자 이하). **같은 id는 한 번만 적용**됩니다 — 이미 적용한 id면 적용 버튼이 막힙니다 |
| `createdAt` | ✔ | 만든 시각 (ISO 8601, 예: `2026-10-28T17:40:00+09:00`) |
| `source` | ✔ | 반드시 `"grokbot"` |
| `note` |  | 요청 설명 (카드 제목). 없으면 동작 요약이 제목이 됩니다 |
| `actions` | ✔ | 동작 배열 (1~200개). **위에서부터 차례로** 실행됩니다 — 앞에서 만든 오더를 뒤 동작에서 쓸 수 있습니다 |

모든 동작에는 `type` 외에 `comment`(문자열, 카드에만 보이고 저장되지 않음)를 붙일 수 있습니다.

### 오류 단계

1. **형식 오류** → 파일이 곧바로 `requests/error`로 옮겨지고 토스트가 뜹니다.
   JSON 문법 오류, `version`≠1, `id`/`createdAt`/`source` 누락·잘못됨, `actions`가 비었거나 모르는 `type`, 2MB 초과.
2. **내용 오류** → 카드에 ⛔ 빨간 줄로 보이고 **[적용] 버튼이 꺼집니다**. (파일은 inbox에 남으니 고친 파일로 바꿔 넣거나 [거부]하면 됩니다.)
   없는 오더번호, 필수값 누락, 잘못된 날짜(`YYYY-MM-DD`가 아니거나 없는 날짜), 숫자가 아닌 값, 이미 있는 오더번호로 addOrder, 이미 적용한 id 등.
3. **주의** → ⚠ 노란 줄. 적용은 됩니다 (예: 모르는 항목은 무시, 거래처 정보에 없는 상호).

### 적용 과정

1. 파일이 그 사이 바뀌지 않았는지 확인 (바뀌었으면 다시 보여 줌)
2. 확인 창(앱 안 모달)에서 한 번 더 확인
3. **백업**: 현재 데이터를 `backups/preimport_<시각>.json`으로 저장 (가져오기 전 백업과 같은 기능)
4. 모든 동작을 차례로 실행 — **하나라도 실패하면 전부 되돌림** (아무것도 저장 안 됨)
5. 한 번에 저장 → 파일을 `requests/done`으로 옮기고 결과 메모(`.result.json`) 작성
6. 거래명세서 동작에 `open: true`(기본)면 만든 거래명세서를 바로 엽니다 (카드의 "적용 후 거래명세서 열기" 체크로 바꿀 수 있음)

## 3. 동작(actions)

날짜는 모두 `"YYYY-MM-DD"`. 수량 단위(`unit`)는 `YD`·`M`·`KG`·`EA` 중 하나 (기본 `YD`).

### 3.1 `production.addOrder` — 생산 관리에 새 오더

```json
{ "type": "production.addOrder",
  "order": {
    "no": "EX-0002", "client": "예시상사 A", "item": "(예시) 방수 원단", "fabric": "(예시) NY 210D",
    "date": "2026-10-20", "due": "2026-11-30",
    "lines": [ { "color": "카키", "qty": 1500, "unit": "YD" } ],
    "procs": [ { "name": "생지", "vendor": "(예시)A직물" },
               { "name": "염색", "vendor": "(예시)B염색", "shrink": 5,
                 "ships": [ { "date": "2026-10-27", "qty": 700, "memo": "1차" } ] } ],
    "delivered": false } }
```

| `order.` 필드 | 화면 이름 | 설명 |
|---|---|---|
| `no` ✔ | 오더번호 | 이미 있는 번호면 오류 |
| `client` | 거래처 | |
| `item` | 품목 | |
| `fabric` | 아이템명 | |
| `date` | 발주일 | 없으면 오늘 |
| `due` | 납기일 | |
| `lines[]` | 색상 / 발주량 | `color`, `qty`(숫자), `unit` |
| `procs[]` | 공정 | `name` ✔ 공정명, `vendor` 가공 업체, `shrink` 가공 축(%, 숫자 5 = 5%), `ships[]` 출고 (`date` ✔, `qty` ✔, `memo`) |
| `delivered` | 오더 완료 | true/false |

### 3.2 `production.updateOrder` — 오더 정보 바꾸기

```json
{ "type": "production.updateOrder", "orderNo": "EX-0001",
  "set": { "due": "2026-12-15", "client": "예시상사 A" } }
```

`set`에 넣을 수 있는 것: `item`, `fabric`, `client`, `date`, `due`, `lines`(통째로 바꿈). 카드에 바뀌기 전 → 후가 보입니다.

### 3.3 `production.addShipment` — 공정에 출고 행 추가

```json
{ "type": "production.addShipment", "orderNo": "EX-0002", "process": "염색",
  "ships": [ { "date": "2026-10-28", "qty": 800, "memo": "2차" } ] }
```

| 필드 | 설명 |
|---|---|
| `orderNo` ✔ | 오더번호 |
| `process` | 공정명 (같은 이름 공정이 여러 개면 `processNo` 필요) |
| `processNo` | 공정 순서 (1부터). `process`와 함께 쓰면 이름이 맞는지 확인 |
| `addProcess` | `true`면 `process` 이름의 공정이 없을 때 맨 뒤에 새로 만듦 |
| `vendor`, `shrink` | 새 공정을 만들 때의 가공 업체·가공 축(%). 기존 공정에 `vendor`를 주면 그 공정의 가공 업체를 바꿉니다(카드에 '가공 업체 A → B'로 표시). `shrink`는 새 공정에만 |
| `ships[]` ✔ | `date` ✔ 출고일, `qty` ✔ 출고량(숫자), `memo` 메모 |

### 3.4 `production.setDone` — 오더 완료 표시

```json
{ "type": "production.setDone", "orderNo": "EX-0001", "done": true }
```

`done`을 빼면 `true`. `false`면 완료 해제.

### 3.5 `statement.createFromOrder` — 오더로 거래명세서 작성

거래명세서 화면의 **[+ 거래명세서 작성] → 생산 오더에서 불러오기**와 같은 방식입니다
(오더번호·품명·규격·거래처를 오더에서 가져오고, 번호·공급자는 자동).

```json
{ "type": "statement.createFromOrder", "orderNo": "EX-0002", "date": "2026-10-28",
  "customer": "예시상사 A", "price": 3500, "note": "(예시) 1차분",
  "lots": [ { "lotNo": "A-2610-01", "color": "카키", "rolls": [55, 54, 56] } ],
  "linkShip": true, "open": true }
```

| 필드 | 화면 이름 | 설명 |
|---|---|---|
| `orderNo` ✔ | 오더번호 | 생산 관리에 있어야 함 (같은 요청의 addOrder로 만든 것도 됨) |
| `date` | 날짜 | 없으면 오늘 |
| `lots[]` ✔ | LOT별 수량 | `lotNo` LOT NO., `color` COLOR, `rolls` 절별 수량 숫자 배열 (최대 500) |
| `customer` | 공급받는자 | **거래처 정보**에 있는 상호면 등록번호·주소까지 채움. 없으면 상호만 (⚠). 빼면 오더의 거래처 |
| `item` | 품명 | 빼면 오더의 품목 |
| `spec` | 규격 | 빼면 오더의 아이템명 |
| `price` | 단가 (원) | 숫자. 금액 = 단가 × 총 수량 |
| `note` | 비고 | |
| `dest` | 납품처 | |
| `contact` | 담당자 | |
| `linkShip` | 생산 관리 최종 납품에 반영 | 기본 `true` — 오더의 **최종 납품**에 명세서 날짜·총 수량 납품 줄을 연결해 만듦 (화면의 체크박스와 같음). v1.8.0부터 — 그 전에는 마지막 공정 출고 행이었음 |
| `open` | | 기본 `true` — 적용 후 이 거래명세서를 바로 엽니다 |

요청으로 만든 거래명세서는 목록에 **요청** 표시가 붙고, 일반 거래명세서처럼 고치고 인쇄·PDF 저장할 수 있습니다.

### 3.6 `sales.addRow` — 매출 관리에 한 줄 (선택)

```json
{ "type": "sales.addRow",
  "row": { "date": "2026-10-28", "client": "예시상사 A", "orderNo": "EX-0002", "item": "(예시) 방수 원단",
           "fabric": "(예시) NY 210D", "process": "염색", "color": "카키", "unitPrice": 3500, "qty": 426,
           "supply": 1491000, "total": 1640100, "memo": "" } }
```

`date`(매출일) 또는 `year`(연도) 필수, `client`(거래처) 또는 `orderNo` 필수.
`unitPrice` 단가, `qty` 수량, `supply` 공급가액, `total` 합계(부가세 포함).

### 3.7 `price.addRow` — 단가 관리에 한 줄 (선택)

```json
{ "type": "price.addRow",
  "row": { "cat": "(예시) 아웃도어", "item": "(예시) NY 210D", "color": "카키", "width": "58\"",
           "gV": "(예시)A직물", "gCur": "KRW", "g": 1200, "dV": "(예시)B염색", "d": 600, "dS": 0.05,
           "p1V": "(예시)C가공", "p1D": "PU 코팅", "p1": 400, "m": 0.13 } }
```

`item`(ITEM) 또는 `code`(CODE) 필수. `ono` 오더번호(여러 개는 쉼표로 — 생산 관리 오더 상세의 가공료가 이 행의 단가를 씀), `cat` 구분, `part` 파트, `color`, `width` 폭,
`gV` 생지 공장 · `gCur` 생지 통화(`KRW`/`USD`) · `g` 생지 가격,
`dV` 염색 공장 · `d` 염색 가격 · `dS` 염색 축,
`p1V`/`p2V` 가공소 · `p1D`/`p2D` 가공내역 · `p1`/`p2` 가공 가격 · `p1S`/`p2S` 가공 축,
`eD` 기타 내용 · `e` 기타 금액 · `t` TRANS(운임) · `m` 마진율 · `memo`.
**비율(`dS`, `p1S`, `p2S`, `m`)은 소수**로 적습니다 (13% → `0.13`). 비워 두면 설정의 기본값.

### 3.8 `production.attachFile` — 오더에 파일 첨부 (출고별 거래명세서 · 작업의뢰서 · 발주서)

첨부할 파일(PDF·JPG·PNG·WEBP·GIF, 20MB까지)은 **요청 JSON보다 먼저** `inbox` 안의 하위 폴더(예: `inbox\files\`)에 넣고, `file`에 inbox 기준 **상대 경로**를 적습니다.
절대 경로(`C:\...`, `/...`), `..`, 심볼릭 링크, inbox 밖을 가리키는 경로는 카드에서 ⛔ 오류로 막힙니다. base64로 JSON에 넣는 방식은 지원하지 않습니다 (요청 JSON 2MB 제한 그대로).

```json
{ "type": "production.attachFile", "orderNo": "EX-0002", "kind": "statement",
  "file": "files/sample_statement.pdf" }
```

| 항목 | 설명 |
|---|---|
| `orderNo` | 필수. 같은 요청 앞쪽 `production.addOrder`로 만든 오더도 됩니다 |
| `kind` | `statement`(기본, 생산 관리 출고 줄의 **거래명세서** 칸) · `workOrder`(작업의뢰서 메뉴의 작업의뢰서 칸) · `purchaseOrder`(같은 메뉴의 발주서 칸) |
| `file` | 필수. inbox 기준 상대 경로 |
| `process` / `processNo` | (statement) 출고 줄을 찾을 공정 |
| `shipDate` / `shipQty` | (statement) 출고 줄을 고르는 출고일·출고량 |
| `replace` | (statement) 이미 거래명세서가 붙은 출고 줄이면 `true`일 때만 바꿈 (아니면 오류) |

`statement`에서 어느 출고 줄인지:
1. `process`·`processNo`·`shipDate`·`shipQty`를 모두 생략하면, **같은 요청 앞쪽에서 이 오더에 마지막으로 추가된 출고 줄**(`production.addShipment`의 마지막 행, 또는 `statement.createFromOrder`의 `linkShip` 최종 납품 줄)에 붙입니다. 없으면 오류.
2. 지정하면 그 조건으로 찾습니다. `shipDate`로 여러 줄이 걸리면 오류(→ `shipQty`·`processNo`로 좁힘), `shipDate` 없이 공정만 주면 그 공정의 마지막 출고 줄(⚠ 표시).

카드에는 파일 이름·크기·붙일 곳과 **📎 파일 열어 보기** 버튼이 나옵니다.
적용하면 파일이 앱의 원래 첨부 저장소로 **복사**됩니다 (직접 [첨부]를 누른 것과 같은 곳):
`<데이터 폴더>\statements\<오더id>\` (거래명세서, `data.json`의 `shipFiles`) / `<데이터 폴더>\workorders\<오더id>\` (작업의뢰서·발주서, `workOrderFiles`).
복사 중 하나라도 실패하면 이미 복사한 파일을 지우고 데이터도 되돌립니다. 원본은 요청 파일과 함께 `done`/`rejected`/`error` 폴더의 `<요청이름>.files\` 로 옮겨집니다.

### 예시: 출고 추가 + 거래명세서 첨부

`inbox\files\sample_statement_2610-0101.pdf` 를 먼저 넣고, 그다음 `2026-10-29_001_attach.json`:

```json
{
  "version": 1, "id": "ex-attach-001", "createdAt": "2026-10-29T14:00:00+09:00", "source": "grokbot",
  "note": "(예시) 염색 출고 + 거래명세서 첨부",
  "actions": [
    { "type": "production.addShipment", "orderNo": "EX-0002", "process": "염색",
      "ships": [ { "date": "2026-10-29", "qty": 1200, "memo": "(예시) 1차 출고" } ] },
    { "type": "production.attachFile", "orderNo": "EX-0002", "kind": "statement",
      "file": "files/sample_statement_2610-0101.pdf", "comment": "방금 추가한 출고 줄에 붙임" }
  ]
}
```

### 카드에서 고치기 (✎ 수정)

대기 중인 카드의 **✎ 수정**을 누르면 각 동작의 주요 칸이 입력란으로 바뀝니다 — 오더번호, 공정(기존 공정 목록·표준 공정명 선택), 가공 업체(아는 업체·거래처 목록), 출고일·출고량·메모, 오더의 거래처·품목·색상·발주량, 거래명세서의 날짜·공급받는자·단가·LOT/COLOR/절별 수량, 매출·단가 행의 항목, 파일 첨부의 종류·대상 출고 줄.
- 칸을 고치면 미리보기와 검사(⛔/⚠)가 바로 다시 계산되고, 오류가 있으면 [적용]이 막힙니다. 카드에 **수정됨** 표시, **원래대로**로 되돌림.
- `production.addShipment`에서 공정 이름을 그 오더에 **있는 공정**으로 바꾸면 새 공정을 만들지 않고 그 공정에 출고를 넣습니다 (없는 이름이면 새 공정).
- 원래 요청 파일은 바꾸지 않습니다. 적용하면 실제로 적용한 요청을 `done\<이름>.edited.json`으로 남기고, `.result.json`에 `edited`, `edits`(바뀐 칸 목록), `originalActions`, `editedActions`를, `requestLog`에 `edited`·`edits`를 기록합니다.
- 백업·전부 아니면 전무·같은 id 두 번 적용 금지는 그대로입니다.

### 3.9 `testReport.attachFile` — TEST REPORT에 시험성적서 첨부 (접수번호로 찾기)

| 필드 | 필수 | 설명 |
|---|---|---|
| `reportNo` | ✔ | 접수번호. 공백·하이픈·대소문자는 무시하고 **정확히 일치**하는 TEST REPORT 1건을 찾음 |
| `file` | ✔ | 받은편지함 폴더 기준 상대 경로 (예: `files/…pdf`). 3.8과 같은 규칙 |

- 일치하는 행이 없으면 "일치하는 성적서 없음" 오류 → 적용 불가 (✎ 수정에서 접수번호를 고칠 수 있음). 2건 이상 일치해도 오류.
- 한 행에 여러 파일 가능 (동작을 여러 개 보내면 됨). 같은 이름 파일이 이미 붙어 있으면 경고 후 건너뜀.
- 적용하면 TEST REPORT의 성적서(📎) 칸에 들어가고, 스냅샷 `testReports[].files` / `attached`에 반영됨.

```json
{
  "version": 1, "id": "ex-tr-001", "createdAt": "2026-10-30T12:00:00+09:00", "source": "grokbot",
  "note": "(예시) 시험성적서 첨부",
  "actions": [
    { "type": "testReport.attachFile", "reportNo": "EX-0003", "file": "files/sample_report_EX-0003.pdf" }
  ]
}
```

### 3.10 `quality.addItem` — 품질 기준에 품목 추가 (규격서 내용)

```json
{ "type": "quality.addItem", "item": {
  "name": "(예시) 다목적 방수포", "category": "사내규격", "specNo": "EX-QS-001", "revised": "2026-03-15",
  "org": "(예시)관리기관", "drawing": "(예시) 도면 EX-D-01", "memo": "(예시) 봉제·포장·표시 요약",
  "types": [ { "type": "1형", "stockNo": "EX-0000-00-000-0001", "color": "녹색" } ],
  "fabrics": [
    { "name": "겉감", "usage": "본체", "material": "나일론 100%", "color": "녹색", "ref": "표 1",
      "yarn": "N 210D", "weave": "평직", "width": "150cm 이상",
      "tests": [ { "item": "인장강도", "standard": "경 800 이상 / 위 700 이상", "method": "KS K 0520", "unit": "N", "memo": "" } ] }
  ],
  "appendix": [
    { "title": "염색견뢰도", "columns": ["색상","일광","세탁"], "rows": [["녹색","4","4-5"]] },
    { "title": "적외선 반사율", "markdown": "| nm | 녹색 |\n|---|---|\n| 700 | 10~30 |" }
  ] } }
```

- 필수: `name`. 나머지는 선택. `category`=분류, `specNo`=규격번호, `revised`=제정/개정일, `org`=관리기관, `drawing`=관련 도면.
- `types[]` (형별): `type`, `stockNo`(재고번호), `color`.
- `fabrics[]` → 원단 탭 하나씩. `usage`(용도/부위), `material`(재질/구성), `color`, `ref`(적용기준 참조), `yarn`/`weave`/`width`(사종/조직/폭, 선택).
- `tests[]` → 시험항목 행. `item`, `standard`(경/위 포함 그대로), `method`, `unit`(선택), `memo`(비고).
- `appendix[]` → 무늬·색상 탭 아래 "부록" 표. `{title, columns, rows}` 또는 `{title, markdown}` (마크다운 표, 표 밖 줄은 글로 표시) 또는 마크다운 문자열.
- **합치기 규칙**: 같은 `specNo`(+`category`를 주면 분류도 같아야 함)인 품목이 이미 있으면 새로 만들지 않고 합침(경고 표시).
  - 원단: 이름이 같으면(공백·대소문자 무시) 그 원단을 통째로 바꿈, 없으면 추가. 보내지 않은 원단은 그대로.
  - 부록: 제목이 같으면 바꿈, 없으면 추가. `types`는 보내면 통째로 바꿈. 나머지 칸은 보낸 것만 바뀜.
  - 일치하는 품목이 2건 이상이면 오류.

### 3.11 `quality.updateItem` — 품질 기준 품목 고치기

```json
{ "type": "quality.updateItem", "specNo": "EX-QS-001", "set": { "revised": "2026-09-01", "org": "(예시)관리기관2" } }
```

- 찾기: `itemId`(스냅샷 `qualityStandards[].id`) 또는 `specNo`(+`category`). 없거나 2건 이상이면 오류.
- `set`에는 addItem `item`과 같은 키. 합치기 규칙도 같음.

### 3.12 `quality.attachFile` — 품질 기준에 규격서 파일 첨부

```json
{ "type": "quality.attachFile", "specNo": "EX-QS-001", "file": "files/sample_spec_EX-QS-001.hwp" }
```

- 찾기는 updateItem과 같음 (`itemId` 또는 `specNo`+`category`). 같은 요청 앞쪽 addItem으로 만든 품목도 찾음.
- `file`: inbox 기준 경로. 허용: hwp, hwpx, pdf, jpg/png/webp/gif.
- 품목 머리의 📎 버튼으로 열림 (pdf·사진은 미리보기, hwp는 PC 기본 프로그램). 같은 이름 파일이 있으면 경고 후 건너뜀.

### 3.13 `testReport.setResults` — TEST REPORT 기준 비교에 시험 결과 입력

```json
{ "type": "testReport.setResults", "reportNo": "EX-0101", "name": "겉감",
  "link": { "specNo": "EX-QS-001", "fabric": "겉감" },
  "replace": true,
  "results": [
    { "item": "인장강도", "part": "경", "value": "950", "unit": "N" },
    { "item": "인장강도", "part": "위", "value": "780", "unit": "N" },
    { "item": "인열강도", "value": "35", "judge": "pass", "memo": "(예시) 재시험" },
    { "item": "땀 견뢰도", "subItem": "산성 변퇴색", "value": "4-5" },
    { "item": "땀 견뢰도", "subItem": "산성 면 오염", "value": "4" },
    { "item": "땀 견뢰도", "subItem": "알칼리성 폴리 오염", "value": "3-4", "memo": "(예시) 재시험 예정" },
    { "item": "마찰 견뢰도", "part": "습", "subItem": "", "value": "3" }
  ] }
```

- **성적서 찾기**: `id`(스냅샷 `testReports[].id`)가 있으면 그것으로 찾음(`reportNo`도 주면 일치해야 함). 없으면 `reportNo`(공백·하이픈 무시).
  같은 접수번호가 여러 건이면 `name`(품명 일부)과 `received`(접수일)로 좁힘. 그래도 0건 또는 2건 이상이면 오류 → `id`로 보내 주세요.
- `link` (선택): `qualityItemId` 또는 `specNo` 또는 `name`(품목명; `specNo`와 같이 주면 둘 다 맞아야 함), `fabric`(원단 이름; 없으면 지금 연결된 원단 또는 첫 원단).
  없으면 지금 연결된 기준을 쓰고, 연결이 없으면 품명으로 자동 연결(경고), 그것도 안 되면 오류. 연결 기준/원단이 바뀌면 기존 입력값은 지움.
- `results[]`: `item`(필수), `part`(경/위/건/습 등, 선택), `subItem`(세부 항목, 선택 — 예: 산성 변퇴색 / 세탁 오염), `value`(문자열), `unit`(선택; 기준 단위와 다르면 경고), `judge`(`"pass"`/`"fail"`/`null`), `memo`.
  - 매칭: 연결된 원단의 시험항목 `item`과 비교(공백·대소문자 무시, 없으면 포함 관계). `part`가 있으면 `구분`과 맞춤.
    구분 없이 기준이 "경 900 이상 / 위 800 이상"처럼 한 칸이면 결과를 "경 950 / 위 780"으로 모아 넣고 경·위 각각 판정.
  - `subItem`: 같은 항목에 여러 줄 가능. `구분`이 "part subItem"과 같은 기준 행이 있으면 그 행에 넣고, 없으면 항목 행 아래 세부 행으로 추가(값·판정·비고 각각).
    세부 행 기준은 항목 기준을 물려받음(〃). `part`가 있고 기준이 "경 … / 위 …"처럼 나뉘어 있으면 그 part 기준을 씀. 숫자만/"급"만 있는 기준은 "이상"으로 판정.
    항목 행 자체에 값이 없으면 항목 판정 = 세부 판정 종합(하나라도 X면 X, 모두 O면 O).
  - 맞는 행이 없거나 여러 개면 카드에 ⚠ 표시, 값은 "기준에 없는 항목"으로 보관(패널 아래 표시, 스냅샷 `rows[].unmatched`).
  - `judge`가 null/없으면 앱이 기준과 비교해 자동 판정. pass/fail을 주면 그 값을 씀(패널 판정 옆 작은 •). 판정 칸은 O / X만 표시(판정 못 하면 빈칸). 패널에서 값을 고치면 직접 판정은 풀림.
- `memo`는 패널의 비고 칸(판정 오른쪽)에 나오고 패널에서 고칠 수 있음. 표가 넓으면 가로로 스크롤.
- `overall` (선택, pass/fail): 결과 칸. 없으면 계산 — 불합격 하나라도 있으면 불합격, 모두 합격이면 합격, 미입력이 있으면 그대로(경고).
- `failedItems` (선택, 문자열 또는 배열): 불합격 항목 칸. 없으면 불합격 판정 항목으로 채움.
- `replace`: `true`면 이 성적서의 기존 입력값·판정·메모를 지우고 새로 넣음. `false`/없음이면 보낸 항목만 덮어씀.
- 스냅샷 `testReports[].linkedQuality` = `{name, fabric, specNo, qualityItemId, values(원본 입력 맵), results[] / rows[]{item,part,subItem,standard,unit,value,judge,manual,memo,unmatched}}` (results와 rows는 같은 목록).

### 3.14 청구서 — `bill.split` · `bill.create` · `bill.moveLines` · `bill.merge` · `bill.update` · `bill.addLine` · `bill.updateLine` · `bill.removeLine` · `bill.remove` · `bill.excludeLines`

같은 달 · 같은 거래처 청구서를 여러 장으로 나눌 수 있습니다. 기본 청구서 id는 `"YYYY-MM|거래처"`, 나눈 청구서는 `"YYYY-MM|거래처#고유값"`이고 구분명(`label`)을 붙일 수 있습니다.
나눈 청구서는 자기 줄을 기억하므로 매출 관리·최종 납품으로 자동 줄을 다시 계산해도 다시 합쳐지지 않습니다. 그 달 그 거래처에 새로 생긴 자동 줄은 기본 청구서로 들어갑니다.

**청구서 찾기 (공통)**: `billId`(스냅샷 `bills[].id`) 또는 `month`(YYYY-MM) + `client`(거래처, 공백·대소문자 무시) + 선택 `billLabel`(여러 장일 때 구분명; 없으면 기본 청구서).
**줄 찾기 (`lines`)**: `[{ "orderNo": "…" }, { "item": "…" }, { "lineId": "…" }]` — 한 항목에 적은 칸이 모두 맞는 줄(오더번호·품명은 공백·대소문자 무시, `lineId` = 스냅샷 `bills[].lines[].lineId`). 항목마다 적어도 한 줄은 맞아야 하고, 아니면 오류.
**옮길 곳 (공통)**: `toBillId` 또는 `toLabel`(같은 달·거래처의 구분명) 또는 `toPrimary: true`. 아무것도 없으면 기본 청구서.
**청구완료(잠금)** 청구서: `bill.split` · `bill.moveLines` · `bill.merge`는 하지 않습니다(오류) — 앱에서 잠금을 푼 뒤 다시 요청하세요.
`bill.update`(label 외) · `bill.addLine` · `bill.updateLine` · `bill.removeLine` · `bill.remove`는 **`allowLocked: true`** 를 적었을 때만 합니다. 카드 맨 위와 그 동작에 빨간 **🔒 청구완료 청구서 수정** 경고가 나오고, 적용한 뒤에도 청구완료 잠금은 그대로입니다(고정본의 자동 줄은 그대로, 수동 줄만 반영). `allowLocked`는 사용자가 그 청구완료 청구서를 고치라고 분명히 말했을 때만 쓰세요. 앱 화면에서는 여전히 [잠금 해제]를 눌러야 고칠 수 있습니다.

**수동 줄 · 자동 줄**
- 자동 줄 = 매출 관리 · 최종 납품에서 앱이 계산하는 줄(구분: 자동 / 매출 연동 / 수정됨). 수동 줄 = 사람이(또는 `bill.addLine`으로) 적은 줄(구분: **수동**). 수동 줄은 자동 계산이 절대 바꾸거나 지우지 않습니다.
- 수량은 음수도 됩니다(빼는 줄). 공급가액 = 수량 × 단가(10원 미만 버림), 부가세 = 공급가액의 10%(10원 미만 버림), 총액 = 공급가액 + 부가세. 음수 줄은 합계를 줄입니다.
- 청구서마다 **자동 줄 켜짐/꺼짐**(`autoLines`)이 있습니다. 꺼진 청구서(수동 청구서)에는 자동 줄이 들어오지 않고, 자동 데이터가 없는 달에도 그대로 남습니다. 그 달 그 거래처의 자동 줄은 자동 줄이 켜진 기본 청구서로 갑니다 — 기본 청구서가 꺼져 있으면 자동 줄이 있을 때만 `"YYYY-MM|거래처#auto"` 청구서(구분 '자동')가 생깁니다.

```json
{ "type": "bill.split", "month": "2026-10", "client": "예시상사 A",
  "lines": [ { "orderNo": "EX-2610-13" } ], "label": "(예시)2차분" }
```

| 동작 | 칸 | 하는 일 |
|---|---|---|
| `bill.split` | 청구서 찾기, `lines`(필수), `label`(선택) | 고른 줄을 새 청구서로 옮김. 발행 일자·도착지는 원래 청구서 값을 물려받음. 모든 줄을 옮기면 경고(원래 청구서는 빔) |
| `bill.create` | `month`, `client`(필수), `label`, `issueDate`, `dest`, `memo`, `autoLines`(선택, 기본 true) | 빈 청구서를 만듦. `autoLines: false`면 항상 새 **수동 청구서**(자동 줄 없음). 아니면 그 달·거래처에 아무 청구서도 없을 때 기본 청구서, 있으면 나눈 청구서 |
| `bill.moveLines` | 청구서 찾기(옮길 줄이 있는 곳), 옮길 곳, `lines`(필수) | 같은 달·거래처 청구서끼리 줄을 옮김 |
| `bill.merge` | 청구서 찾기(나눈 청구서), 옮길 곳(선택, 기본=기본 청구서) | 줄을 모두 옮기고 그 청구서를 없앰. 기본 청구서는 합칠 수 없음 |
| `bill.update` | 청구서 찾기, `set{label, issueDate, dest, memo, month, autoLines}`, `convertAuto`(선택), `allowLocked`(선택) | 구분명 · 발행 일자 · 도착지 · 비고 · **청구 월 옮기기** · **자동 줄 켜기/끄기**. 자동 줄을 끄거나 월을 옮길 때 그 청구서의 자동 줄은 빠지고(원래 달 / 자동 줄을 받는 청구서로), `convertAuto: true`면 지금 값 그대로 수동 줄로 바꿔 남김. 월을 옮기면 id가 바뀜(카드에 새 id) — 뒤 동작에서는 `month`+`client`+`billLabel`로 가리키세요. 새 달에 기본 청구서가 없고 자동 줄이 켜져 있으면 그 달 기본 청구서가 되고, 아니면 그 달의 나눈 청구서가 됨 |
| `bill.addLine` | 청구서 찾기, `item`(필수), `qty`(필수, 음수 가능), `unitPrice`(필수), `orderNo` · `spec`(또는 `color`) · `memo` · `date`(선택), `allowLocked` | 수동 줄 추가. `date`를 적으면 출고 내역에도 그 날짜·수량이 나옴 |
| `bill.updateLine` | 청구서 찾기, `line{lineId}` 또는 `line{orderNo, item}`, `set{item, spec/color, orderNo, qty, unitPrice, memo, date}`, `allowLocked` | 수동 줄 하나 고치기. 맞는 수동 줄이 0개 또는 2개 이상이면 오류(→ `lineId`). 자동 줄은 고칠 수 없음 |
| `bill.removeLine` | 청구서 찾기, `lines`(수동 줄 찾기), `allowLocked` | 수동 줄 지우기. 자동 줄이 맞으면 오류 |
| `bill.remove` | 청구서 찾기, `force`(수동 줄 · 고친 줄이 있으면 필수), `excludeAuto`(선택), `allowLocked` | 청구서 삭제. **자동 줄만 있는 청구서**(다른 달에 청구한 출고 등)는 그 자동 줄을 그 달 청구에서 **제외**하고 사라짐(`excludeAuto: false`면 제외하지 않음 → 다시 생김). 수동 줄이 있는 청구서의 자동 줄은 `excludeAuto: true`일 때만 제외 |
| `bill.excludeLines` | 청구서 찾기, `lines`(선택, `[{orderNo} / {item} / {lineId}]`, 없으면 자동 줄 전부), `restore`(선택), `allowLocked` | 자동 줄을 그 달 청구에서 **제외**(누락 경고 · 이전 달 미청구 알림 없음, 매출 관리 · 생산 관리 데이터는 그대로). `restore: true`면 제외한 줄을 되돌림. 모든 자동 줄이 제외된 청구서는 목록에서 사라지고 '제외됨 N'에서 되돌릴 수 있음 |

- 같은 요청 안에서 앞 동작이 만든 청구서를 뒤 동작에서 `billLabel`/`toLabel`로 가리킬 수 있습니다.
- 카드에 새 청구서 id, 옮긴 줄 표, 청구서별 총액 전/후가 나옵니다. 적용은 한 번의 저장 → 앱에서 Ctrl+Z 한 번으로 되돌림.
- 앱 화면: [+ 줄 추가]로 수동 줄(오더번호 · 음수 수량 가능), [수정]에서 **청구 월** · **자동 줄** 켜기/끄기(자동 줄이 있으면 '수동 줄로 바꾸기 / 빼기'를 물음) · 청구서 삭제(확인), [+ 추가]에서 '수동 청구서' 선택.
- 앱 화면: 청구서 상세에서 줄 왼쪽 칸을 고르면 **나누기 (N)** · **옮기기 (N)**(같은 달·거래처 청구서가 2장 이상일 때), 나눈 청구서에는 **합치기**. 청구완료 청구서는 확인 후 잠금을 풀고 진행합니다.


#### 예시 시나리오 (모두 (예시) 이름 · 가짜 숫자)

**A) 10월 청구완료 청구서를 9월 선청구(수동 청구서)로 — 수주 수량 기준 6줄.** 사용자가 "청구완료된 10월 예시상사 A 청구서를 9월 선청구로 바꿔 줘"라고 분명히 말했을 때만 `allowLocked`.

```json
{ "version": 1, "id": "ex-prebill-a", "createdAt": "2026-11-20T06:00:00Z", "source": "grokbot",
  "note": "(예시) 10월 청구서를 9월 선청구로",
  "actions": [
    { "type": "bill.update", "month": "2026-10", "client": "예시상사 A",
      "set": { "month": "2026-09", "autoLines": false, "issueDate": "2026-09-30", "label": "(예시)선청구" },
      "convertAuto": false, "allowLocked": true },
    { "type": "bill.addLine", "month": "2026-09", "client": "예시상사 A", "billLabel": "(예시)선청구",
      "orderNo": "EX-2610-21", "item": "(예시) 방수원단 A", "color": "카키", "qty": 2000, "unitPrice": 3000,
      "memo": "(예시) 수주 수량 기준 선청구", "allowLocked": true },
    { "type": "bill.addLine", "month": "2026-09", "client": "예시상사 A", "billLabel": "(예시)선청구", "orderNo": "EX-2610-22", "item": "(예시) 코팅원단 B", "qty": 2000, "unitPrice": 4000, "allowLocked": true },
    { "type": "bill.addLine", "month": "2026-09", "client": "예시상사 A", "billLabel": "(예시)선청구", "orderNo": "EX-2610-23", "item": "(예시) 메쉬원단 C", "qty": 2000, "unitPrice": 2500, "allowLocked": true },
    { "type": "bill.addLine", "month": "2026-09", "client": "예시상사 A", "billLabel": "(예시)선청구", "item": "(예시) 원단 D", "qty": 2000, "unitPrice": 3500, "allowLocked": true },
    { "type": "bill.addLine", "month": "2026-09", "client": "예시상사 A", "billLabel": "(예시)선청구", "item": "(예시) 투습원단 E", "qty": 2000, "unitPrice": 3200, "allowLocked": true },
    { "type": "bill.addLine", "month": "2026-09", "client": "예시상사 A", "billLabel": "(예시)선청구", "item": "(예시) 보강원단 F", "qty": 2000, "unitPrice": 2800, "allowLocked": true }
  ] }
```
결과: 9월 '(예시)선청구'(청구완료 유지 · 자동 줄 꺼짐 · 발행 일자 2026-09-30 · 수동 6줄). 원래 10월의 자동 줄(실제 출고)은 10월 기본 청구서(미청구)로 다시 나타납니다. 잠금 유지를 원치 않으면 앱에서 잠금을 풀고 고치세요.

**B) 11월 '최종 납품' 청구서 — 최종 납품 수량으로 (수동 청구서).**

```json
{ "type": "bill.create", "month": "2026-11", "client": "예시상사 A", "label": "(예시)최종 납품", "autoLines": false, "issueDate": "2026-11-30" },
{ "type": "bill.addLine", "month": "2026-11", "client": "예시상사 A", "billLabel": "(예시)최종 납품", "orderNo": "EX-2610-21", "item": "(예시) 방수원단 A", "qty": 1950, "unitPrice": 3000 },
{ "type": "bill.addLine", "month": "2026-11", "client": "예시상사 A", "billLabel": "(예시)최종 납품", "orderNo": "EX-2610-22", "item": "(예시) 코팅원단 B", "qty": 2080, "unitPrice": 4000 }
```

**C) 11월 '차액' 청구서 — 선청구와 최종 납품의 차이 (+/− 줄).**

```json
{ "type": "bill.create", "month": "2026-11", "client": "예시상사 A", "label": "(예시)차액", "autoLines": false, "issueDate": "2026-11-30" },
{ "type": "bill.addLine", "month": "2026-11", "client": "예시상사 A", "billLabel": "(예시)차액", "orderNo": "EX-2610-21", "item": "(예시) 방수원단 A", "qty": -50, "unitPrice": 3000, "memo": "(예시) 선청구 2,000 − 최종 1,950" },
{ "type": "bill.addLine", "month": "2026-11", "client": "예시상사 A", "billLabel": "(예시)차액", "orderNo": "EX-2610-22", "item": "(예시) 코팅원단 B", "qty": 80, "unitPrice": 4000, "memo": "(예시) 최종 2,080 − 선청구 2,000" }
```
결과: −50 × 3,000 = 공급가액 −150,000 / 부가세 −15,000, +80 × 4,000 = 320,000 / 32,000 → 차액 청구서 총액 187,000. (B·C는 `actions` 배열 안에 넣으세요. 같은 달에 자동 줄이 생기면 그 줄은 자동 줄이 켜진 기본 청구서로 가고 B·C에는 섞이지 않습니다.)

### 3.15 거래처 정보 (명함) — `contact.attachImage` · `contact.add` · `contact.update`

별칭: `contact.addContact` = `contact.add`, `contact.updateContact` = `contact.update` (같은 동작). 파일 칸 별칭: `image` = `file`, `images` = `files`.

**명함 찾기** (`attachImage` · `update`): `contactId`(스냅샷 `contacts[].id`) 또는 `company` + `name`. 회사명 · 성함은 **띄어쓰기 · `(주)` · `㈜` · `주식회사` · 대소문자를 무시**하고 비교합니다 (`(주)예시상사 A` = `예시상사A`). 맞는 명함이 없거나 2장 이상이면 ⛔ 오류 — 여러 장이면 카드에 후보 id가 나오니 `contactId`로 다시 보내세요. `contactId`를 적으면 그것만 봅니다.

**명함 이미지 파일**: `file`(또는 `image`) 하나, 또는 `files`(또는 `images`) 배열(앞/뒤 등, 한 동작에 10장까지). 넷 중 하나만 적습니다. 경로 규칙은 3.8과 같음 — 요청 JSON보다 먼저 `inbox\files\…`에 넣고 inbox 기준 상대 경로(`files/cards/card_001.jpg`). JPG · PNG · WEBP · GIF · PDF, 20MB까지. 적용할 때 앱의 첨부 저장소로 복사하고, 원본은 요청 파일과 함께 `done\<요청이름>.files\`로 옮깁니다. 복사가 하나라도 실패하면 전부 되돌립니다. 명함 한 장에 이미지를 여러 장 붙일 수 있고, 거래처 정보 상세 창에 미리보기(누르면 크게 보기), 목록에 📎 N으로 보입니다.

| 동작 | 필드 | 설명 |
|---|---|---|
| `contact.attachImage` | 명함 찾기, `file`/`image` 또는 `files`/`images`, `replace`(선택) | 명함 이미지 첨부. 이미 있으면 **덧붙임**(같은 이름 파일은 ⚠ 건너뜀). `replace: true`면 기존 이미지를 모두 빼고 새 이미지로 — 카드에 ⚠ 경고(빠지는 파일 이름). 빠진 파일은 디스크에 남아 Ctrl+Z로 되돌릴 수 있음 |
| `contact.add` | `company` · `name`(둘 중 하나 필수), `team` `title` `email` `web` `memo`(문자열), `addrs` `tels` `faxes` `mobiles`(문자열 배열 — 문자열 하나도 됨), `file`/`files`/`image`/`images`(선택), `onDuplicate`(선택) | 새 명함. **중복**(같은 회사+성함, 위 규칙으로 비교)이면 카드에 ⚠ 경고와 함께 `onDuplicate`대로: `'skip'`(기본 — 건너뜀, 이미지도 붙이지 않음) · `'add'`(그래도 새로 추가) · `'fillEmpty'`(기존 명함의 빈 칸만 채우고 배열은 겹치지 않게 더함, 이미지는 기존 명함에 덧붙임. 중복이 2장 이상이면 오류) |
| `contact.update` | 명함 찾기, `set{company, name, team, title, email, web, memo, addrs, tels, faxes, mobiles}`, `fillEmptyOnly`(선택) | 명함 고치기. 기본은 적은 칸을 바꿈(배열은 통째로 바꿈). `fillEmptyOnly: true`면 **빈 칸만 채우고**(값이 있는 칸은 그대로 — 카드에 '유지'로 표시) 배열은 기존 값에 겹치지 않게 더함(전화번호는 숫자만 비교, `000 0000 0000` = `000-0000-0000`) |

- **거래처(회사)**: 앱에는 회사 목록이 따로 없고 명함의 회사명이 곧 거래처 정보의 회사입니다. 처음 보는 회사명으로 `add`하면 그 회사가 새로 생기고 카드에 ⚠ "새 거래처" 경고가 나옵니다. 생산 관리 · 매출 관리 · 거래명세서(공급받는자)에 비슷한 이름이 있으면 같이 알려 주니, 같은 회사면 그 이름으로 맞춰 보내세요. 사업자등록증은 요청으로 붙이지 않습니다.
- 같은 요청 안에서 `add`로 만든 명함에 뒤의 `attachImage`로 이미지를 더 붙일 수 있습니다 (company+name으로 찾음).
- 미리보기는 데이터를 바꾸지 않습니다(사본에서 실행). 적용 한 번 = 저장 한 번이라 Ctrl+Z 한 번으로 전부 되돌립니다(복사한 이미지 파일은 남지만 명함에서 빠짐).
- 한 요청에 동작 200개까지. 명함 150장은 30~50개씩 나눠 보내는 것을 권장합니다(카드 확인이 쉬움).

```json
{ "version": 1, "id": "ex-cards-001", "createdAt": "2026-11-20T07:00:00Z", "source": "grokbot",
  "note": "(예시) 명함 스캔 1차 (1/4)",
  "actions": [
    { "type": "contact.attachImage", "company": "예시상사 A", "name": "김예시",
      "files": ["files/cards/ga_front.jpg", "files/cards/ga_back.png"] },
    { "type": "contact.attachImage", "contactId": "ct_0001", "image": "files/cards/card_002.jpg" },
    { "type": "contact.attachImage", "company": "(예시)마바산업", "name": "박테스트",
      "file": "files/cards/ma_new.jpg", "replace": true },
    { "type": "contact.add", "company": "(예시)신규상사", "name": "신입일", "team": "(예시) 구매팀", "title": "대리",
      "email": "new01@example.com", "tels": ["000-0000-0000"], "mobiles": ["000-0000-0002"],
      "addrs": ["(예시) 서울시 ○○구 ○○로 00"], "memo": "(예시) 명함 스캔 OCR",
      "files": ["files/cards/new_001.jpg", "files/cards/new_001_back.jpg"] },
    { "type": "contact.add", "company": "㈜ (예시)다라무역", "name": "이샘플", "email": "sample@example.com",
      "tels": ["000-1111-2222"], "onDuplicate": "fillEmpty" },
    { "type": "contact.updateContact", "company": "(예시)거래처03", "name": "담당03", "fillEmptyOnly": true,
      "set": { "title": "과장", "tels": ["000-3333-4444"] } }
  ] }
```

### 3.16 (없어짐) 서류 보관함 — `docs.add`

서류 보관함 화면은 없앴습니다(2026-11-26). `docs.add`는 더 이상 받지 않습니다(「지원하지 않습니다」 오류). 첨부는 각 카테고리로 보내세요: 생산 관리 `production.attachFile`, TEST REPORT `testReport.attachFile`, 품질 기준 `quality.attachFile`, 거래처 명함·사업자등록증 `contact.attachImage`.

## 4. 전체 예시 파일

`2026-10-28_001_new-order.json`:

```json
{
  "version": 1,
  "id": "req-20261028-001",
  "createdAt": "2026-10-28T17:40:00+09:00",
  "source": "grokbot",
  "note": "(예시) 새 오더 등록 + 생지 출고 + 거래명세서",
  "actions": [
    { "type": "production.addOrder",
      "order": { "no": "EX-0002", "client": "예시상사 A", "item": "(예시) 방수 원단", "fabric": "(예시) NY 210D",
                 "date": "2026-10-20", "due": "2026-11-30",
                 "lines": [ { "color": "카키", "qty": 1500, "unit": "YD" }, { "color": "블랙", "qty": 800, "unit": "YD" } ],
                 "procs": [ { "name": "생지", "vendor": "(예시)A직물" }, { "name": "염색", "vendor": "(예시)B염색", "shrink": 5 } ] } },
    { "type": "production.addShipment", "orderNo": "EX-0002", "process": "생지",
      "ships": [ { "date": "2026-10-25", "qty": 1200, "memo": "1차" }, { "date": "2026-10-27", "qty": 1100, "memo": "2차" } ] },
    { "type": "statement.createFromOrder", "orderNo": "EX-0002", "date": "2026-10-28",
      "customer": "예시상사 A", "price": 3500, "note": "(예시) 1차분",
      "lots": [ { "lotNo": "A-2610-01", "color": "카키", "rolls": [55, 54, 56, 55, 53] },
                { "lotNo": "A-2610-02", "color": "블랙", "rolls": [52, 51, 50] } ],
      "open": true }
  ]
}
```

적용하면: 오더 EX-0002 생성 → 생지 공정에 출고 2건 → 거래명세서 1건(총 426 YD, 금액 1,491,000원) 저장,
`linkShip` 기본값 때문에 오더의 최종 납품에 2026-10-28 / 426 YD 줄이 연결되어 생기고(오더 완료·매출·청구서 수량이 이 줄 기준이 됨), 거래명세서 편집 화면이 열립니다.

## 5. 저장 위치 (데이터 파일)

- 적용·거부 기록은 `data.json`의 `requestLog`(최근 500건: `id`, `file`, `status` done/rejected, `at`, `summary`)에 남고, 요청함 화면 아래 **최근 처리**에 보입니다. JSON 내보내기/가져오기에도 포함됩니다.
- 요청으로 만든 거래명세서에는 `reqId`(요청 id)가 저장됩니다.

## 6. 한계

- 거래명세서는 "임시" 상태가 따로 없고 바로 일반 거래명세서로 저장됩니다 (목록에 **요청** 표시).
- `linkShip`(기본 true)은 최종 납품에 납품 줄을 만듭니다(마지막 공정 출고는 그대로). 최종 납품 줄이 하나라도 있으면 오더 완료 수량·매출 관리·청구서 수량은 최종 납품 합계를 따릅니다.
- 최종 납품은 마지막 공정 출고 줄마다 같은 날짜·수량의 **자동 줄**이 생깁니다(출고를 고치면 따라 바뀜, 사용자가 납품일·납품량을 고치거나 지우면 더는 따라가지 않음). `linkShip` 줄은 같은 날짜(여럿이면 수량이 가장 가까운), 없으면 같은 수량의 자동 줄을 대신합니다 — 겹쳐 세지 않음. 명세서를 지우면 그 자동 줄이 다시 생깁니다.
- 거래명세서의 공급받는자 정보(등록번호·주소)는 요청으로 만들지 않습니다 — 상호만 넣고 ⚠로 알려 줍니다. (거래처 정보의 명함은 3.15 `contact.*`로)
- 오더 삭제·공정 삭제·출고 수정/삭제, 거래명세서 수정은 아직 요청으로 할 수 없습니다.
- 첨부(`production.attachFile`)는 파일을 추가만 합니다. 첨부 삭제는 요청으로 할 수 없고, `replace: true`일 때만 기존 거래명세서 파일을 바꿉니다.
- 백업은 적용 직전 디스크의 `data.json` 기준입니다.

## 7. Lookup snapshot (조회용 스냅샷, 읽기 전용)

요청 파일은 앱 데이터를 **바꾸는** 통로이고, 스냅샷은 Grok Bot이 앱 데이터를 **조회만** 하는 통로입니다.

- 경로: `%APPDATA%\이조 영업관리\requests\snapshot\snapshot.json` (+ 같은 폴더의 `README.txt`)
- 갱신: 앱 시작 시, 그리고 저장할 때마다 약 2초 뒤(디바운스). `snapshot.json.tmp` 에 쓴 뒤 rename 하므로 읽는 쪽은 항상 완전한 파일을 봅니다. UTF-8, BOM 없음.
- 켜기/끄기: 설정 › **조회용 파일 만들기 (Grok Bot 조회)** (기본 켜짐). 끄면 폴더의 파일을 지우고 더 이상 만들지 않습니다.
- 넣지 않는 것: 비밀번호·토큰·OAuth·Google Drive 연결 정보, 앱 설정(화면 배치·열 너비 등), 첨부 파일 내용(이름만), 공고 일정·체크리스트.
- 이 파일을 고쳐도 앱에는 반영되지 않습니다. 변경은 §3 요청 파일로 하세요.
- `example: true` 인 항목은 앱의 (예시) 데이터입니다. 실제 질문에 답할 때는 제외하세요.
- 모든 목록 항목에 `search` (검색용으로 주요 글자 칸을 공백으로 이어 붙인 문자열)가 있습니다. 사용자가 말한 품명·색상·업체명을 `search` 에서 부분 일치(공백 무시 권장)로 찾으세요.
- 금액은 원(KRW), 수량은 각 항목의 `unit`(보통 YD). 소수 둘째 자리 반올림. 비어 있는 값은 `""` 또는 `null`.

### 최상위

| 키 | 설명 |
|---|---|
| `schema` | 형식 버전 (현재 `1`). 호환되지 않게 바뀌면 올라갑니다. |
| `app` / `appVersion` | `"ijo-sales"` / 앱 버전 (예: `"1.4.12"`) |
| `generatedAt` | 만든 시각 (ISO 8601, UTC) |
| `readOnly` | 항상 `true` |
| `priceSettings` | 단가 계산 설정: `fx` 환율(USD→KRW), `yd2m`(0.9144), `vat`(0.1), `defaultDyeShrink`/`defaultProc1Shrink`/`defaultProc2Shrink`/`defaultMargin` (비율, 0.05 = 5%) |
| `counts` | 각 목록의 건수 |
| `prices` `sales` `orders` `statements` `testReports` `contacts` `qualityStandards` `bills` | 아래 표 |

### `prices[]` — 단가 관리 (YD당, 원)

| 키 | 화면 이름 |
|---|---|
| `category` `part` `code` `item` `color` `width` | 구분 · 부위 · 코드 · 품명 · 색상 · 폭 |
| `greige` `{vendor,currency,price,priceKRW}` | 생지 업체 · 통화(KRW/USD) · 생지 단가 · 원화 환산 |
| `dye` `{vendor,shrink,price,cumulative}` | 염색 업체 · 염색 축(비율) · 염색 단가 · 염색 누계 |
| `proc1` / `proc2` `{vendor,desc,shrink,price,cumulative}` | 가공1/가공2 업체 · 가공 내용 · 축 · **가공 단가(가공료)** · 누계 |
| `processingFee` | **가공료 합계** = `proc1.price + proc2.price` |
| `etc` `{desc,price}` / `trans` | 기타부대비용 / TRANS(운임) |
| `marginRate` | 마진율 (비율) |
| `net` / `netPerM` | **NET 단가** (/YD) / NET (/M) |
| `margin` `offer` `offerPerM` `offerVat` `offerVatPerM` | 마진액 · OFFER · OFFER/M · OFFER+VAT · OFFER+VAT/M |
| `memo` | 메모 |

계산: 염색누계 = 생지 × (1+염색축) + 염색단가 → 가공1누계 = 염색누계 × (1+가공1축) + 가공1단가 → 가공2누계 → NET = 가공2누계 + 기타 + TRANS. 축이 비어 있고 그 공정 단가 > 0 이면 `priceSettings` 의 기본 축을 씁니다(스냅샷의 `shrink` 는 이미 적용된 값).

예) "(예시)방수가방 겉감 원단의 NET단가와 가공료" → `prices` 에서 `search` 에 "방수가방"·"겉감"이 들어간 항목 → `net`, `processingFee` (필요하면 `proc1`/`proc2` 내역과 `color` 별로 나눠 답하기).

### `sales[]` — 매출

`date` `year` `client` `orderNo` `item` `fabric` `process` `color` `unitPrice` `qty` `supply`(공급가액) `total`(합계, VAT 포함) `memo`

### `orders[]` — 생산 관리

`no`(오더번호) `item`(품목) `fabric`(아이템명) `client` `date`(발주일) `due`(납기일) `delivered`(오더 완료) `qty` `unit` `lines[]{color,qty,unit}`,
`processes[]{step,name,vendor,shrink(가공축 %),shippedQty,shipments[]{date,qty,memo,statementFiles[]}}`, `finalDelivery`(최종 납품 — 없으면 null){totalQty,stock(재고 = 최종 공정 출고 − 최종 납품),rows[]{date,qty,memo,statementFiles[]}}, `completedQty`(오더 완료 수량: 최종 납품 합계, 없으면 최종 공정 출고 합계), `workOrderFiles[]` `purchaseOrderFiles[]` (첨부 파일 이름)

### `statements[]` — 거래명세서

`no` `date` `orderNo` `item` `spec` `customer{reg,name,ceo,addr,biz,type}` `supplier`(공급자 상호) `dest`(납품처) `contact` `unitPrice` `note` `lots[]{lotNo,color,rolls[],qty}` `totalQty`

### `testReports[]` — TEST REPORT

`name`(품명/의뢰명) `lab`(시험기관) `reportNo`(접수번호) `received`(접수일) `completed`(완료일) `result`(결과) `failedItems`(불합격 항목) `memo` `files[]`(성적서 첨부 이름) `attached`(첨부 있음 true/false)

### `qualityStandards[]` — 품질 기준 (조달청 규격서)

`id` `name` `category`(분류) `specNo`(규격서 번호) `revised`(개정일) `org` `drawing` `irApplied` `usage` `material` `color` `memo` `types[]{type,stockNo,color}` `attached[]`(첨부 파일명) `appendix[]{title,columns,rows,text}` `fabrics[]{name,usage,material,color,ref,yarn,weave,width,tests[]{item,division,standard,unit,method,memo}}` `patterns[]{name,appliesTo,grade,colorfastness[]{color,일광,…},irMethod,irColors[],irReflectance[]{nm,ranges[]}}`
(`testReports[].linkedQuality` = `{name,fabric,specNo,qualityItemId,values,results[],rows[]}` 연결된 품질 기준과 입력한 결과값 · 판정, 3.13 참고)

### `contacts[]` — 거래처 정보 (명함)

`id`(고정 — 요청의 `contactId`로 사용. 예전 데이터의 id 없는 명함은 앱을 열 때 한 번 매겨 저장) `company` `name` `team` `title` `email` `web` `addrs[]` `tels[]` `faxes[]` `mobiles[]` `memo` `cards[]`(명함 이미지 파일 이름) `hasCard`(명함 이미지 있음 true) `cardCount`(장 수) `businessReg`

### `bills[]` — 청구서 (월 · 거래처별, 나눈 청구서는 따로 한 항목)

`id`(기본 `"YYYY-MM|거래처"`, 나눈 청구서 `"YYYY-MM|거래처#…"` — 요청의 `billId`로 사용) `label`(구분명, 기본 청구서는 보통 `""`) `primary`(기본 청구서 true) `autoLines`(자동 줄 켜짐 true / 수동 청구서 false) `billsForClientMonth`(같은 달·거래처 청구서 장수)
`month` `client` `status`(미청구/청구완료) `locked` `issueDate` `qty` `supply` `vat` `total` `warnings[]`
`lines[]{lineId,manual(수동 줄 true),item,spec,orderNo,qty,unitPrice,vatIncluded,supply,vat,total,memo,source(auto/sales/edited/manual)}` `shipments[]{date,item,orderNo,qty}` `excluded[]{orderNo,item,qty,reason(deleted/duplicate)}`(이 달 청구에서 제외한 자동 줄) `excludedOnly`(자동 줄이 모두 제외돼 목록에 안 보이는 청구서)
