import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbWpyY2luZnVnc3d0bGtuZWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgyNDM1NCwiZXhwIjoyMDg2NDAwMzU0fQ.JAf7unN-CipMZnzyDXxxWdXSNgXhrNHKYzleF7UGEnY'; // service_role

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseQuestions() {
  const rawText = fs.readFileSync('raw_questions.txt', 'utf8');
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');
  
  const questions = [];
  let currentQ = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^[a-d]\.\s/)) {
      // Option
      const isCorrect = line.endsWith('*');
      const text = line.replace(/^[a-d]\.\s/, '').replace(/\s*\*$/, '').trim();
      currentQ.opts.push({ t: text, c: isCorrect });
    } else {
      // Question
      currentQ = { q: line, opts: [] };
      questions.push(currentQ);
    }
  }
  return questions;
}

async function run() {
  const questionsData = parseQuestions();
  console.log(`Parsed ${questionsData.length} questions.`);
  
  const { data: users, error: userErr } = await supabase
    .from('profiles')
    .select('*');
    
  const tomasUsers = users.filter(u => u.email === 'tomasbasabe.utn@gmail.com');
  const user = tomasUsers[0];
  console.log("Using User:", user.id);

  // Create quiz deck Unidad 4 without a subject
  console.log("Creating quiz deck Unidad 4...");
  const { data: deck, error: deckErr } = await supabase
    .from('quiz_decks')
    .insert({
      user_id: user.id,
      subject_id: null,
      nombre: 'Unidad 4',
      description: 'Cuestionario Unidad 4',
      is_public: false,
      total_questions: questionsData.length
    })
    .select();
    
  if (deckErr || !deck) {
    console.error("Error creating quiz deck:", deckErr);
    return;
  }
  
  const deckId = deck[0].id;
  console.log("Created quiz deck:", deckId);
  
  // Insert questions and options
  console.log("Inserting questions...");
  for (const q of questionsData) {
    const { data: qData, error: qErr } = await supabase
      .from('quiz_questions')
      .insert({
        deck_id: deckId,
        user_id: user.id,
        pregunta: q.q,
        is_multi_select: false
      })
      .select();
      
    if (qErr || !qData) {
      console.error("Error inserting question:", q.q, qErr);
      continue;
    }
    
    const questionId = qData[0].id;
    
    // Insert options
    const optionsToInsert = q.opts.map(opt => ({
      question_id: questionId,
      texto: opt.t,
      es_correcta: opt.c
    }));
    
    const { error: optErr } = await supabase
      .from('quiz_options')
      .insert(optionsToInsert);
      
    if (optErr) {
      console.error("Error inserting options for question:", q.q, optErr);
    }
  }
  
  console.log(`Done inserting ${questionsData.length} questions for Unidad 4!`);
}

run();
