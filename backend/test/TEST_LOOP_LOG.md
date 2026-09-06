# TEST_LOOP_LOG — Module 4 E2E Test History

File ghi lại từng vòng chạy test tự động, nguyên nhân lỗi, và file đã sửa.

---

## Vòng lặp #1 — 23:01:28 15/8/2026

**Kết quả:** 15 PASS / 3 FAIL / 18 tổng

| | Test | Kết quả | Lỗi |
|---|---|---|---|
| ✅ | UC-16-01: Scan INTACT → status=IN_HUB_ORIGIN | PASS | — |
| ✅ | UC-16-02: Scan DAMAGED → status=EXCEPTION_INBOUND, is_flagged=true | PASS | — |
| ✅ | UC-16-03: Scan TORN_SEAL → status=EXCEPTION_INBOUND | PASS | — |
| ✅ | UC-16-04: Weight discrepancy >50g → weight_discrepancy_gram returned | PASS | — |
| ✅ | UC-16-05: Scan order with wrong status → 400 INVALID_STATE_TRANSITION | PASS | — |
| ✅ | UC-16-06: Non-existent tracking code → 404 ORDER_NOT_FOUND | PASS | — |
| ✅ | UC-16-07: ADMIN (no hubId) → 403 HUB_UNASSIGNED | PASS | — |
| ✅ | UC-16-08: Idempotency — same client_offline_id → cached result | PASS | — |
| ✅ | UC-17-01: Scan outbound → success | PASS | — |
| ✅ | UC-17-02: Scan locked (EXCEPTION_INBOUND) order → 422 ITEM_LOCKED | PASS | — |
| ✅ | UC-17-03: Scan order not in trip → 409 ITEM_NOT_IN_TRIP | PASS | — |
| ✅ | UC-17-04: Commit trip → shortage calculated for unscanned items | PASS | — |
| ❌ | UC-18-01: Start audit session → sessionCode returned | FAIL | `Expected 200, got 400: {"success":false,"message":"\"hubId\" is not allowed","co` |
| ❌ | UC-18-02: Sync scanned codes into audit session | FAIL | `sessionCode must exist from previous test` |
| ❌ | UC-18-03: Submit audit → missing items detected | FAIL | `sessionCode must exist` |
| ✅ | UC-19-01: GET /api/inventory/summary → returns hub inventory counts | PASS | — |
| ✅ | UC-19-02: GET /api/inventory/aging → returns aging items | PASS | — |
| ✅ | UC-19-03: GET movement-history for scanned order → returns log | PASS | — |

### Cần sửa:
- **UC-18-01: Start audit session → sessionCode returned**: Expected 200, got 400: {"success":false,"message":"\"hubId\" is not allowed","code":"VALIDATION_ERROR"}

400 !== 200

- **UC-18-02: Sync scanned codes into audit session**: sessionCode must exist from previous test
- **UC-18-03: Submit audit → missing items detected**: sessionCode must exist

---

## Vòng lặp #2 — 23:02:11 15/8/2026

**Kết quả:** 18 PASS / 0 FAIL / 18 tổng

| | Test | Kết quả | Lỗi |
|---|---|---|---|
| ✅ | UC-16-01: Scan INTACT → status=IN_HUB_ORIGIN | PASS | — |
| ✅ | UC-16-02: Scan DAMAGED → status=EXCEPTION_INBOUND, is_flagged=true | PASS | — |
| ✅ | UC-16-03: Scan TORN_SEAL → status=EXCEPTION_INBOUND | PASS | — |
| ✅ | UC-16-04: Weight discrepancy >50g → weight_discrepancy_gram returned | PASS | — |
| ✅ | UC-16-05: Scan order with wrong status → 400 INVALID_STATE_TRANSITION | PASS | — |
| ✅ | UC-16-06: Non-existent tracking code → 404 ORDER_NOT_FOUND | PASS | — |
| ✅ | UC-16-07: ADMIN (no hubId) → 403 HUB_UNASSIGNED | PASS | — |
| ✅ | UC-16-08: Idempotency — same client_offline_id → cached result | PASS | — |
| ✅ | UC-17-01: Scan outbound → success | PASS | — |
| ✅ | UC-17-02: Scan locked (EXCEPTION_INBOUND) order → 422 ITEM_LOCKED | PASS | — |
| ✅ | UC-17-03: Scan order not in trip → 409 ITEM_NOT_IN_TRIP | PASS | — |
| ✅ | UC-17-04: Commit trip → shortage calculated for unscanned items | PASS | — |
| ✅ | UC-18-01: Start audit session → sessionCode returned | PASS | — |
| ✅ | UC-18-02: Sync scanned codes into audit session | PASS | — |
| ✅ | UC-18-03: Submit audit → missing items detected | PASS | — |
| ✅ | UC-19-01: GET /api/inventory/summary → returns hub inventory counts | PASS | — |
| ✅ | UC-19-02: GET /api/inventory/aging → returns aging items | PASS | — |
| ✅ | UC-19-03: GET movement-history for scanned order → returns log | PASS | — |

