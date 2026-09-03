-- Migration: Add is_multi_select column to quiz_questions
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS is_multi_select boolean DEFAULT false;
