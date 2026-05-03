-- Add 'chess' to game_code enum
ALTER TYPE game_code ADD VALUE IF NOT EXISTS 'chess' BEFORE 'other';
