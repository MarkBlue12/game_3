import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { action } = req.body;

  // Generate the next part of the story using OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a creative storyteller.' },
      { role: 'user', content: action },
    ],
  });

  const story = completion.choices[0].message.content;

  // Save the story and action to Supabase
  const { data, error } = await supabase
    .from('stories')
    .insert([{ action, story }]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ story });
}