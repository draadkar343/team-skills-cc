const Anthropic = require('@anthropic-ai/sdk');

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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'LLM not configured — set ANTHROPIC_API_KEY in the environment.' });
    }

    const { message, history = [], role = 'employee' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const client = new Anthropic({ apiKey });

    // Build messages: prior history + current user message
    const messages = [
      ...history.map(h => ({ role: h.from === 'user' ? 'user' : 'assistant', content: h.text })),
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model: process.env.CHAT_MODEL || 'claude-opus-4-6',
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\nThe current user's role is: ${role}.`,
      messages,
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';
    res.json({ reply: text });
  } catch (err) {
    if (err.status === 401) return res.status(503).json({ error: 'Invalid Anthropic API key.' });
    next(err);
  }
};
