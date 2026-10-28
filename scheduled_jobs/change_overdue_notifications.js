/*
 * Scheduled Script Execution [sysauto_script]
 * Name:      Change Overdue Notifications
 * Run:       Periodically
 * Repeat:    1 hour   (use 15 min for tighter timing)
 * Starting:  07:05
 * Run as:    service account with Time zone = America/New_York
 */
new ChangeOverdueNotifier().run();
