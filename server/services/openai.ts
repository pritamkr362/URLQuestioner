// OpenRouter API configuration for multiple AI models
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Model configuration with their corresponding API keys
const MODEL_CONFIG = {
  'deepseek/deepseek-chat-v3.1:free': 'OPENAI_API_KEY_DEEPSEEK',
  'openai/gpt-oss-120b:free': 'OPENAI_API_KEY_GPTOSS', 
  'qwen/qwen3-4b:free': 'OPENAI_API_KEY_QWEN',
  'meta-llama/llama-3.1-8b-instruct:free': 'OPENROUTER_API_KEY',
  'microsoft/phi-3-mini-128k-instruct:free': 'OPENROUTER_API_KEY',
  'google/gemma-2-9b-it:free': 'OPENROUTER_API_KEY',
};

// Available models with fallback order
const AVAILABLE_MODELS = Object.keys(MODEL_CONFIG);

// Content chunking configuration
const MAX_CHUNK_SIZE = 8000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks

interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function callOpenRouter(messages: OpenRouterMessage[], model: string): Promise<string> {
  // Get the appropriate API key for this model
  const apiKeyName = MODEL_CONFIG[model as keyof typeof MODEL_CONFIG] || 'OPENROUTER_API_KEY';
  const apiKey = process.env[apiKeyName];
  
  if (!apiKey) {
    throw new Error(`API key ${apiKeyName} not found for model ${model}`);
  }
  
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://localhost:5000",
      "X-Title": "ContentQuery AI"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const data: OpenRouterResponse = await response.json();
  return data.choices[0]?.message?.content || "";
}