### Tất cả test PASS ✅

---

## Vòng lặp #3 — 23:03:55 15/8/2026

**Kết quả:** 18 PASS / 0 FAIL / 18 tổng

| | Test | Kết quả | Lỗi |
|---|---|---|---|
| ✅ | UC-16-01: Scan INTACT → status=IN_HUB_ORIGIN | PASS | — |
| ✅ | UC-16-02: Scan DAMAGED → status=EXCEPTION_INBOUND, is_flagged=true | PASS | — |
| ✅ | UC-16-03: Scan TORN_SEAL → status=EXCEPTION_INBOUND | PASS | — |
| ✅ | UC-16-04: Weight discrepancy >50g → weight_discrepancy_gram returned | PASS | — |
| ✅ | UC-16-05: Scan order with wrong status → 400 INVALID_STATE_TRANSITION | PASS | — |
| ✅ | UC-16-06: Non-existent tracking code → 404 ORDER_NOT_FOUND | PASS | — |
| ✅ | UC-16-07: ADMIN (no hubId) → 403 HUB_UNASSIGNED | PASS | — |
| ✅ | UC-16-08: Idempotency — same client_offline_id → cached result | PASS | — |
| ✅ | UC-17-01: Scan outbound → success | PASS | — |
| ✅ | UC-17-02: Scan locked (EXCEPTION_INBOUND) order → 422 ITEM_LOCKED | PASS | — |
| ✅ | UC-17-03: Scan order not in trip → 409 ITEM_NOT_IN_TRIP | PASS | — |
| ✅ | UC-17-04: Commit trip → shortage calculated for unscanned items | PASS | — |
| ✅ | UC-18-01: Start audit session → sessionCode returned | PASS | — |
| ✅ | UC-18-02: Sync scanned codes into audit session | PASS | — |
| ✅ | UC-18-03: Submit audit → missing items detected | PASS | — |
| ✅ | UC-19-01: GET /api/inventory/summary → returns hub inventory counts | PASS | — |
| ✅ | UC-19-02: GET /api/inventory/aging → returns aging items | PASS | — |
| ✅ | UC-19-03: GET movement-history for scanned order → returns log | PASS | — |

### Tất cả test PASS ✅

---

## Vòng lặp #4 — 23:04:52 15/8/2026

**Kết quả:** 18 PASS / 0 FAIL / 18 tổng

| | Test | Kết quả | Lỗi |
|---|---|---|---|
| ✅ | UC-16-01: Scan INTACT → status=IN_HUB_ORIGIN | PASS | — |
| ✅ | UC-16-02: Scan DAMAGED → status=EXCEPTION_INBOUND, is_flagged=true | PASS | — |
| ✅ | UC-16-03: Scan TORN_SEAL → status=EXCEPTION_INBOUND | PASS | — |
| ✅ | UC-16-04: Weight discrepancy >50g → weight_discrepancy_gram returned | PASS | — |
| ✅ | UC-16-05: Scan order with wrong status → 400 INVALID_STATE_TRANSITION | PASS | — |
| ✅ | UC-16-06: Non-existent tracking code → 404 ORDER_NOT_FOUND | PASS | — |
| ✅ | UC-16-07: ADMIN (no hubId) → 403 HUB_UNASSIGNED | PASS | — |
| ✅ | UC-16-08: Idempotency — same client_offline_id → cached result | PASS | — |
| ✅ | UC-17-01: Scan outbound → success | PASS | — |
| ✅ | UC-17-02: Scan locked (EXCEPTION_INBOUND) order → 422 ITEM_LOCKED | PASS | — |
| ✅ | UC-17-03: Scan order not in trip → 409 ITEM_NOT_IN_TRIP | PASS | — |
| ✅ | UC-17-04: Commit trip → shortage calculated for unscanned items | PASS | — |
| ✅ | UC-18-01: Start audit session → sessionCode returned | PASS | — |
| ✅ | UC-18-02: Sync scanned codes into audit session | PASS | — |
| ✅ | UC-18-03: Submit audit → missing items detected | PASS | — |
| ✅ | UC-19-01: GET /api/inventory/summary → returns hub inventory counts | PASS | — |
| ✅ | UC-19-02: GET /api/inventory/aging → returns aging items | PASS | — |
| ✅ | UC-19-03: GET movement-history for scanned order → returns log | PASS | — |

