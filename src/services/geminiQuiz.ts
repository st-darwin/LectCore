import { databases, appwriteConfig } from '../appwrite/Client';
import { ID } from 'appwrite';

export interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const generateAndSaveQuiz = async (
  courseId: string,
  title: string,
  description: string,
  lectureNotes: string,
  createdBy: string
) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing VITE_GROQ_API_KEY environment variable in .env.local');
  }

  const prompt = `
    Based on the following lecture notes, generate 5 multiple-choice questions (MCQs).
    Return ONLY a valid JSON object containing a "questions" key with an array of objects.
    Do NOT include markdown formatting, backticks, or code blocks.
    
    JSON Structure:
    {
      "questions": [
        {
          "question": "Question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Brief explanation why Option A is correct"
        }
      ]
    }

    Lecture Notes:
    ${lectureNotes}
  `;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API request failed with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(rawContent);

    const questionsList: Question[] = Array.isArray(parsed) 
      ? parsed 
      : parsed.questions || [];

    if (questionsList.length === 0) {
      throw new Error('No questions could be parsed from AI response.');
    }

    // Save document into Appwrite 'quizzes' collection
    const quizDocument = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.quizzesId,
      ID.unique(),
      {
        courseId,
        title,
        description: description || '',
        questions: JSON.stringify(questionsList),
        createdBy,
      }
    );

    return quizDocument;
  } catch (err) {
    console.error('Failed to generate or save quiz via Groq:', err);
    throw err;
  }
};