-- Seed the nutrition_food_database with 50+ common athlete foods
-- Using USDA and user_created for custom entries

INSERT INTO nutrition_food_database (name, brand, serving_size, serving_size_grams, calories_per_serving, protein_g, carbs_g, fats_g, fiber_g, sugar_g, sodium_mg, source) VALUES

-- PROTEINS
('Grilled Chicken Breast', NULL, '4 oz (113g)', 113, 165, 31, 0, 3.6, 0, 0, 74, 'usda'),
('Baked Salmon Fillet', NULL, '4 oz (113g)', 113, 233, 25, 0, 14, 0, 0, 75, 'usda'),
('Lean Ground Beef (93%)', NULL, '4 oz (113g)', 113, 170, 23, 0, 8, 0, 0, 75, 'usda'),
('Ground Turkey (93%)', NULL, '4 oz (113g)', 113, 170, 21, 0, 9, 0, 0, 80, 'usda'),
('Large Egg', NULL, '1 egg (50g)', 50, 72, 6, 0.4, 5, 0, 0.4, 71, 'usda'),
('Egg Whites', NULL, '3 large (99g)', 99, 51, 11, 0.5, 0, 0, 0, 164, 'usda'),
('Tuna (canned in water)', NULL, '3 oz (85g)', 85, 73, 17, 0, 0.5, 0, 0, 230, 'usda'),
('Shrimp (cooked)', NULL, '3 oz (85g)', 85, 84, 18, 0, 1, 0, 0, 190, 'usda'),
('Pork Tenderloin', NULL, '4 oz (113g)', 113, 136, 24, 0, 4, 0, 0, 55, 'usda'),
('Tofu (firm)', NULL, '4 oz (113g)', 113, 88, 10, 2, 5, 0.5, 0, 11, 'usda'),
('Cottage Cheese (2%)', NULL, '1 cup (226g)', 226, 183, 24, 10, 5, 0, 7, 746, 'usda'),
('Greek Yogurt (plain, nonfat)', 'Fage', '1 cup (227g)', 227, 130, 23, 9, 0, 0, 6, 65, 'usda'),
('Greek Yogurt (plain, 2%)', 'Chobani', '1 cup (227g)', 227, 150, 20, 8, 4, 0, 6, 70, 'usda'),
('Whey Protein Powder', 'Optimum Nutrition', '1 scoop (31g)', 31, 120, 24, 3, 1, 1, 1, 130, 'usda'),

-- CARBOHYDRATES
('White Rice (cooked)', NULL, '1 cup (158g)', 158, 206, 4, 45, 0.4, 0.6, 0, 2, 'usda'),
('Brown Rice (cooked)', NULL, '1 cup (195g)', 195, 216, 5, 45, 1.8, 3.5, 0.7, 10, 'usda'),
('Oatmeal (dry)', NULL, '1/2 cup (40g)', 40, 150, 5, 27, 3, 4, 1, 0, 'usda'),
('Sweet Potato (baked)', NULL, '1 medium (114g)', 114, 103, 2, 24, 0, 4, 7, 41, 'usda'),
('White Potato (baked)', NULL, '1 medium (173g)', 173, 161, 4, 37, 0.2, 4, 2, 17, 'usda'),
('Banana', NULL, '1 medium (118g)', 118, 105, 1.3, 27, 0.4, 3.1, 14, 1, 'usda'),
('Apple', NULL, '1 medium (182g)', 182, 95, 0.5, 25, 0.3, 4.4, 19, 2, 'usda'),
('Quinoa (cooked)', NULL, '1 cup (185g)', 185, 222, 8, 39, 4, 5, 0, 13, 'usda'),
('Whole Wheat Bread', NULL, '1 slice (28g)', 28, 69, 4, 12, 1, 2, 1, 132, 'usda'),
('Bagel (plain)', NULL, '1 medium (98g)', 98, 277, 11, 54, 2, 2, 5, 500, 'usda'),
('Pasta (cooked)', NULL, '1 cup (140g)', 140, 221, 8, 43, 1.3, 2.5, 1, 1, 'usda'),
('Jasmine Rice (cooked)', NULL, '1 cup (158g)', 158, 213, 4, 47, 0.3, 0.4, 0, 2, 'usda'),
('Honey', NULL, '1 tbsp (21g)', 21, 64, 0, 17, 0, 0, 17, 1, 'usda'),