### Tất cả test PASS ✅

---

## Vòng lặp #5 — 23:32:31 15/8/2026

**Kết quả:** 18 PASS / 0 FAIL / 18 tổng

| | Test | Kết quả | Lỗi |
|---|---|---|---|
| ✅ | UC-16-01: Scan INTACT → status=IN_HUB_ORIGIN | PASS | — |
| ✅ | UC-16-02: Scan DAMAGED → status=EXCEPTION_INBOUND, is_flagged=true | PASS | — |
| ✅ | UC-16-03: Scan TORN_SEAL → status=EXCEPTION_INBOUND | PASS | — |
| ✅ | UC-16-04: Weight discrepancy >50g → weight_discrepancy_gram returned | PASS | — |
| ✅ | UC-16-05: Scan order with wrong status → 400 INVALID_STATE_TRANSITION | PASS | — |
| ✅ | UC-16-06: Non-existent tracking code → 404 ORDER_NOT_FOUND | PASS | — |
| ✅ | UC-16-07: ADMIN (no hubId) → 403 HUB_UNASSIGNED | PASS | — |
| ✅ | UC-16-08: Idempotency — same client_offline_id → cached result | PASS | — |
| ✅ | UC-17-01: Scan outbound → success | PASS | — |
| ✅ | UC-17-02: Scan locked (EXCEPTION_INBOUND) order → 422 ITEM_LOCKED | PASS | — |
| ✅ | UC-17-03: Scan order not in trip → 409 ITEM_NOT_IN_TRIP | PASS | — |
| ✅ | UC-17-04: Commit trip → shortage calculated for unscanned items | PASS | — |
| ✅ | UC-18-01: Start audit session → sessionCode returned | PASS | — |
| ✅ | UC-18-02: Sync scanned codes into audit session | PASS | — |
| ✅ | UC-18-03: Submit audit → missing items detected | PASS | — |
| ✅ | UC-19-01: GET /api/inventory/summary → returns hub inventory counts | PASS | — |
| ✅ | UC-19-02: GET /api/inventory/aging → returns aging items | PASS | — |
| ✅ | UC-19-03: GET movement-history for scanned order → returns log | PASS | — |

### Tất cả test PASS ✅

---

## Vòng lặp #6 — 23:36:15 15/8/2026

**Kết quả:** 18 PASS / 0 FAIL / 18 tổng

| | Test | Kết quả | Lỗi |
|---|---|---|---|
| ✅ | UC-16-01: Scan INTACT → status=IN_HUB_ORIGIN | PASS | — |
| ✅ | UC-16-02: Scan DAMAGED → status=EXCEPTION_INBOUND, is_flagged=true | PASS | — |
| ✅ | UC-16-03: Scan TORN_SEAL → status=EXCEPTION_INBOUND | PASS | — |
| ✅ | UC-16-04: Weight discrepancy >50g → weight_discrepancy_gram returned | PASS | — |
| ✅ | UC-16-05: Scan order with wrong status → 400 INVALID_STATE_TRANSITION | PASS | — |
| ✅ | UC-16-06: Non-existent tracking code → 404 ORDER_NOT_FOUND | PASS | — |
| ✅ | UC-16-07: ADMIN (no hubId) → 403 HUB_UNASSIGNED | PASS | — |
| ✅ | UC-16-08: Idempotency — same client_offline_id → cached result | PASS | — |
| ✅ | UC-17-01: Scan outbound → success | PASS | — |
| ✅ | UC-17-02: Scan locked (EXCEPTION_INBOUND) order → 422 ITEM_LOCKED | PASS | — |
| ✅ | UC-17-03: Scan order not in trip → 409 ITEM_NOT_IN_TRIP | PASS | — |
| ✅ | UC-17-04: Commit trip → shortage calculated for unscanned items | PASS | — |
| ✅ | UC-18-01: Start audit session → sessionCode returned | PASS | — |
| ✅ | UC-18-02: Sync scanned codes into audit session | PASS | — |
| ✅ | UC-18-03: Submit audit → missing items detected | PASS | — |
| ✅ | UC-19-01: GET /api/inventory/summary → returns hub inventory counts | PASS | — |
| ✅ | UC-19-02: GET /api/inventory/aging → returns aging items | PASS | — |
| ✅ | UC-19-03: GET movement-history for scanned order → returns log | PASS | — |

