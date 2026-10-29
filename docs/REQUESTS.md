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

- **Windows**: `%APPDATA%\이조 영업관리\requests\inbox`
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
    "no": "2610-0101", "client": "(예시)가나상사", "item": "(예시) 방수 원단", "fabric": "(예시) NY 210D",
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
{ "type": "production.updateOrder", "orderNo": "2509-0328",
  "set": { "due": "2026-12-15", "client": "(예시)가나상사" } }
```

`set`에 넣을 수 있는 것: `item`, `fabric`, `client`, `date`, `due`, `lines`(통째로 바꿈). 카드에 바뀌기 전 → 후가 보입니다.

### 3.3 `production.addShipment` — 공정에 출고 행 추가

```json
{ "type": "production.addShipment", "orderNo": "2610-0101", "process": "염색",
  "ships": [ { "date": "2026-10-28", "qty": 800, "memo": "2차" } ] }
```

| 필드 | 설명 |
|---|---|
| `orderNo` ✔ | 오더번호 |
| `process` | 공정명 (같은 이름 공정이 여러 개면 `processNo` 필요) |
| `processNo` | 공정 순서 (1부터). `process`와 함께 쓰면 이름이 맞는지 확인 |
| `addProcess` | `true`면 `process` 이름의 공정이 없을 때 맨 뒤에 새로 만듦 |
| `vendor`, `shrink` | 새 공정을 만들 때의 가공 업체·가공 축(%) |
| `ships[]` ✔ | `date` ✔ 출고일, `qty` ✔ 출고량(숫자), `memo` 메모 |

### 3.4 `production.setDone` — 오더 완료 표시

```json
{ "type": "production.setDone", "orderNo": "2509-0328", "done": true }
```

`done`을 빼면 `true`. `false`면 완료 해제.

### 3.5 `statement.createFromOrder` — 오더로 거래명세서 작성

거래명세서 화면의 **[+ 거래명세서 작성] → 생산 오더에서 불러오기**와 같은 방식입니다
(오더번호·품명·규격·거래처를 오더에서 가져오고, 번호·공급자는 자동).

```json
{ "type": "statement.createFromOrder", "orderNo": "2610-0101", "date": "2026-10-28",
  "customer": "(예시)가나상사", "price": 3500, "note": "(예시) 1차분",
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
| `linkShip` | 생산 관리 출고에 반영 | 기본 `true` — 오더의 **마지막 공정**에 출고일·총 수량 출고 행을 연결해 만듦 (화면의 체크박스와 같음) |
| `open` | | 기본 `true` — 적용 후 이 거래명세서를 바로 엽니다 |

요청으로 만든 거래명세서는 목록에 **요청** 표시가 붙고, 일반 거래명세서처럼 고치고 인쇄·PDF 저장할 수 있습니다.

### 3.6 `sales.addRow` — 매출 관리에 한 줄 (선택)

```json
{ "type": "sales.addRow",
  "row": { "date": "2026-10-28", "client": "(예시)가나상사", "orderNo": "2610-0101", "item": "(예시) 방수 원단",
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

`item`(ITEM) 또는 `code`(CODE) 필수. `cat` 구분, `part` 파트, `color`, `width` 폭,
`gV` 생지 공장 · `gCur` 생지 통화(`KRW`/`USD`) · `g` 생지 가격,
`dV` 염색 공장 · `d` 염색 가격 · `dS` 염색 축,
`p1V`/`p2V` 가공소 · `p1D`/`p2D` 가공내역 · `p1`/`p2` 가공 가격 · `p1S`/`p2S` 가공 축,
`eD` 기타 내용 · `e` 기타 금액 · `t` TRANS(운임) · `m` 마진율 · `memo`.
**비율(`dS`, `p1S`, `p2S`, `m`)은 소수**로 적습니다 (13% → `0.13`). 비워 두면 설정의 기본값.

### 3.8 `production.attachFile` — 오더에 파일 첨부 (출고별 거래명세서 · 작업의뢰서 · 발주서)

첨부할 파일(PDF·JPG·PNG·WEBP·GIF, 20MB까지)은 **요청 JSON보다 먼저** `inbox` 안의 하위 폴더(예: `inbox\files\`)에 넣고, `file`에 inbox 기준 **상대 경로**를 적습니다.
절대 경로(`C:\...`, `/...`), `..`, 심볼릭 링크, inbox 밖을 가리키는 경로는 카드에서 ⛔ 오류로 막힙니다. base64로 JSON에 넣는 방식은 지원하지 않습니다 (요청 JSON 2MB 제한 그대로).

```json
{ "type": "production.attachFile", "orderNo": "2610-0101", "kind": "statement",
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
1. `process`·`processNo`·`shipDate`·`shipQty`를 모두 생략하면, **같은 요청 앞쪽에서 이 오더에 마지막으로 추가된 출고 줄**(`production.addShipment`의 마지막 행, 또는 `statement.createFromOrder`의 `linkShip` 행)에 붙입니다. 없으면 오류.
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
    { "type": "production.addShipment", "orderNo": "2610-0101", "process": "염색",
      "ships": [ { "date": "2026-10-29", "qty": 1200, "memo": "(예시) 1차 출고" } ] },
    { "type": "production.attachFile", "orderNo": "2610-0101", "kind": "statement",
      "file": "files/sample_statement_2610-0101.pdf", "comment": "방금 추가한 출고 줄에 붙임" }
  ]
}
```

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
      "order": { "no": "2610-0101", "client": "(예시)가나상사", "item": "(예시) 방수 원단", "fabric": "(예시) NY 210D",
                 "date": "2026-10-20", "due": "2026-11-30",
                 "lines": [ { "color": "카키", "qty": 1500, "unit": "YD" }, { "color": "블랙", "qty": 800, "unit": "YD" } ],
                 "procs": [ { "name": "생지", "vendor": "(예시)A직물" }, { "name": "염색", "vendor": "(예시)B염색", "shrink": 5 } ] } },
    { "type": "production.addShipment", "orderNo": "2610-0101", "process": "생지",
      "ships": [ { "date": "2026-10-25", "qty": 1200, "memo": "1차" }, { "date": "2026-10-27", "qty": 1100, "memo": "2차" } ] },
    { "type": "statement.createFromOrder", "orderNo": "2610-0101", "date": "2026-10-28",
      "customer": "(예시)가나상사", "price": 3500, "note": "(예시) 1차분",
      "lots": [ { "lotNo": "A-2610-01", "color": "카키", "rolls": [55, 54, 56, 55, 53] },
                { "lotNo": "A-2610-02", "color": "블랙", "rolls": [52, 51, 50] } ],
      "open": true }
  ]
}
```

