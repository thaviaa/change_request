/*
 * Business Rule: Reset overdue notify stamp
 * Table:     Change Request [change_request]
 * When:      before   Update: true   Order: 100
 * Condition: State changes
 * Advanced:  true
 *
 * When a Change moves state (e.g. Scheduled -> Implement), clear the
 * stamp so the next stage's reminder cycle starts fresh.
 */
(function executeRule(current, previous /*null when async*/) {
    current.setValue('u_overdue_last_notified', '');
})(current, previous);