### Tất cả test PASS ✅

---

## Vòng lặp #7 — 23:36:55 15/8/2026

**Kết quả:** 18 PASS / 0 FAIL / 18 tổng

| | Test | Kết quả | Lỗi |
|---|---|---|---|
| ✅ | UC-16-01: Scan INTACT → status=IN_HUB_ORIGIN | PASS | — |
| ✅ | UC-16-02: Scan DAMAGED → status=EXCEPTION_INBOUND, is_flagged=true | PASS | — |
| ✅ | UC-16-03: Scan TORN_SEAL → status=EXCEPTION_INBOUND | PASS | — |
| ✅ | UC-16-04: Weight discrepancy >50g → weight_discrepancy_gram returned | PASS | — |
| ✅ | UC-16-05: Scan order with wrong status → 400 INVALID_STATE_TRANSITION | PASS | — |
| ✅ | UC-16-06: Non-existent tracking code → 404 ORDER_NOT_FOUND | PASS | — |
| ✅ | UC-16-07: ADMIN (no hubId) → 403 HUB_UNASSIGNED | PASS | — |
| ✅ | UC-16-08: Idempotency — same client_offline_id → cached result | PASS | — |
| ✅ | UC-17-01: Scan outbound → success | PASS | — |
| ✅ | UC-17-02: Scan locked (EXCEPTION_INBOUND) order → 422 ITEM_LOCKED | PASS | — |
| ✅ | UC-17-03: Scan order not in trip → 409 ITEM_NOT_IN_TRIP | PASS | — |
| ✅ | UC-17-04: Commit trip → shortage calculated for unscanned items | PASS | — |
| ✅ | UC-18-01: Start audit session → sessionCode returned | PASS | — |
| ✅ | UC-18-02: Sync scanned codes into audit session | PASS | — |
| ✅ | UC-18-03: Submit audit → missing items detected | PASS | — |
| ✅ | UC-19-01: GET /api/inventory/summary → returns hub inventory counts | PASS | — |
| ✅ | UC-19-02: GET /api/inventory/aging → returns aging items | PASS | — |
| ✅ | UC-19-03: GET movement-history for scanned order → returns log | PASS | — |

### Tất cả test PASS ✅

---

## Vòng lặp #8 — 23:39:31 15/8/2026

**Kết quả:** 18 PASS / 0 FAIL / 18 tổng

| | Test | Kết quả | Lỗi |
|---|---|---|---|
| ✅ | UC-16-01: Scan INTACT → status=IN_HUB_ORIGIN | PASS | — |
| ✅ | UC-16-02: Scan DAMAGED → status=EXCEPTION_INBOUND, is_flagged=true | PASS | — |
| ✅ | UC-16-03: Scan TORN_SEAL → status=EXCEPTION_INBOUND | PASS | — |
| ✅ | UC-16-04: Weight discrepancy >50g → weight_discrepancy_gram returned | PASS | — |
| ✅ | UC-16-05: Scan order with wrong status → 400 INVALID_STATE_TRANSITION | PASS | — |
| ✅ | UC-16-06: Non-existent tracking code → 404 ORDER_NOT_FOUND | PASS | — |
| ✅ | UC-16-07: ADMIN (no hubId) → 403 HUB_UNASSIGNED | PASS | — |
| ✅ | UC-16-08: Idempotency — same client_offline_id → cached result | PASS | — |
| ✅ | UC-17-01: Scan outbound → success | PASS | — |
| ✅ | UC-17-02: Scan locked (EXCEPTION_INBOUND) order → 422 ITEM_LOCKED | PASS | — |
| ✅ | UC-17-03: Scan order not in trip → 409 ITEM_NOT_IN_TRIP | PASS | — |
| ✅ | UC-17-04: Commit trip → shortage calculated for unscanned items | PASS | — |
| ✅ | UC-18-01: Start audit session → sessionCode returned | PASS | — |
| ✅ | UC-18-02: Sync scanned codes into audit session | PASS | — |
| ✅ | UC-18-03: Submit audit → missing items detected | PASS | — |
| ✅ | UC-19-01: GET /api/inventory/summary → returns hub inventory counts | PASS | — |
| ✅ | UC-19-02: GET /api/inventory/aging → returns aging items | PASS | — |
| ✅ | UC-19-03: GET movement-history for scanned order → returns log | PASS | — |

