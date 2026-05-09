DELETE FROM foundation_health_alerts WHERE alert_key LIKE '__seed__%';
DELETE FROM foundation_replay_outcomes WHERE trace_id LIKE '__seed_trace_%';
DELETE FROM foundation_notification_dispatches WHERE alert_key LIKE '__seed_disp__%' OR alert_key = '__idem_test__';