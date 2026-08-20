-- Migration: cookie detail columns, for the Cookies page popup.
-- Adds without wiping, so it's safe on the live database.
-- Flynn Zipsin - VCE Software Development SAT

-- the cookie's element, e.g. earth. TEXT[] because a few carry more
-- than one. Empty for cookies released before elements existed
ALTER TABLE cookies ADD COLUMN IF NOT EXISTS elements TEXT[] NOT NULL DEFAULT '{}';

-- the toppings the game itself recommends, as topping keys
ALTER TABLE cookies ADD COLUMN IF NOT EXISTS recommended_toppings TEXT[] NOT NULL DEFAULT '{}';

-- the cookie's skill, shown in the detail popup
ALTER TABLE cookies ADD COLUMN IF NOT EXISTS skill_name TEXT;
ALTER TABLE cookies ADD COLUMN IF NOT EXISTS skill_cooldown TEXT;
ALTER TABLE cookies ADD COLUMN IF NOT EXISTS skill_description TEXT;

-- flavour text from the wiki
ALTER TABLE cookies ADD COLUMN IF NOT EXISTS quote TEXT;
ALTER TABLE cookies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE cookies ADD COLUMN IF NOT EXISTS traits TEXT;
ALTER TABLE cookies ADD COLUMN IF NOT EXISTS voice_actor TEXT;

-- searching the roster by element is worth an index
CREATE INDEX IF NOT EXISTS idx_cookies_elements ON cookies USING GIN (elements);

-- check it worked
SELECT column_name FROM information_schema.columns
WHERE table_name = 'cookies' ORDER BY ordinal_position;