적용하면: 오더 2610-0101 생성 → 생지 공정에 출고 2건 → 거래명세서 1건(총 426 YD, 금액 1,491,000원) 저장,
`linkShip` 기본값 때문에 염색(마지막) 공정에 2026-10-28 / 426 YD 출고 행이 연결되어 생기고, 거래명세서 편집 화면이 열립니다.

## 5. 저장 위치 (데이터 파일)

- 적용·거부 기록은 `data.json`의 `requestLog`(최근 500건: `id`, `file`, `status` done/rejected, `at`, `summary`)에 남고, 요청함 화면 아래 **최근 처리**에 보입니다. JSON 내보내기/가져오기에도 포함됩니다.
- 요청으로 만든 거래명세서에는 `reqId`(요청 id)가 저장됩니다.

## 6. 한계

- 거래명세서는 "임시" 상태가 따로 없고 바로 일반 거래명세서로 저장됩니다 (목록에 **요청** 표시).
- `linkShip`(기본 true)은 마지막 공정에 출고 행을 만듭니다. 같은 요청에서 마지막 공정에 같은 출고를 `addShipment`로 또 넣으면 두 번 잡히니, 둘 중 하나만 쓰세요 (`linkShip: false`).
- 거래처 정보(등록번호·주소)는 요청으로 만들지 않습니다 — 상호만 넣고 ⚠로 알려 줍니다.
- 오더 삭제·공정 삭제·출고 수정/삭제, 거래명세서 수정은 아직 요청으로 할 수 없습니다.
- 첨부(`production.attachFile`)는 파일을 추가만 합니다. 첨부 삭제는 요청으로 할 수 없고, `replace: true`일 때만 기존 거래명세서 파일을 바꿉니다.
- 백업은 적용 직전 디스크의 `data.json` 기준입니다.
