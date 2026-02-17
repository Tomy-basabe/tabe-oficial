-- Make subject_id nullable in flashcard_decks to allow general-purpose decks
-- and prevent errors when AI cannot resolve a specific subject ID.

ALTER TABLE flashcard_decks ALTER COLUMN subject_id DROP NOT NULL;
