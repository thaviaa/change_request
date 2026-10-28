/*
 * Background script (DEV / TEST ONLY)
 * Clears u_overdue_last_notified on all Changes so the scheduled job
 * will notify again today. Run in System Definition > Scripts - Background.
 */
var gr = new GlideRecord('change_request');
gr.addNotNullQuery('u_overdue_last_notified');
gr.setValue('u_overdue_last_notified', '');
gr.setWorkflow(false);
gr.autoSysFields(false);
gr.updateMultiple();
gs.info('Cleared overdue stamp on all Changes');
