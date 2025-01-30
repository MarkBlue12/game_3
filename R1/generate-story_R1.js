// generate-story.js
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { action, storySoFar } = req.body;
    // Improved prompt with context
    const messages = [
      { 
        role: "system", 
        content: `You are a creative storyteller. Continue the narrative based on this story history and user action.
        Guidelines:
        1. Maintain consistent characters and setting
        2. Keep responses under 150 words
        3. Use ${storySoFar ? "the existing story context" : "your creativity"} for continuity`
      },
      {
        role: "user",
        content: `STORY HISTORY:
        ${storySoFar || "No existing story"}

        USER ACTION:
        ${action}

        STORY CONTINUATION:`
      }
    ];
  
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Use valid model name
      messages,
      temperature: 0.7,
      max_tokens: 300
    });

    const story = completion.choices[0].message.content;

    // Save to Supabase with context
    const { error } = await supabase
      .from('stories')
      .insert([{ 
        action,
        story,
        context: storySoFar // Store context for future reference
      }]);

    if (error) throw error;

    return res.status(200).json({ story });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
    }
}  