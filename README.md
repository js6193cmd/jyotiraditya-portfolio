# Jyotiraditya Singh — AI Engineering Portfolio

> AI-powered engineering portfolio showcasing software, data, backend and Generative AI work — with a grounded recruiter assistant, role-fit analyzer, live GitHub activity and a global tech newswire.

## What this repository contains

- Responsive, dependency-free portfolio frontend
- Live public GitHub profile/repository section
- Live global technology newswire using GDELT with a fallback source
- Grounded recruiter AI assistant
- Job-description role-fit analyzer
- DRDO experience, education, projects, capabilities and credentials
- Resume download
- Keyboard command palette (`Ctrl/Cmd + K`)
- Accessibility, reduced-motion support, security headers and graceful API failure states
- Vercel serverless functions under `/api`

## Deploy on Vercel

This project has no npm dependencies and no build command.

1. Import the repository into Vercel or upload the project ZIP.
2. Vercel serves `index.html` and auto-detects functions in `/api`.
3. Deploy.

### Optional environment variables

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
GITHUB_TOKEN=...
```

`OPENAI_API_KEY` enables live AI. Without it, the AI interface remains functional in grounded demo mode. `GITHUB_TOKEN` is optional and only increases GitHub API headroom for the public-repository widget.

## Editing the portfolio

See [`EDITING.md`](./EDITING.md) for the exact places to change contact details, profile links, project content, AI evidence and deployment settings.