-- FATS
('Avocado', NULL, '1 medium (150g)', 150, 240, 3, 13, 22, 10, 1, 11, 'usda'),
('Almonds', NULL, '1 oz (28g)', 28, 164, 6, 6, 14, 3.5, 1, 0, 'usda'),
('Peanut Butter (natural)', NULL, '2 tbsp (32g)', 32, 188, 8, 7, 16, 2, 2, 5, 'usda'),
('Almond Butter', NULL, '2 tbsp (32g)', 32, 196, 7, 6, 18, 3, 2, 0, 'usda'),
('Walnuts', NULL, '1 oz (28g)', 28, 185, 4, 4, 18, 2, 1, 1, 'usda'),
('Olive Oil', NULL, '1 tbsp (14g)', 14, 119, 0, 0, 14, 0, 0, 0, 'usda'),
('Coconut Oil', NULL, '1 tbsp (14g)', 14, 121, 0, 0, 13, 0, 0, 0, 'usda'),
('Cashews', NULL, '1 oz (28g)', 28, 157, 5, 9, 12, 1, 2, 3, 'usda'),
('Chia Seeds', NULL, '1 oz (28g)', 28, 138, 5, 12, 9, 10, 0, 5, 'usda'),
('Flax Seeds (ground)', NULL, '2 tbsp (14g)', 14, 74, 3, 4, 6, 4, 0, 4, 'usda'),

-- DAIRY
('Whole Milk', NULL, '1 cup (244g)', 244, 149, 8, 12, 8, 0, 12, 105, 'usda'),
('2% Milk', NULL, '1 cup (244g)', 244, 122, 8, 12, 5, 0, 12, 115, 'usda'),
('Skim Milk', NULL, '1 cup (245g)', 245, 83, 8, 12, 0.2, 0, 12, 103, 'usda'),
('Cheddar Cheese', NULL, '1 oz (28g)', 28, 113, 7, 0.4, 9, 0, 0.5, 176, 'usda'),
('Mozzarella (part-skim)', NULL, '1 oz (28g)', 28, 72, 7, 0.8, 4.5, 0, 0.3, 175, 'usda'),
('Parmesan Cheese', NULL, '1 oz (28g)', 28, 111, 10, 0.9, 7, 0, 0.2, 454, 'usda'),

-- VEGETABLES
('Broccoli (cooked)', NULL, '1 cup (156g)', 156, 55, 4, 11, 0.6, 5, 2, 64, 'usda'),
('Spinach (raw)', NULL, '2 cups (60g)', 60, 14, 2, 2, 0.2, 1.3, 0.3, 47, 'usda'),
('Asparagus', NULL, '1 cup (134g)', 134, 27, 3, 5, 0.2, 2.8, 2.5, 3, 'usda'),
('Green Beans', NULL, '1 cup (125g)', 125, 31, 2, 7, 0.1, 3.4, 3.3, 6, 'usda'),
('Bell Pepper (any color)', NULL, '1 medium (119g)', 119, 31, 1, 6, 0.4, 2.1, 4.2, 4, 'usda'),
('Carrots', NULL, '1 cup (128g)', 128, 52, 1, 12, 0.3, 3.6, 6, 88, 'usda'),

-- PRE/POST WORKOUT (using usda for branded items as they're based on USDA data)
('Clif Bar', 'Clif', '1 bar (68g)', 68, 250, 10, 44, 5, 5, 21, 210, 'usda'),
('RX Bar (Chocolate)', 'RXBAR', '1 bar (52g)', 52, 210, 12, 24, 9, 5, 15, 170, 'usda'),
('Kind Bar (Nut Delight)', 'KIND', '1 bar (40g)', 40, 200, 6, 17, 13, 3, 5, 10, 'usda'),
('Gatorade (20oz)', 'Gatorade', '20 fl oz (591ml)', 591, 140, 0, 36, 0, 0, 34, 270, 'usda'),
('Chocolate Milk (low-fat)', NULL, '1 cup (250ml)', 250, 160, 8, 25, 2.5, 0, 24, 150, 'usda'),
('Protein Shake (pre-made)', 'Fairlife', '1 bottle (340ml)', 340, 150, 30, 3, 2.5, 0, 2, 310, 'usda'),

-- COMMON COMBINATIONS (using user_created for custom recipes)
('Overnight Oats (basic)', NULL, '1 serving', 350, 380, 15, 55, 10, 8, 12, 150, 'user_created'),
('Grilled Chicken Salad', NULL, '1 serving', 300, 350, 35, 15, 18, 5, 4, 450, 'user_created'),
('Protein Smoothie (basic)', NULL, '16 oz', 400, 320, 30, 40, 5, 6, 25, 200, 'user_created'),
('Turkey & Cheese Sandwich', NULL, '1 sandwich', 200, 380, 28, 34, 14, 3, 4, 850, 'user_created'),
('Tuna Salad (no bread)', NULL, '1 cup', 200, 280, 25, 8, 16, 0, 2, 580, 'user_created')

ON CONFLICT DO NOTHING;