function splitContentIntoChunks(content: string, maxChunkSize: number = MAX_CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  if (content.length <= maxChunkSize) {
    return [content];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    let end = Math.min(start + maxChunkSize, content.length);
    
    // Try to break at sentence boundary if possible
    if (end < content.length) {
      const lastSentenceEnd = content.lastIndexOf('.', end);
      const lastParagraphEnd = content.lastIndexOf('\n\n', end);
      const breakPoint = Math.max(lastSentenceEnd, lastParagraphEnd);
      
      if (breakPoint > start + maxChunkSize * 0.5) {
        end = breakPoint + 1;
      }
    }
    
    chunks.push(content.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks;
}

async function callWithFallback(messages: OpenRouterMessage[], preferredModel?: string): Promise<{ response: string; modelUsed: string }> {
  const modelsToTry = preferredModel ? [preferredModel, ...AVAILABLE_MODELS.filter(m => m !== preferredModel)] : AVAILABLE_MODELS;
  
  let lastError: Error | null = null;
  
  for (const model of modelsToTry) {
    try {
      const response = await callOpenRouter(messages, model);
      return { response, modelUsed: model };
    } catch (error) {
      console.warn(`Failed to use model ${model}:`, error);
      lastError = error as Error;
      continue;
    }
  }
  
  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

export interface ContentAnalysis {
  title: string;
  summary: string;
  wordCount: number;
  readTime: number;
  keyPoints: string[];
  modelUsed: string;
}

export { AVAILABLE_MODELS };

async function analyzeContentChunk(chunk: string, topic: string, chunkIndex: number, totalChunks: number, preferredModel?: string): Promise<any> {
  const prompt = `You are an expert content analyst. This is chunk ${chunkIndex + 1} of ${totalChunks} from a larger document.
  
  Analyze this content chunk and provide a JSON response with:
  - title: Extract or generate a descriptive title (only for chunk 1, otherwise "")
  - summary: A summary of this chunk's content
  - keyPoints: Array of key points from this chunk
  - wordCount: Word count of this chunk
  
  Focus the analysis on the topic: ${topic}
  
  IMPORTANT: Respond with valid JSON only, no additional text.
  
  Content chunk to analyze:
  ${chunk}`;

  const { response, modelUsed } = await callWithFallback([
    { role: "user", content: prompt }
  ], preferredModel);

  try {
    return { ...JSON.parse(response), modelUsed };
  } catch {
    return {
      title: chunkIndex === 0 ? "Extracted Content" : "",
      summary: response.slice(0, 200) + "...",
      keyPoints: ["Analysis completed"],
      wordCount: chunk.split(/\s+/).length,
      modelUsed
    };
  }
}

export async function analyzeContent(content: string, topic: string, preferredModel?: string): Promise<ContentAnalysis> {
  try {
    const chunks = splitContentIntoChunks(content);
    console.log(`Content split into ${chunks.length} chunks for analysis`);
    
    if (chunks.length === 1) {
      // Single chunk - use original logic
      const prompt = `You are an expert content analyst. Analyze the following content and provide a JSON response with:
      - title: Extract or generate a descriptive title
      - summary: A concise summary (2-3 sentences)
      - wordCount: Estimated word count
      - readTime: Estimated reading time in minutes
      - keyPoints: Array of 3-5 key points from the content
      
      Focus the analysis on the topic: ${topic}
      
      IMPORTANT: Respond with valid JSON only, no additional text.
      
      Content to analyze:
      ${content}`;

      const { response, modelUsed } = await callWithFallback([
        { role: "user", content: prompt }
      ], preferredModel);

      let result;
      try {
        result = JSON.parse(response);
      } catch {
        result = {
          title: "Extracted Content",
          summary: response.slice(0, 200) + "...",
          wordCount: content.split(/\s+/).length,
          readTime: Math.ceil(content.split(/\s+/).length / 200),
          keyPoints: ["Analysis completed", "Content extracted", "Ready for questions"]
        };
      }

      return {
        title: result.title || "Extracted Content",
        summary: result.summary || "",
        wordCount: Math.floor(result.wordCount) || content.split(/\s+/).length,
        readTime: Math.ceil(result.readTime) || Math.ceil(content.split(/\s+/).length / 200),
        keyPoints: result.keyPoints || [],
        modelUsed
      };
    }

    // Multiple chunks - analyze each chunk and combine results
    const chunkAnalyses = await Promise.all(
      chunks.map((chunk, index) => 
        analyzeContentChunk(chunk, topic, index, chunks.length, preferredModel)
      )
    );

    // Combine chunk analyses
    const title = chunkAnalyses[0].title || "Extracted Content";
    const summaries = chunkAnalyses.map(a => a.summary).filter(s => s);
    const allKeyPoints = chunkAnalyses.flatMap(a => a.keyPoints || []);
    const totalWordCount = content.split(/\s+/).length;
    const modelUsed = chunkAnalyses[0].modelUsed;

    // Create final summary from chunk summaries
    const combinedSummary = summaries.length > 1 
      ? `This document covers: ${summaries.join(' ')}` 
      : summaries[0] || "Content analyzed in multiple parts";

    // Select most important key points (limit to 5)
    const uniqueKeyPoints = Array.from(new Set(allKeyPoints)).slice(0, 5);

    return {
      title,
      summary: combinedSummary,
      wordCount: totalWordCount,
      readTime: Math.ceil(totalWordCount / 200),
      keyPoints: uniqueKeyPoints,
      modelUsed
    };
  } catch (error) {
    console.error("AI analysis error:", error);
    throw new Error("Failed to analyze content with AI");
  }
}

async function findRelevantChunks(question: string, chunks: string[], maxChunks: number = 3): Promise<string[]> {
  // Simple relevance scoring based on keyword overlap
  const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  
  const chunkScores = chunks.map((chunk, index) => {
    const chunkWords = chunk.toLowerCase().split(/\s+/);
    const score = questionWords.reduce((acc, word) => {
      return acc + (chunkWords.filter(cw => cw.includes(word)).length);
    }, 0);
    return { chunk, score, index };
  });

  // Sort by relevance and take top chunks
  const relevantChunks = chunkScores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .sort((a, b) => a.index - b.index) // Restore original order
    .map(item => item.chunk);

  return relevantChunks.length > 0 ? relevantChunks : chunks.slice(0, maxChunks);
}

export async function answerQuestion(question: string, content: string | null, topic: string, preferredModel?: string): Promise<{ answer: string; modelUsed: string }> {
  try {
    // Handle topic-only sessions (no content)
    if (!content || content.trim() === '') {
      const systemPrompt = `You are an expert assistant in the field of ${topic}. The user wants to have an open discussion about this topic without any specific source material. Your job is to:

1. Provide knowledgeable and helpful responses about ${topic}
2. Keep all responses relevant to the topic: ${topic}
3. If the user asks something off-topic, gently redirect them back to the topic
4. Use your general knowledge about the topic to provide useful insights
5. Ask follow-up questions to encourage deeper discussion

Respond to questions and engage in meaningful discussion about ${topic}.`;

      const { response, modelUsed } = await callWithFallback([
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ], preferredModel);

      return {
        answer: response || "I couldn't process your question. Please try again.",
        modelUsed
      };
    }
    
    const chunks = splitContentIntoChunks(content);
    
    if (chunks.length === 1) {
      // Single chunk - use original logic
      const systemPrompt = `You are an expert assistant in the field of ${topic}. A user will ask questions based on the provided content. Your job is to:

1. Answer questions using ONLY the information from the provided content
2. Keep all responses relevant to the topic: ${topic}
3. If the user asks something off-topic, gently redirect them back to the topic
4. If something is not in the content, explicitly say you don't have that information
5. Do not invent facts that are not mentioned in the content

Content:
${content}`;

      const { response, modelUsed } = await callWithFallback([
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ], preferredModel);

      return {
        answer: response || "I couldn't process your question. Please try again.",
        modelUsed
      };
    }

    // Multiple chunks - find most relevant chunks for the question
    console.log(`Finding relevant chunks from ${chunks.length} total chunks for question`);
    const relevantChunks = await findRelevantChunks(question, chunks);
    const combinedRelevantContent = relevantChunks.join('\n\n');

    const systemPrompt = `You are an expert assistant in the field of ${topic}. A user will ask questions based on the provided content excerpts from a larger document. Your job is to:

1. Answer questions using ONLY the information from the provided content excerpts
2. Keep all responses relevant to the topic: ${topic}
3. If the user asks something off-topic, gently redirect them back to the topic
4. If something is not in the provided excerpts, explicitly say you don't have that information in the available content
5. Do not invent facts that are not mentioned in the content
6. If the answer spans multiple excerpts, synthesize the information coherently

Content excerpts:
${combinedRelevantContent}`;

    const { response, modelUsed } = await callWithFallback([
      { role: "system", content: systemPrompt },
      { role: "user", content: question }
    ], preferredModel);

    return {
      answer: response || "I couldn't process your question. Please try again.",
      modelUsed
    };
  } catch (error) {
    console.error("AI question answering error:", error);
    throw new Error("Failed to get AI response");
  }
}
