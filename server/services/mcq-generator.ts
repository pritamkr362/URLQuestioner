import { callWithFallback } from "./openai";

export interface MCQQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option (0-3)
  explanation?: string;
}

export interface MCQGeneratorParams {
  content?: string | null;
  topic: string;
  subtopic?: string;
  numberOfQuestions: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  customHeader?: string;
  includeAnswers: boolean;
  preferredModel?: string;
}

export async function generateMCQs(params: MCQGeneratorParams): Promise<{ questions: MCQQuestion[]; modelUsed: string }> {
  const {
    content,
    topic,
    subtopic,
    numberOfQuestions,
    difficultyLevel,
    customHeader,
    includeAnswers,
    preferredModel
  } = params;

  let systemPrompt: string;
  let userPrompt: string;

  if (!content || content.trim() === '') {
    // Topic-only MCQ generation
    systemPrompt = `You are an expert educator specializing in creating multiple choice questions about ${topic}. Generate ${numberOfQuestions} high-quality MCQ questions at ${difficultyLevel} difficulty level.`;
    
    userPrompt = `Create ${numberOfQuestions} multiple choice questions about "${topic}"${subtopic ? ` focusing on "${subtopic}"` : ''} at ${difficultyLevel} difficulty level.

Requirements:
1. Each question should have 4 options (A, B, C, D)
2. Only one correct answer per question
3. Include brief explanations for correct answers
4. Questions should be at ${difficultyLevel} difficulty level
5. Cover different aspects of the topic
6. Avoid ambiguous or trick questions

${customHeader ? `Custom Header: ${customHeader}` : ''}

Format your response as a JSON array of objects with this structure:
{
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Brief explanation of why this is correct"
}

Generate exactly ${numberOfQuestions} questions.`;
  } else {
    // Content-based MCQ generation
    systemPrompt = `You are an expert educator creating multiple choice questions based on provided content about ${topic}. Generate ${numberOfQuestions} high-quality MCQ questions at ${difficultyLevel} difficulty level using ONLY information from the provided content.`;
    
    userPrompt = `Based on the following content about "${topic}", create ${numberOfQuestions} multiple choice questions at ${difficultyLevel} difficulty level.

Requirements:
1. Each question should have 4 options (A, B, C, D)
2. Only one correct answer per question
3. Include brief explanations for correct answers
4. Questions should be at ${difficultyLevel} difficulty level
5. Use ONLY information from the provided content
6. Cover different aspects mentioned in the content
7. Avoid ambiguous or trick questions

${customHeader ? `Custom Header: ${customHeader}` : ''}

Content:
${content}

Format your response as a JSON array of objects with this structure:
{
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Brief explanation of why this is correct"
}

Generate exactly ${numberOfQuestions} questions based on the content.`;
  }

  try {
    const { response, modelUsed } = await callWithFallback([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], preferredModel);

    // Parse the JSON response
    let questions: MCQQuestion[];
    try {
      questions = JSON.parse(response);
      
      // Validate the structure
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid response format");
      }
      
      // Ensure all questions have required fields
      questions = questions.map((q, index) => ({
        question: q.question || `Question ${index + 1}`,
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : [`Option A`, `Option B`, `Option C`, `Option D`],
        correctAnswer: typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3 ? q.correctAnswer : 0,
        explanation: q.explanation || "No explanation provided"
      }));
      
      // Trim to requested number
      questions = questions.slice(0, numberOfQuestions);
      
    } catch (parseError) {
      console.error("Failed to parse MCQ response:", parseError);
      // Fallback: create basic questions
      questions = Array.from({ length: numberOfQuestions }, (_, i) => ({
        question: `Question ${i + 1} about ${topic}`,
        options: [`Option A`, `Option B`, `Option C`, `Option D`],
        correctAnswer: 0,
        explanation: "This is a placeholder question."
      }));
    }

    return { questions, modelUsed };
  } catch (error) {
    console.error("MCQ generation error:", error);
    throw new Error(`Failed to generate MCQs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function formatMCQsForDisplay(questions: MCQQuestion[], includeAnswers: boolean = false, customHeader?: string): string {
  let output = '';
  
  if (customHeader) {
    output += `${customHeader}\n\n`;
  }
  
  output += `Multiple Choice Questions\n`;
  output += `${'='.repeat(50)}\n\n`;
  
  questions.forEach((q, index) => {
    output += `${index + 1}. ${q.question}\n\n`;
    q.options.forEach((option, optIndex) => {
      const letter = String.fromCharCode(65 + optIndex); // A, B, C, D
      output += `   ${letter}) ${option}\n`;
    });
    output += '\n';
  });
  
  if (includeAnswers) {
    output += '\n' + '='.repeat(50) + '\n';
    output += 'ANSWER KEY\n';
    output += '='.repeat(50) + '\n\n';
    
    questions.forEach((q, index) => {
      const correctLetter = String.fromCharCode(65 + q.correctAnswer);
      output += `${index + 1}. ${correctLetter}) ${q.options[q.correctAnswer]}\n`;
      if (q.explanation) {
        output += `   Explanation: ${q.explanation}\n`;
      }
      output += '\n';
    });
  }
  
  return output;
}