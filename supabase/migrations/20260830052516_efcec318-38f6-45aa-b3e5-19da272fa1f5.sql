DELETE FROM public.faqs;

INSERT INTO public.faqs (question, answer, topic, public_visible, sort_order) VALUES
('How do I get a repair price?', 'WhatsApp us your model and what''s wrong. We''ll give you a starting price — a realistic range based on what you describe. When you bring it in we look at it properly and confirm the final price before any work starts.', 'REPAIRS', true, 10),
('Are the prices on the site final?', 'No. The "from" prices are starting points. The final cost depends on your exact model and what we find when we examine it. We confirm the price before we start — no surprises.', 'REPAIRS', true, 20),
('How long does a repair take?', 'Time depends on the model and what parts we have in stock. Many common jobs are assessed while you wait; others may need a part ordered. We''ll tell you upfront when you get in touch.', 'REPAIRS', true, 30),
('Do I need an appointment?', 'No. Walk into 4 Aughton St anytime we''re open. If you want to check we have a specific part in stock, WhatsApp or call ahead — it saves you a wasted trip.', 'GENERAL', true, 40),
('Is my data safe during a repair?', 'We don''t need your passcode for most repairs (screens, batteries, charging ports). For software issues we''ll ask you to back up first.', 'REPAIRS', true, 50),
('How do I pay?', 'Cash or card — whatever suits you.', 'GENERAL', true, 60),
('What if my phone is too old to repair?', 'We''ll tell you honestly. If a repair costs more than the phone is worth, we''ll say so — and suggest whether to sell it to us, trade it in, or recycle it responsibly.', 'REPAIRS', true, 70),
('Do you guarantee your repairs?', 'Yes — in writing on your receipt. The length depends on the repair, but it''s there in black and white.', 'REPAIRS', true, 80),
('Can you fix water damage?', 'Sometimes. Bring it in as soon as possible and don''t charge it. We''ll assess it honestly, and if it isn''t recoverable we''ll tell you straight.', 'REPAIRS', true, 90),
('Do you repair tablets or other devices?', 'Phones are our focus. Some basic tablet repairs we can do — WhatsApp us the model and we''ll tell you yes or no honestly.', 'REPAIRS', true, 100),
('How quickly do you reply on WhatsApp?', 'Usually within minutes during opening hours. It''s the fastest way to reach us.', 'GENERAL', true, 110),
('Where is the shop?', 'We''re at 4 Aughton St, Ormskirk, L39 3BW — right in Ormskirk town centre, a short walk from the bus station.', 'GENERAL', true, 120);