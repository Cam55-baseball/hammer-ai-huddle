-- Camryn Williams' October 25 named authorization; applied and 13 exact keys read back.
-- Additive owner video vocabulary only. No athlete records, switches or videos changed.
insert into public.video_tag_taxonomy (key,label,layer,skill_domain,sport,active,description)
select v.key,v.label,'movement_pattern'::public.video_tag_layer_enum,'hitting'::public.skill_domain_enum,'both',true,
 'Owner side-specific bunt content; no inferred fault or training dose.'
from (values
 ('bunt_fundamentals','Bunting fundamentals'),
 ('bunt_r_squeeze','Right-handed: Squeeze bunt (softly on 1B side of pitcher angled so pitcher grabs it instead of 1B)'),
 ('bunt_r_sac_3b','Right-handed: Sac bunt toward 3B (man on second)'),
 ('bunt_r_sac_1b','Right-handed: Sac bunt toward 1B (man on 1B)'),
 ('bunt_r_drag','Right-handed: Drag bunt (toward 3B)'),
 ('bunt_r_push','Right-handed: Push bunt (LHP only: beyond pitcher to the position of second baseman)'),
 ('bunt_r_hit','Right-handed: Bunt for a hit (Softly down 1B line)'),
 ('bunt_l_squeeze','Left-handed: Squeeze bunt (softly on 1B side of pitcher angled so pitcher grabs it instead of 1B)'),
 ('bunt_l_sac_3b','Left-handed: Sac bunt toward 3B (man on second)'),
 ('bunt_l_sac_1b','Left-handed: Sac bunt toward 1B (man on 1B)'),
 ('bunt_l_drag','Left-handed: Drag bunt (toward 3B)'),
 ('bunt_l_push','Left-handed: Push bunt (LHP only/ not for Switch hitters: Beyond pitcher to the position of second baseman)'),
 ('bunt_l_hit','Left-handed: Bunt for a hit (Softly down 1B line)')
) as v(key,label)
where not exists(select 1 from public.video_tag_taxonomy t where t.key=v.key and t.layer='movement_pattern' and t.skill_domain='hitting');