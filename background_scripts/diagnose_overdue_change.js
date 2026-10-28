/*
 * Background script - Bug 269679 triage
 * Read-only. Checks every point where an overdue Change notification can fail
 * for ONE Change. Run in Scripts - Background on the instance where QA tested.
 */
var CHG = 'CHG0000000'; // <-- QA's test Change number

var out = [];
function log(s) { out.push(s); }
function ok(cond, msg) { log((cond ? '[OK]   ' : '[FAIL] ') + msg); return cond; }

var now = new GlideDateTime();
var hourAgo = new GlideDateTime(); hourAgo.addSeconds(-3600);
log('Now (UTC): ' + now.getValue() + '   Now (local): ' + now.getDisplayValue());

// 1. Change record
var chg = new GlideRecord('change_request');
if (!chg.get('number', CHG)) {
    gs.info('Change ' + CHG + ' not found');
} else {
    var state = chg.getValue('state');
    log('\n--- Change ' + CHG + ' ---');
    log('State: ' + chg.getDisplayValue('state') + ' (' + state + ')');
    ok(state == '-2' || state == '-1', 'State is Scheduled (-2) or Implement (-1)');
    if (state == '-2') {
        ok(chg.getValue('on_hold') != '1' && chg.getValue('on_hold') != 'true', 'Not On Hold (on_hold=' + chg.getValue('on_hold') + ')');
    }
    var dateField = state == '-1' ? 'end_date' : 'start_date';
    var d = chg.getValue(dateField);
    ok(!!d, dateField + ' populated: ' + chg.getDisplayValue(dateField));
    if (d) ok(new GlideDateTime(d).compareTo(hourAgo) <= 0, dateField + ' is at least 1 hour in the past');
    var stamp = chg.getValue('u_overdue_last_notified');
    log('u_overdue_last_notified: ' + (stamp ? chg.getDisplayValue('u_overdue_last_notified') : '(empty)'));
    if (stamp) ok(new GlideDateTime(stamp).getLocalDate().getValue() != now.getLocalDate().getValue(),
        'Stamp is not today (if it is today, the job already ran for this Change and skips it)');

    // 2. Recipients
    log('\n--- Recipients ---');
    function checkUser(label, id) {
        var u = new GlideRecord('sys_user');
        if (!ok(id && u.get(id), label + ' set')) return;
        ok(u.getValue('active') == '1', label + ' ' + u.getDisplayValue() + ' is active');
        ok(!!u.getValue('email'), label + ' has email: ' + u.getValue('email'));
        ok(u.getValue('notification') == '2', label + ' notification = Enable');
    }
    checkUser('Requested by', chg.getValue('requested_by'));
    checkUser('Manager', chg.requested_by.manager.toString());

    // 3. Events for this Change
    log('\n--- Events change.overdue.notify ---');
    var ev = new GlideRecord('sysevent');
    ev.addQuery('name', 'change.overdue.notify');
    ev.addQuery('instance', chg.getUniqueValue());
    ev.orderByDesc('sys_created_on');
    ev.query();
    if (!ev.hasNext()) log('[FAIL] No events fired for this Change - job did not pick it up');
    while (ev.next()) log('  ' + ev.getDisplayValue('sys_created_on') + '  state=' + ev.getValue('state') + '  parm2=' + ev.getValue('parm2'));

    // 4. Emails for this Change (all mailboxes)
    log('\n--- sys_email (all mailboxes) ---');
    var em = new GlideRecord('sys_email');
    em.addQuery('instance', chg.getUniqueValue());
    em.addQuery('subject', 'CONTAINS', 'Update Required');
    em.orderByDesc('sys_created_on');
    em.query();
    if (!em.hasNext()) log('[FAIL] No overdue emails generated for this Change');
    while (em.next()) log('  ' + em.getDisplayValue('sys_created_on') + '  mailbox=' + em.getDisplayValue('mailbox') +
        '  type=' + em.getValue('type') + '  error=' + (em.getValue('error_string') || ''));
}

// 5. Configuration
log('\n--- Configuration ---');
var schedId = gs.getProperty('its.change.overdue.schedule', '');
if (ok(!!schedId, 'Property its.change.overdue.schedule set: ' + schedId)) {
    var s = new GlideRecord('cmn_schedule');
    if (ok(s.get(schedId), 'Schedule exists on this instance' + (s.isValidRecord() ? ': ' + s.getDisplayValue() : ' (sys_id from Dev does not exist here)'))) {
        ok(new GlideSchedule(schedId).isInSchedule(now), 'Now is inside the business schedule');
    }
}
var job = new GlideRecord('sysauto_script');
if (ok(job.get('name', 'Change Overdue Notifications'), 'Scheduled job exists')) {
    ok(job.getValue('active') == '1', 'Scheduled job active');
    log('  Run as: ' + job.getDisplayValue('run_as') + '   Repeat: ' + job.getDisplayValue('run_period'));
    var trig = new GlideRecord('sys_trigger');
    trig.addQuery('document_key', job.getUniqueValue());
    trig.query();
    if (ok(trig.next(), 'Job is queued in sys_trigger')) log('  Next run: ' + trig.getDisplayValue('next_action'));
}
var n = new GlideRecord('sysevent_email_action');
if (ok(n.get('name', 'Change Overdue - Update Required'), 'Notification exists')) {
    ok(n.getValue('active') == '1', 'Notification active');
    ok(n.getValue('event_parm_1') == '1', 'Event parm 1 contains recipient checked');
}
log('glide.email.smtp.active = ' + gs.getProperty('glide.email.smtp.active') + ' (false = emails logged as send-ignored, not delivered)');

gs.info(out.join('\n'));
