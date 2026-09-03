# Employee

Canonical Employee module layout:

- `dashboard/` — dashboard engine
- `schedule/` — approved schedule engine
- `availability/` — next-week availability registration
- `attendance/` — attendance engine
- `swap/` — shift-swap engine
- `inventory/` — reserved for the inventory domain; backend work is still pending
- `app/` — Employee UI template
- `runtime/` — Employee runtime loader
- `index.html` — authenticated entry point

Each business area has one owning engine.