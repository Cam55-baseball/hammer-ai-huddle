-- Oct 29 outage guard: no single service-role query may hold the disk for more than 60s.
ALTER ROLE service_role SET statement_timeout = '60s';