// OpenRouter API configuration for multiple AI models
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Available models with fallback order
const AVAILABLE_MODELS = [
  "qwen/qwen3-4b:free",
  "meta-llama/llama-3.1-8b-instruct:free", 
  "microsoft/phi-3-mini-128k-instruct:free",
  "google/gemma-2-9b-it:free"
];

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
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
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

export async function analyzeContent(content: string, topic: string, preferredModel?: string): Promise<ContentAnalysis> {
  try {
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
      // If JSON parsing fails, extract data manually
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
  } catch (error) {
    console.error("AI analysis error:", error);
    throw new Error("Failed to analyze content with AI");
  }
}

export async function answerQuestion(question: string, content: string, topic: string, preferredModel?: string): Promise<{ answer: string; modelUsed: string }> {
  try {
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
  } catch (error) {
    console.error("AI question answering error:", error);
    throw new Error("Failed to get AI response");
  }
}
