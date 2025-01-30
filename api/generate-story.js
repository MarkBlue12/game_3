import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, storySoFar } = req.body;
    
    // Input validation
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: "Invalid action provided" });
    }
    if (storySoFar && typeof storySoFar !== 'string') {
      return res.status(400).json({ error: "Invalid story history format" });
    }

    // Context processing
    const MAX_CONTEXT_LENGTH = 2000;
    const processedContext = storySoFar 
      ? storySoFar.slice(-MAX_CONTEXT_LENGTH) + (storySoFar.length > MAX_CONTEXT_LENGTH ? "... [truncated]" : "")
      : "No existing story";

    // Timeout setup
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

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
${processedContext}

USER ACTION:
${action}

STORY CONTINUATION:`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 300
    }, { signal: controller.signal });

    clearTimeout(timeout);

    const story = completion.choices[0].message.content;

    const { error } = await supabase
      .from('stories')
      .insert([{ 
        action,
        story,
        context: processedContext
      }]);

    if (error) throw error;

    return res.status(200).json({ story });

  } catch (error) {
    console.error('Server error:', error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: "OpenAI request timed out" });
    }
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}