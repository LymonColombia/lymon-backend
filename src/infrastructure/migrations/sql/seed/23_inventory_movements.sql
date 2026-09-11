-- inventory_movements, copied from the old MongoDB (Atlas) on 2026-09-10. See README.md for loading.

COPY public.inventory_movements (id, tenant_id, property_id, item_id, type, quantity, reason, reference, actor_id, actor_email, created_at) FROM stdin;
019f2a02-cb30-7ac7-83a3-925ea778a511	019cabc5-6798-7963-84a7-546217d49e4d	019e6143-1da8-724c-88dd-6767b05498d0	019f29fc-2fc8-76fe-b74c-f4e9916ff0de	OUT	8.000	HOUSEKEEPING_USAGE	RES-12345	019cabc5-6798-709c-909a-4d8494752759	owner@hotel.com	2026-07-03 22:04:14.658+00
\.
