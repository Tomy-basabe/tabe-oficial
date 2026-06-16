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
  const rawText = fs.readFileSync('raw_unidad5.txt', 'utf8');
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');
  
  const questions = [];
  let currentQ = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^\d+\.\s/)) {
      // Question
      currentQ = { q: line.replace(/^\d+\.\s/, '').trim(), opts: [] };
      questions.push(currentQ);
    } else if (line.startsWith('-') || line.startsWith('*')) {
      // Option
      const isCorrect = line.startsWith('*');
      let text = line.substring(1).trim();
      
      // Some options might have a space right after the symbol
      if (text.startsWith(' ')) text = text.trim();
      
      if (currentQ) {
        currentQ.opts.push({ t: text, c: isCorrect });
      }
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
    
  if (userErr) {
    console.error("Error fetching users:", userErr);
    return;
  }
    
  const tomasUsers = users.filter(u => u.email === 'tomasbasabe.utn@gmail.com');
  if (tomasUsers.length === 0) {
    console.error("User not found!");
    return;
  }
  const user = tomasUsers[0];
  console.log("Using User:", user.id);

  console.log("Creating quiz deck Unidad5CD...");
  const { data: deck, error: deckErr } = await supabase
    .from('quiz_decks')
    .insert({
      user_id: user.id,
      subject_id: null,
      nombre: 'Unidad5CD',
      description: 'Cuestionario Unidad 5',
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
  
  console.log(`Done inserting ${questionsData.length} questions for Unidad5CD!`);
}

run();
