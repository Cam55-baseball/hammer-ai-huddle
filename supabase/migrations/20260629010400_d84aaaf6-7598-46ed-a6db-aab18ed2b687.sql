DELETE FROM iq_situation_variants WHERE situation_id IN (SELECT id FROM iq_situations WHERE canonical_order >= 30);
DELETE FROM iq_situation_actors WHERE situation_id IN (SELECT id FROM iq_situations WHERE canonical_order >= 30);
DELETE FROM iq_situations WHERE canonical_order >= 30;