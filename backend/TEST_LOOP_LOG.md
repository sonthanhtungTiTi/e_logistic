# TEST_LOOP_LOG — Module 4 E2E Test History

File ghi lại từng vòng chạy test tự động, nguyên nhân lỗi, và file đã sửa.

---

## Vòng lặp #1 — 14:45:54 13/9/2026

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
