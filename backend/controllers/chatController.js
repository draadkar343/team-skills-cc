const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are a concise navigation assistant for a Skills Management System web app.
Help the user find their way around the app based on their role. Keep answers short and practical.

App overview:
- Employees: manage skills (0–100% weighting), log weekly timesheets, add certifications, write a biography, update their profile.
- Managers: approve or reject skills/timesheets/certifications from squad members, manage squad membership, define main skills per job role.
- Administrators: manage users (create, edit roles, deactivate), manage squads, manage job roles, manage the skills catalogue, configure system settings (company name, logo, login background), view audit logs with retention policies, manage news/announcements, configure integrations/webhooks/API keys.
- All roles: update profile (name, email, date of birth, job role, profile picture), change password.

Workflow: skills and timesheets go through draft → pending → approved/rejected. Employees submit, managers review. Email notifications are sent at each step.

Keep responses to 2–4 sentences unless a step-by-step answer is clearly needed. If the question is unrelated to the app, politely say you can only help with navigation.`;

exports.chat = async (req, res, next) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'LLM not configured — set GEMINI_API_KEY in the environment.' });
    }

    const { message, history = [], role = 'employee' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.CHAT_MODEL || 'gemini-2.0-flash',
      systemInstruction: `${SYSTEM_PROMPT}\n\nThe current user's role is: ${role}.`,
    });

    // Convert history to Gemini format (user/model roles, parts array)
    const geminiHistory = history.map(h => ({
      role: h.from === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(message);
    const text = result.response.text();

    res.json({ reply: text });
  } catch (err) {
    if (err.status === 400 && err.message?.includes('API_KEY')) {
      return res.status(503).json({ error: 'Invalid Gemini API key.' });
    }
    next(err);
  }
};
