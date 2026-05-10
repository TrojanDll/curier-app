# docs/INDEX.md

Project documentation cache. Each entry links to a detailed doc file.

<!-- Формат: - [Title](file.md) — одна строка описания -->

- [Backend Conventions](backend-conventions.md) — tooling, DTO+controller patterns, list query format, e2e testing helper, commit style, progress protocol
- [Auth — Backend Reference](auth.md) — JWT/refresh endpoints, guards, decorators, payload shape (Stage 2.3)
- [Couriers — Backend Reference](couriers.md) — admin CRUD + courier self-service endpoints, list query format, response shapes (Stage 2.4)
- [Orders — Backend Reference](orders.md) — admin CRUD + courier status flow, order_number sequence, reassign + transition rules (Stage 2.5)
- [Assignment — Backend Reference](assignment.md) — auto-assign + queue drainer, advisory lock + CAS, eligibility/ordering rules, trigger points (Stage 2.6)
