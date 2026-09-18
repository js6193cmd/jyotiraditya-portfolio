# Editing Guide

## 1. Contact details and professional profiles

Edit **`portfolio-data.mjs`** first. The important block is:

```js
export const profile = {
  email: '...',
  linkedin: '...',
  github: '...',
  githubUsername: '...',
  resume: '/Jyotiraditya_Singh_Resume.pdf'
}
```

The browser reads those values automatically for repeated GitHub, LinkedIn, email and resume links.

If you change your GitHub username, also update `USERNAME` at the top of **`api/github.mjs`**.

## 2. Resume

Replace **`Jyotiraditya_Singh_Resume.pdf`** with the new PDF. Keep the same filename if you do not want to edit any links.

## 3. Visible portfolio text

Edit **`index.html`** for:

- hero copy
- project cards
- experience / education
- credentials
- skills
- section descriptions

Search for the exact text you want to change.

## 4. What the recruiter AI is allowed to say

Edit **`approvedEvidence`** in **`portfolio-data.mjs`** whenever you change projects, skills, education, metrics or experience.

This is deliberately separate from the model: the assistant is instructed not to invent facts outside this approved evidence.

## 5. AI provider

In Vercel: **Project → Settings → Environment Variables**.

- `OPENAI_API_KEY` — enables live AI
- `OPENAI_MODEL` — optional; defaults to `gpt-5.6-luna`

After changing environment variables, redeploy the production deployment.

## 6. Styling

Edit **`styles.css`**. Main colors are at the top:

```css
--bg: #07080b;
--lime: #9dff62;
--cyan: #6ae4ff;
--violet: #a989ff;
```

## 7. Deploy after edits

Best workflow: push edits to the GitHub repository connected to Vercel. A push to the production branch triggers a new production deployment automatically.
