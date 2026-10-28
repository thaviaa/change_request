/*
 * Script Include: ChangeOverdueNotifier
 * Client callable: false
 * Accessible from: This application scope only
 */
var ChangeOverdueNotifier = Class.create();
ChangeOverdueNotifier.prototype = {

    initialize: function() {
        this.EVENT       = 'change.overdue.notify';
        this.STAMP_FIELD = 'u_overdue_last_notified';
        this.SCHEDULE_ID = gs.getProperty('its.change.overdue.schedule', '');

        this.now = new GlideDateTime();
        this.oneHourAgo = new GlideDateTime();
        this.oneHourAgo.addSeconds(-3600);

        // Local date of the "Run as" user (set that user's TZ to America/New_York)
        this.todayLocal = this.now.getLocalDate().getValue();
    },

    /* Entry point - called by the scheduled job */
    run: function() {
        if (!this._isBusinessTime()) {
            return; // AC4: weekends, holidays, off-hours
        }

        var sent = 0;
        // AC1.1 - Scheduled (-2), not On Hold, 1hr past planned start
        sent += this._process('state=-2^on_hold=false', 'start_date', 'scheduled');
        // AC1.2 - Implement (-1), 1hr past planned end
        sent += this._process('state=-1', 'end_date', 'implement');

        gs.info('[ChangeOverdueNotifier] Notifications queued: ' + sent);
    },

    _isBusinessTime: function() {
        if (!this.SCHEDULE_ID) {
            gs.warn('[ChangeOverdueNotifier] Property its.change.overdue.schedule is empty - skipping run');
            return false;
        }
        var sched = new GlideSchedule(this.SCHEDULE_ID);
        return sched.isInSchedule(this.now);
    },

    _process: function(baseQuery, dateField, stage) {
        var count = 0;
        var gr = new GlideRecord('change_request');
        gr.addEncodedQuery(baseQuery);
        gr.addNotNullQuery(dateField);
        gr.addQuery(dateField, '<=', this.oneHourAgo.getValue());
        gr.query();

        while (gr.next()) {
            if (this._notifiedToday(gr)) {
                continue; // AC1: one reminder per business day
            }

            gs.eventQueue(this.EVENT, gr, this._recipients(gr), stage);

            gr.setValue(this.STAMP_FIELD, this.now.getValue());
            gr.setWorkflow(false);    // don't fire BRs / reset rule
            gr.autoSysFields(false);  // don't touch sys_updated_on/by
            gr.update();
            count++;
        }
        return count;
    },

    _notifiedToday: function(gr) {
        var last = gr.getValue(this.STAMP_FIELD);
        if (!last) {
            return false;
        }
        var lastGdt = new GlideDateTime(last);
        return lastGdt.getLocalDate().getValue() == this.todayLocal;
    },

    /* AC2 - Requester + Requester's Manager (group handled on the Notification) */
    _recipients: function(gr) {
        var ids = [];
        var requester = gr.getValue('requested_by');
        if (requester) {
            ids.push(requester);
            var mgr = gr.requested_by.manager.toString();
            if (mgr) {
                ids.push(mgr);
            }
        }
        return ids.join(',');
    },

    type: 'ChangeOverdueNotifier'
};
