# Change Request – Overdue Notifications

**ADO:** User Story 231941 · **SCTASK:** SCTASK0051029 · **Sprint:** P58 (Release 2.0.0)
**Update set:** MECK - AT - 231941 - Change Overdue Notifications

Automated email reminders for Change Requests that are overdue in the **Scheduled** or **Implement** state.

## Acceptance criteria coverage

| AC | Requirement | Where |
|----|-------------|-------|
| AC1.1 | Scheduled, not On Hold, 1 hr past planned start; repeat each business day | `ChangeOverdueNotifier._process('state=-2^on_hold=false', 'start_date')` |
| AC1.2 | Implement, 1 hr past planned end; repeat each business day | `ChangeOverdueNotifier._process('state=-1', 'end_date')` |
| AC2 | Requester, requester's manager, ITS Change Management | Event parm1 + Notification group |
| AC3 | Subject, number, link, explanation | `notifications/change_overdue_update_required.html` |
| AC4 | No weekends/holidays; exclude On Hold | `GlideSchedule.isInSchedule()` + `on_hold=false` |

## Components (build order)

1. **Field** – `change_request.u_overdue_last_notified` (Date/Time, not on form)
2. **System property** – `its.change.overdue.schedule` = sys_id of the County business-hours schedule (with holidays)
3. **Event** – `change.overdue.notify` on `change_request`
4. **Business Rule** – [`business_rules/reset_overdue_notify_stamp.js`](business_rules/reset_overdue_notify_stamp.js)
5. **Script Include** – [`script_includes/ChangeOverdueNotifier.js`](script_includes/ChangeOverdueNotifier.js)
6. **Scheduled Job** – [`scheduled_jobs/change_overdue_notifications.js`](scheduled_jobs/change_overdue_notifications.js) (hourly)
7. **Notification** – [`notifications/change_overdue_update_required.html`](notifications/change_overdue_update_required.html)

## How it works

The hourly job exits outside business hours. Otherwise it finds overdue Changes, skips any already stamped today, fires `change.overdue.notify` (parm1 = requester + manager sys_ids, parm2 = `scheduled`/`implement`), and stamps `u_overdue_last_notified`. The Business Rule clears the stamp on any state change so the next stage starts a fresh cycle.

## Testing notes

- Execute Now outside business hours does nothing – point the property at a 24×7 schedule for off-hours testing.
- An event processed before the Notification was active won't send – use **Reprocess Event**.
- Check `sys_email` without a Mailbox filter; sent/skipped emails leave the Outbox.
- [`background_scripts/clear_overdue_stamp.js`](background_scripts/clear_overdue_stamp.js) resets stamps for re-testing (Dev only).
- "Send to event creator" must be checked if you are the requester on test Changes; uncheck before promoting.