### Tất cả test PASS ✅

---

## Vòng lặp #9 — 19:58:39 18/8/2026

**Kết quả:** 18 PASS / 0 FAIL / 18 tổng

| | Test | Kết quả | Lỗi |
|---|---|---|---|
| ✅ | UC-16-01: Scan INTACT → status=IN_HUB_ORIGIN | PASS | — |
| ✅ | UC-16-02: Scan DAMAGED → status=EXCEPTION_INBOUND, is_flagged=true | PASS | — |
| ✅ | UC-16-03: Scan TORN_SEAL → status=EXCEPTION_INBOUND | PASS | — |
| ✅ | UC-16-04: Weight discrepancy >50g → weight_discrepancy_gram returned | PASS | — |
| ✅ | UC-16-05: Scan order with wrong status → 400 INVALID_STATE_TRANSITION | PASS | — |
| ✅ | UC-16-06: Non-existent tracking code → 404 ORDER_NOT_FOUND | PASS | — |
| ✅ | UC-16-07: ADMIN (no hubId) → 403 HUB_UNASSIGNED | PASS | — |
| ✅ | UC-16-08: Idempotency — same client_offline_id → cached result | PASS | — |
| ✅ | UC-17-01: Scan outbound → success | PASS | — |
| ✅ | UC-17-02: Scan locked (EXCEPTION_INBOUND) order → 422 ITEM_LOCKED | PASS | — |
| ✅ | UC-17-03: Scan order not in trip → 409 ITEM_NOT_IN_TRIP | PASS | — |
| ✅ | UC-17-04: Commit trip → shortage calculated for unscanned items | PASS | — |
| ✅ | UC-18-01: Start audit session → sessionCode returned | PASS | — |
| ✅ | UC-18-02: Sync scanned codes into audit session | PASS | — |
| ✅ | UC-18-03: Submit audit → missing items detected | PASS | — |
| ✅ | UC-19-01: GET /api/inventory/summary → returns hub inventory counts | PASS | — |
| ✅ | UC-19-02: GET /api/inventory/aging → returns aging items | PASS | — |
| ✅ | UC-19-03: GET movement-history for scanned order → returns log | PASS | — |

### Tất cả test PASS ✅

---

## Vòng lặp #10 — 19:59:23 18/8/2026

**Kết quả:** 18 PASS / 0 FAIL / 18 tổng

| | Test | Kết quả | Lỗi |
|---|---|---|---|
| ✅ | UC-16-01: Scan INTACT → status=IN_HUB_ORIGIN | PASS | — |
| ✅ | UC-16-02: Scan DAMAGED → status=EXCEPTION_INBOUND, is_flagged=true | PASS | — |
| ✅ | UC-16-03: Scan TORN_SEAL → status=EXCEPTION_INBOUND | PASS | — |
| ✅ | UC-16-04: Weight discrepancy >50g → weight_discrepancy_gram returned | PASS | — |
| ✅ | UC-16-05: Scan order with wrong status → 400 INVALID_STATE_TRANSITION | PASS | — |
| ✅ | UC-16-06: Non-existent tracking code → 404 ORDER_NOT_FOUND | PASS | — |
| ✅ | UC-16-07: ADMIN (no hubId) → 403 HUB_UNASSIGNED | PASS | — |
| ✅ | UC-16-08: Idempotency — same client_offline_id → cached result | PASS | — |
| ✅ | UC-17-01: Scan outbound → success | PASS | — |
| ✅ | UC-17-02: Scan locked (EXCEPTION_INBOUND) order → 422 ITEM_LOCKED | PASS | — |
| ✅ | UC-17-03: Scan order not in trip → 409 ITEM_NOT_IN_TRIP | PASS | — |
| ✅ | UC-17-04: Commit trip → shortage calculated for unscanned items | PASS | — |
| ✅ | UC-18-01: Start audit session → sessionCode returned | PASS | — |
| ✅ | UC-18-02: Sync scanned codes into audit session | PASS | — |
| ✅ | UC-18-03: Submit audit → missing items detected | PASS | — |
| ✅ | UC-19-01: GET /api/inventory/summary → returns hub inventory counts | PASS | — |
| ✅ | UC-19-02: GET /api/inventory/aging → returns aging items | PASS | — |
| ✅ | UC-19-03: GET movement-history for scanned order → returns log | PASS | — |

### Tất cả test PASS ✅

---
