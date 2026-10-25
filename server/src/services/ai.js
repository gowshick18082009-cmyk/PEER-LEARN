import process from 'node:process';

const BASE_URL = 'https://generativelanguage.googleapis.com';

const demoTexts = {
  study_plan: 'Demo mode: Here is a simple 1-week plan. Day 1: review the main idea and write 3 questions. Day 2: solve 5 practice problems. Day 3: explain the topic in your own words. Day 4: test yourself with a short quiz. Day 5: fix mistakes and write a summary.',
  question_helper: 'Demo mode: Hi! I am stuck on this topic and would appreciate a quick explanation. Could you show me the main idea and one example? Also, what is the most common mistake to avoid?',
  practice_questions: 'Demo mode: 1. What is the key idea behind this concept?\n2. How would you solve a basic version of the problem?\n3. What changes when the problem gets harder?\n4. Which example best shows the pattern?\n5. What should you check before submitting your answer?',
};

export async function askAI(systemPrompt, userText, mode = 'study_plan') {
  const apiKey = process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    return demoTexts[mode] || demoTexts.study_plan;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await fetch(`${BASE_URL}/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
        contents: [{
          role: 'user',
          parts: [{ text: userText }],
        }],
      }),
    });

    if (response.status === 429) {
      return 'AI is busy';
    }

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('') || 'No answer generated.';

    return text.trim();
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return 'AI timed out';
    }
    if (error && error.message && error.message.includes('429')) {
      return 'AI is busy';
    }
    throw new Error('AI request failed');
  } finally {
    clearTimeout(timeout);
  }
}
