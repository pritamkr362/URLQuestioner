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
  language?: string;
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
    preferredModel,
    language = 'english'
  } = params;

  let systemPrompt: string;
  let userPrompt: string;

  // Get language-specific instructions
  const languageInstructions = getLanguageInstructions(language);
  
  if (!content || content.trim() === '') {
    // Topic-only MCQ generation
    systemPrompt = `You are an expert educator specializing in creating multiple choice questions about ${topic}. Generate ${numberOfQuestions} high-quality MCQ questions at ${difficultyLevel} difficulty level. ${languageInstructions.system}`;
    
    userPrompt = `LANGUAGE REQUIREMENT: ${languageInstructions.user}

Create ${numberOfQuestions} multiple choice questions about "${topic}"${subtopic ? ` focusing on "${subtopic}"` : ''} at ${difficultyLevel} difficulty level.

Requirements:
1. Each question should have 4 options (A, B, C, D)
2. Only one correct answer per question
3. Include brief explanations for correct answers
4. Questions should be at ${difficultyLevel} difficulty level
5. Cover different aspects of the topic
6. Avoid ambiguous or trick questions

${customHeader ? `Custom Header: ${customHeader}` : ''}

IMPORTANT: Respond with ONLY a valid JSON array. Do not include any markdown formatting, code blocks, or additional text. The response must be a valid JSON array that can be parsed directly.

Format your response as a JSON array of objects with this exact structure:
[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

Generate exactly ${numberOfQuestions} questions. Return only the JSON array, nothing else.`;
  } else {
    // Content-based MCQ generation
    systemPrompt = `You are an expert educator creating multiple choice questions based on provided content about ${topic}. Generate ${numberOfQuestions} high-quality MCQ questions at ${difficultyLevel} difficulty level using ONLY information from the provided content. ${languageInstructions.system}`;
    
    userPrompt = `LANGUAGE REQUIREMENT: ${languageInstructions.user}

Based on the following content about "${topic}", create ${numberOfQuestions} multiple choice questions at ${difficultyLevel} difficulty level.

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

IMPORTANT: Respond with ONLY a valid JSON array. Do not include any markdown formatting, code blocks, or additional text. The response must be a valid JSON array that can be parsed directly.

Format your response as a JSON array of objects with this exact structure:
[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

Generate exactly ${numberOfQuestions} questions based on the content. Return only the JSON array, nothing else.`;
  }

  try {
    const { response, modelUsed } = await callWithFallback([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], preferredModel);

    // Parse the JSON response
    let questions: MCQQuestion[];
    try {
      // Clean the response by removing markdown code blocks and extra text
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to extract JSON array from the response
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      console.log("Cleaned response for parsing:", cleanResponse.substring(0, 200) + "...");
      
      questions = JSON.parse(cleanResponse);
      
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
      console.error("Raw response:", response);
      
      // Try to create better fallback questions based on the topic
      const fallbackQuestions = generateFallbackQuestions(topic, numberOfQuestions, difficultyLevel);
      questions = fallbackQuestions;
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

function generateFallbackQuestions(topic: string, numberOfQuestions: number, difficultyLevel: string): MCQQuestion[] {
  const topicQuestions: { [key: string]: MCQQuestion[] } = {
    'science': [
      {
        question: "What is the scientific method?",
        options: [
          "A systematic approach to understanding the natural world through observation and experimentation",
          "A way to memorize scientific facts",
          "A method for writing scientific papers",
          "A technique for drawing scientific diagrams"
        ],
        correctAnswer: 0,
        explanation: "The scientific method is a systematic approach involving observation, hypothesis formation, experimentation, and analysis."
      },
      {
        question: "What is photosynthesis?",
        options: [
          "The process by which plants convert sunlight into energy",
          "The process by which animals digest food",
          "The process by which rocks are formed",
          "The process by which water evaporates"
        ],
        correctAnswer: 0,
        explanation: "Photosynthesis is the process by which plants use sunlight, carbon dioxide, and water to produce glucose and oxygen."
      }
    ],
    'technology': [
      {
        question: "What is artificial intelligence?",
        options: [
          "Computer systems that can perform tasks requiring human intelligence",
          "A type of computer hardware",
          "A programming language",
          "A method for storing data"
        ],
        correctAnswer: 0,
        explanation: "AI refers to computer systems that can perform tasks that typically require human intelligence."
      },
      {
        question: "What is cloud computing?",
        options: [
          "Delivering computing services over the internet",
          "Computing in cloudy weather",
          "A type of computer monitor",
          "A method for cooling computers"
        ],
        correctAnswer: 0,
        explanation: "Cloud computing delivers computing services including servers, storage, databases, and software over the internet."
      }
    ],
    'business': [
      {
        question: "What is a business plan?",
        options: [
          "A written document describing a business's goals and strategies",
          "A list of business contacts",
          "A schedule of business meetings",
          "A collection of business cards"
        ],
        correctAnswer: 0,
        explanation: "A business plan is a formal written document containing business goals and the methods to achieve them."
      },
      {
        question: "What is market research?",
        options: [
          "The process of gathering information about customers and markets",
          "The process of setting prices",
          "The process of hiring employees",
          "The process of manufacturing products"
        ],
        correctAnswer: 0,
        explanation: "Market research involves gathering information about customers, competitors, and market conditions."
      }
    ],
    'health': [
      {
        question: "What is a balanced diet?",
        options: [
          "A diet that includes all essential nutrients in proper proportions",
          "A diet that only includes vegetables",
          "A diet that excludes all fats",
          "A diet that only includes protein"
        ],
        correctAnswer: 0,
        explanation: "A balanced diet provides all essential nutrients including carbohydrates, proteins, fats, vitamins, and minerals."
      },
      {
        question: "What is cardiovascular exercise?",
        options: [
          "Exercise that strengthens the heart and improves circulation",
          "Exercise that only uses the arms",
          "Exercise that only uses the legs",
          "Exercise that only uses the core muscles"
        ],
        correctAnswer: 0,
        explanation: "Cardiovascular exercise increases heart rate and improves the efficiency of the cardiovascular system."
      }
    ],
    'education': [
      {
        question: "What is active learning?",
        options: [
          "Learning through participation and engagement",
          "Learning while sleeping",
          "Learning only from books",
          "Learning without any interaction"
        ],
        correctAnswer: 0,
        explanation: "Active learning involves students participating in the learning process through discussion, problem-solving, and hands-on activities."
      },
      {
        question: "What is formative assessment?",
        options: [
          "Assessment used to monitor student learning during instruction",
          "Assessment used only at the end of a course",
          "Assessment used to grade final exams",
          "Assessment used to rank students"
        ],
        correctAnswer: 0,
        explanation: "Formative assessment provides ongoing feedback to improve teaching and learning during the instructional process."
      }
    ]
  };

  const defaultQuestions = [
    {
      question: `What is the main focus of ${topic}?`,
      options: [
        `Understanding and applying principles of ${topic}`,
        `Memorizing facts about ${topic}`,
        `Avoiding ${topic} concepts`,
        `Simplifying ${topic} to basic terms`
      ],
      correctAnswer: 0,
      explanation: `The main focus of ${topic} involves understanding its core principles and applications.`
    },
    {
      question: `Which of the following is most important in ${topic}?`,
      options: [
        `Understanding fundamental concepts`,
        `Memorizing technical terms`,
        `Avoiding complex topics`,
        `Focusing only on practical applications`
      ],
      correctAnswer: 0,
      explanation: `Understanding fundamental concepts is crucial for mastering ${topic}.`
    }
  ];

  const questions = topicQuestions[topic.toLowerCase()] || defaultQuestions;
  return questions.slice(0, numberOfQuestions);
}

function getLanguageInstructions(language: string): { system: string; user: string } {
  const languageMap: { [key: string]: { system: string; user: string } } = {
    'english': {
      system: 'Generate all questions and answers in English.',
      user: 'Generate all questions, options, and explanations in English.'
    },
    'spanish': {
      system: 'You MUST generate all questions and answers in Spanish (Español). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Spanish (Español). Do not use any English words. The entire response must be in Spanish.'
    },
    'french': {
      system: 'You MUST generate all questions and answers in French (Français). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in French (Français). Do not use any English words. The entire response must be in French.'
    },
    'german': {
      system: 'You MUST generate all questions and answers in German (Deutsch). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in German (Deutsch). Do not use any English words. The entire response must be in German.'
    },
    'italian': {
      system: 'You MUST generate all questions and answers in Italian (Italiano). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Italian (Italiano). Do not use any English words. The entire response must be in Italian.'
    },
    'portuguese': {
      system: 'You MUST generate all questions and answers in Portuguese (Português). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Portuguese (Português). Do not use any English words. The entire response must be in Portuguese.'
    },
    'russian': {
      system: 'You MUST generate all questions and answers in Russian (Русский). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Russian (Русский). Do not use any English words. The entire response must be in Russian.'
    },
    'chinese': {
      system: 'Generate all questions and answers in Chinese (中文).',
      user: 'Generate all questions, options, and explanations in Chinese (中文).'
    },
    'japanese': {
      system: 'Generate all questions and answers in Japanese (日本語).',
      user: 'Generate all questions, options, and explanations in Japanese (日本語).'
    },
    'korean': {
      system: 'Generate all questions and answers in Korean (한국어).',
      user: 'Generate all questions, options, and explanations in Korean (한국어).'
    },
    'arabic': {
      system: 'Generate all questions and answers in Arabic (العربية).',
      user: 'Generate all questions, options, and explanations in Arabic (العربية).'
    },
    'hindi': {
      system: 'Generate all questions and answers in Hindi (हिन्दी).',
      user: 'Generate all questions, options, and explanations in Hindi (हिन्दी).'
    },
    'bengali': {
      system: 'Generate all questions and answers in Bengali (বাংলা).',
      user: 'Generate all questions, options, and explanations in Bengali (বাংলা).'
    },
    'urdu': {
      system: 'Generate all questions and answers in Urdu (اردو).',
      user: 'Generate all questions, options, and explanations in Urdu (اردو).'
    },
    'turkish': {
      system: 'Generate all questions and answers in Turkish (Türkçe).',
      user: 'Generate all questions, options, and explanations in Turkish (Türkçe).'
    },
    'dutch': {
      system: 'Generate all questions and answers in Dutch (Nederlands).',
      user: 'Generate all questions, options, and explanations in Dutch (Nederlands).'
    },
    'swedish': {
      system: 'You MUST generate all questions and answers in Swedish (Svenska). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Swedish (Svenska). Do not use any English words. The entire response must be in Swedish.'
    },
    'norwegian': {
      system: 'You MUST generate all questions and answers in Norwegian (Norsk). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Norwegian (Norsk). Do not use any English words. The entire response must be in Norwegian.'
    },
    'danish': {
      system: 'You MUST generate all questions and answers in Danish (Dansk). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Danish (Dansk). Do not use any English words. The entire response must be in Danish.'
    },
    'finnish': {
      system: 'You MUST generate all questions and answers in Finnish (Suomi). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Finnish (Suomi). Do not use any English words. The entire response must be in Finnish.'
    },
    'polish': {
      system: 'You MUST generate all questions and answers in Polish (Polski). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Polish (Polski). Do not use any English words. The entire response must be in Polish.'
    },
    'greek': {
      system: 'You MUST generate all questions and answers in Greek (Ελληνικά). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Greek (Ελληνικά). Do not use any English words. The entire response must be in Greek.'
    },
    'hebrew': {
      system: 'You MUST generate all questions and answers in Hebrew (עברית). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Hebrew (עברית). Do not use any English words. The entire response must be in Hebrew.'
    },
    'thai': {
      system: 'You MUST generate all questions and answers in Thai (ไทย). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Thai (ไทย). Do not use any English words. The entire response must be in Thai.'
    },
    'vietnamese': {
      system: 'You MUST generate all questions and answers in Vietnamese (Tiếng Việt). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Vietnamese (Tiếng Việt). Do not use any English words. The entire response must be in Vietnamese.'
    },
    'malay': {
      system: 'You MUST generate all questions and answers in Malay (Bahasa Melayu). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Malay (Bahasa Melayu). Do not use any English words. The entire response must be in Malay.'
    },
    'indonesian': {
      system: 'You MUST generate all questions and answers in Indonesian (Bahasa Indonesia). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Indonesian (Bahasa Indonesia). Do not use any English words. The entire response must be in Indonesian.'
    },
    'filipino': {
      system: 'You MUST generate all questions and answers in Filipino (Tagalog). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Filipino (Tagalog). Do not use any English words. The entire response must be in Filipino.'
    },
    'romanian': {
      system: 'You MUST generate all questions and answers in Romanian (Română). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Romanian (Română). Do not use any English words. The entire response must be in Romanian.'
    },
    'czech': {
      system: 'You MUST generate all questions and answers in Czech (Čeština). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Czech (Čeština). Do not use any English words. The entire response must be in Czech.'
    },
    'hungarian': {
      system: 'You MUST generate all questions and answers in Hungarian (Magyar). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Hungarian (Magyar). Do not use any English words. The entire response must be in Hungarian.'
    },
    'slovak': {
      system: 'You MUST generate all questions and answers in Slovak (Slovenčina). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Slovak (Slovenčina). Do not use any English words. The entire response must be in Slovak.'
    },
    'bulgarian': {
      system: 'You MUST generate all questions and answers in Bulgarian (Български). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Bulgarian (Български). Do not use any English words. The entire response must be in Bulgarian.'
    },
    'croatian': {
      system: 'You MUST generate all questions and answers in Croatian (Hrvatski). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Croatian (Hrvatski). Do not use any English words. The entire response must be in Croatian.'
    },
    'serbian': {
      system: 'You MUST generate all questions and answers in Serbian (Српски). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Serbian (Српски). Do not use any English words. The entire response must be in Serbian.'
    },
    'slovenian': {
      system: 'You MUST generate all questions and answers in Slovenian (Slovenščina). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Slovenian (Slovenščina). Do not use any English words. The entire response must be in Slovenian.'
    },
    'ukrainian': {
      system: 'You MUST generate all questions and answers in Ukrainian (Українська). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Ukrainian (Українська). Do not use any English words. The entire response must be in Ukrainian.'
    },
    'latvian': {
      system: 'You MUST generate all questions and answers in Latvian (Latviešu). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Latvian (Latviešu). Do not use any English words. The entire response must be in Latvian.'
    },
    'lithuanian': {
      system: 'You MUST generate all questions and answers in Lithuanian (Lietuvių). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Lithuanian (Lietuvių). Do not use any English words. The entire response must be in Lithuanian.'
    },
    'estonian': {
      system: 'You MUST generate all questions and answers in Estonian (Eesti). Do not use English.',
      user: 'CRITICAL: Generate ALL questions, options, and explanations in Estonian (Eesti). Do not use any English words. The entire response must be in Estonian.'
    }
  };

  const defaultInstructions = {
    system: 'Generate all questions and answers in English.',
    user: 'Generate all questions, options, and explanations in English.'
  };

  return languageMap[language.toLowerCase()] || defaultInstructions;
}