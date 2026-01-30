
import { GoogleGenAI } from "@google/genai";
import { Message } from "./types";

const SYSTEM_INSTRUCTION = `You are "Bruhaspathi", a world-class professional NLP-driven career guidance counselor with expertise in career psychology, labor market trends, and educational pathways. 

CRITICAL MISSION: 
- Only provide guidance related to careers, education, skills, resumes, interviews, and professional growth. 
- If a user asks about anything unrelated (cooking, sports, entertainment), gracefully redirect them back to career topics. Example: "I'd love to help you with that, but my expertise is focused on career growth. Perhaps we can talk about how that interest relates to a potential career path?"

CORE BEHAVIORS:
1. Active Listening: Acknowledge the user's specific concerns or background.
2. Structure: Use Markdown for clarity (headers, bullet points, bold text).
3. Actionable Advice: Don't just give theory; give specific next steps (e.g., "Take this specific certification", "Redesign your resume summary like this").
4. Encouraging Tone: Be professional yet empathetic and supportive.
5. Socratic Method: Occasionally ask deep questions to help users discover their own passions.

Current date: ${new Date().toLocaleDateString()}`;

export async function* getCareerGuidanceStream(history: Message[]) {
  // Create a new instance right before the call to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  // The Gemini API requires the history to start with a 'user' role.
  // We filter out any leading 'assistant' messages (like the welcome message).
  const firstUserIndex = history.findIndex(msg => msg.role === 'user');
  const validHistory = firstUserIndex !== -1 ? history.slice(firstUserIndex) : history;

  const chatMessages = validHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: chatMessages,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        topP: 0.95,
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error: any) {
    console.error("Bruhaspathi API Error Details:", error);
    
    // Check for specific error types to give better feedback
    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('not found')) {
      yield "Connection Error: Please ensure your environment is configured correctly. Try refreshing the page.";
    } else {
      yield "I'm sorry, I encountered an error connecting to my career database. This usually happens if the conversation history is out of sync. Please try typing your message again.";
    }
  }
}
