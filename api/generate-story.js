import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Semantic search function
async function findRelevantContext(userAction) {
  try {
    // Create embedding for user action
    const actionEmbedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userAction
    });

    // Search for similar story segments
    const { data, error } = await supabase.rpc('match_stories', {
      query_embedding: actionEmbedding.data[0].embedding,
      match_threshold: 0.7,
      match_count: 3
    });

    if (error) throw error;
    return data.map(entry => entry.story).join("\n\n");
    
  } catch (error) {
    console.error('Search error:', error);
    return ""; // Return empty if search fails
  }
}
// split sentences, check for completeness, remove incomplete sentences, rebuild.
function ensureCompleteSentences(text) {
    const sentences = text.split(/(?<![A-Za-z]{2}\.)(?<=[.!?])\s+/g);
    if (sentences.length === 0) return text;
  
    const lastSentence = sentences[sentences.length - 1];
    if (!/[.!?]$/.test(lastSentence)) {
      sentences.pop();
    }
  
    let cleanedText = sentences.join(" ").trim();
    
    if (cleanedText.length === 0) return text + ".";
    if (!/[.!?]$/.test(cleanedText)) cleanedText += ".";
    
    return cleanedText;
}


export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, storySoFar } = req.body;
    
    // Validate input
    if (!action?.trim()) return res.status(400).json({ error: "Invalid action" });
    if (typeof storySoFar !== 'string') return res.status(400).json({ error: "Invalid story format" });

    // Step 1: Find relevant past context
    const relevantHistory = await findRelevantContext(action);
    
    // Step 2: Process current context
    const MAX_CONTEXT_LENGTH = 2000;
    const currentContext = storySoFar.slice(-MAX_CONTEXT_LENGTH);
    
    // Step 3: Build AI prompt
    const messages = [
      { 
        role: "system", 
        content: `You are a story writer. Use this relevant history:
        ${relevantHistory}
        
        Current story context:
        ${currentContext || "Begin new story"}
        
        Guidelines:
        1. Keep character actions consistent
        2. Reference relevant history when appropriate
        3. Respond in 2-3 paragraphs`
      },
      {
        role: "user",
        content: `USER'S ACTION: ${action}\nSTORY CONTINUATION:`
      }
    ];

    // Step 4: Generate story with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 150
    }, { signal: controller.signal });
    
    clearTimeout(timeout);
    // const story = completion.choices[0].message.content;
    let story = completion.choices[0].message.content;
    // Clean up sentences
    story = ensureCompleteSentences(story);

    // Step 5: Save to database with embedding
    const { data, error: insertError } = await supabase
      .from('stories')
      .insert([{ 
        action, 
        story,
        context: currentContext
      }])
      .select('id')
      .single();

    if (insertError) throw insertError;
    
    // Create and store embedding
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: story
    });
    
    await supabase
      .from('stories')
      .update({ embedding: embedding.data[0].embedding })
      .eq('id', data.id);

    return res.status(200).json({ story });

  } catch (error) {
    console.error('Server error:', error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: "Request timed out" });
    }
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}