import { profile } from './portfolio-data.mjs';

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => [...document.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const safeURL = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
};
const timeAgo = (value) => {
  const date = new Date(value);
  const delta = Date.now() - date.getTime();
  if (!Number.isFinite(delta)) return 'recent';
  const minutes = Math.max(1, Math.round(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

function wireProfile() {
  qs('#year').textContent = new Date().getFullYear();
  qs('#availability-text').textContent = profile.availability;

  qsa('[data-profile-link="github"]').forEach((el) => { el.href = profile.github; });
  qsa('[data-profile-link="linkedin"]').forEach((el) => { el.href = profile.linkedin; });
  qsa('[data-profile-link="resume"]').forEach((el) => { el.href = profile.resume; });
  qsa('[data-profile-link="email"]').forEach((el) => { el.href = `mailto:${profile.email}`; });
}

function showToast(message) {
  const toast = qs('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 2200);
}

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(profile.email);
    showToast('Email copied to clipboard');
  } catch {
    window.location.href = `mailto:${profile.email}`;
  }
}

qs('#copy-email-top').addEventListener('click', copyEmail);
qs('#copy-email-bottom').addEventListener('click', copyEmail);

function initScrollUI() {
  const progress = qs('#scroll-progress-bar');
  const backToTop = qs('#back-to-top');
  const navLinks = qsa('.desktop-nav a');
  const sections = navLinks.map((link) => qs(link.getAttribute('href'))).filter(Boolean);

  const update = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / max));
    progress.style.transform = `scaleX(${ratio})`;
    backToTop.classList.toggle('visible', window.scrollY > 650);

    let activeId = '';
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= 150) activeId = section.id;
    });
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`));
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
  update();
}

function initReveal() {
  if (reducedMotion || !('IntersectionObserver' in window)) {
    qsa('.reveal').forEach((el) => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px' });
  qsa('.reveal').forEach((el) => observer.observe(el));
}

async function checkHealth() {
  const aiStatusText = qs('#ai-status-text');
  const aiStatusDot = qs('#ai-status-dot');
  const title = qs('#ai-mode-title');
  const copy = qs('#ai-mode-copy');
  const label = qs('#assistant-mode-label');

  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    if (!response.ok) throw new Error('health check failed');
    const data = await response.json();
    if (data.aiConfigured) {
      aiStatusText.textContent = 'live';
      aiStatusDot.classList.add('live');
      title.textContent = 'Live AI mode enabled';
      copy.textContent = `Grounded recruiter Q&A is running through ${data.model || 'the configured OpenAI model'}.`;
      label.textContent = 'live · grounded';
    } else {
      aiStatusText.textContent = 'demo';
      aiStatusDot.classList.add('demo');
      title.textContent = 'Grounded demo mode';
      copy.textContent = 'The site is fully usable without an API key; add OPENAI_API_KEY in Vercel to enable live model responses.';
      label.textContent = 'demo · grounded';
    }
  } catch {
    aiStatusText.textContent = 'available';
    aiStatusDot.classList.add('demo');
    title.textContent = 'Portfolio AI ready';
    copy.textContent = 'The assistant will automatically use live AI when the server is configured, otherwise grounded demo responses.';
  }
}

const newsGrid = qs('#news-grid');
const newsStatus = qs('#news-status');
let currentCategory = 'frontier';

function renderNewsLoading() {
  newsGrid.setAttribute('aria-busy', 'true');
  newsGrid.innerHTML = '<div class="news-skeleton"></div><div class="news-skeleton"></div><div class="news-skeleton"></div>';
  newsGrid.className = 'news-skeleton-grid';
  newsStatus.textContent = 'Loading live technology coverage…';
}

async function loadNews(category = currentCategory) {
  currentCategory = category;
  renderNewsLoading();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api/news?category=${encodeURIComponent(category)}`, { cache: 'no-store', signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Newswire temporarily unavailable');
    const items = Array.isArray(data.items) ? data.items.slice(0, 9) : [];
    if (!items.length) throw new Error('No live headlines returned');

    newsGrid.className = 'news-grid';
    newsGrid.innerHTML = items.map((item) => `
      <a class="news-card" href="${safeURL(item.url)}" target="_blank" rel="noreferrer">
        <div class="news-meta"><span>${escapeHTML(item.source)}</span><span>${escapeHTML(timeAgo(item.publishedAt))}</span></div>
        <h3>${escapeHTML(item.title)}</h3>
        <div class="news-bottom"><span>${escapeHTML(item.country || item.language || 'Global')}</span><strong>Read source ↗</strong></div>
      </a>`).join('');

    const provider = data.provider || 'Live source';
    const fallback = data.degraded ? ' · fallback active' : '';
    newsStatus.textContent = `Live · ${items.length} headlines · ${provider}${fallback} · ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    qs('#news-source-note').textContent = data.degraded
      ? 'Primary global feed was unavailable, so the newswire switched to a public technology-news fallback. Every item still links to its original source.'
      : 'Live feed: GDELT DOC 2.0. Headlines remain the publishers’ work and link to original pages.';
  } catch (error) {
    newsGrid.className = 'news-grid';
    newsGrid.innerHTML = `
      <div class="system-notice news-fallback">
        <strong>Newswire is temporarily unavailable.</strong>
        <span>${escapeHTML(error.name === 'AbortError' ? 'The live feed timed out.' : (error.message || 'Try again in a moment.'))}</span>
        <div class="fallback-links"><a href="https://techcrunch.com/" target="_blank" rel="noreferrer">TechCrunch ↗</a><a href="https://news.ycombinator.com/" target="_blank" rel="noreferrer">Hacker News ↗</a><a href="https://www.theverge.com/tech" target="_blank" rel="noreferrer">The Verge ↗</a></div>
      </div>`;
    newsStatus.textContent = '';
  } finally {
    clearTimeout(timeout);
    newsGrid.setAttribute('aria-busy', 'false');
  }
}

qsa('.news-controls [data-category]').forEach((button) => button.addEventListener('click', () => {
  qsa('.news-controls [data-category]').forEach((b) => {
    const active = b === button;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', String(active));
  });
  loadNews(button.dataset.category);
}));
qs('#refresh-news').addEventListener('click', () => loadNews(currentCategory));

function repoLanguage(language) {
  return language ? `<span>${escapeHTML(language)}</span>` : '';
}

async function loadGitHub() {
  const profileEl = qs('#github-profile');
  const reposEl = qs('#github-repos');
  const statusEl = qs('#github-status');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch('/api/github', { cache: 'no-store', signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'GitHub data unavailable');

    const user = data.user || {};
    const repos = Array.isArray(data.repos) ? data.repos.slice(0, 6) : [];
    profileEl.classList.remove('skeleton-card');
    profileEl.setAttribute('aria-busy', 'false');
    profileEl.innerHTML = `
      <div class="github-identity">
        ${user.avatarUrl ? `<img src="${safeURL(user.avatarUrl)}" alt="" loading="lazy" />` : '<div class="avatar-fallback">JS</div>'}
        <div><span>@${escapeHTML(user.login || profile.githubUsername)}</span><strong>${escapeHTML(user.name || profile.name)}</strong><p>${escapeHTML(user.bio || 'Public GitHub profile and recent repositories.')}</p></div>
      </div>
      <div class="github-stats">
        <div><strong>${escapeHTML(user.publicRepos ?? repos.length)}</strong><span>public repos</span></div>
        <div><strong>${escapeHTML(user.followers ?? 0)}</strong><span>followers</span></div>
        <div><strong>${escapeHTML(user.following ?? 0)}</strong><span>following</span></div>
      </div>`;

    reposEl.innerHTML = repos.length ? repos.map((repo) => `
      <a class="repo-card" href="${safeURL(repo.url)}" target="_blank" rel="noreferrer">
        <div class="repo-top"><span>${escapeHTML(repo.name)}</span><strong>↗</strong></div>
        <p>${escapeHTML(repo.description || 'Public repository')}</p>
        <div class="repo-meta">${repoLanguage(repo.language)}<span>★ ${escapeHTML(repo.stars ?? 0)}</span><span>Updated ${escapeHTML(timeAgo(repo.updatedAt))}</span></div>
      </a>`).join('') : '<div class="system-notice"><strong>No public repositories returned.</strong><span>The GitHub profile link above is still available.</span></div>';

    statusEl.textContent = `Live · updated ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
  } catch (error) {
    profileEl.classList.remove('skeleton-card');
    profileEl.setAttribute('aria-busy', 'false');
    profileEl.innerHTML = `<div class="system-notice"><strong>GitHub preview unavailable.</strong><span>${escapeHTML(error.name === 'AbortError' ? 'The GitHub request timed out.' : (error.message || 'Open the profile directly.'))}</span></div>`;
    reposEl.innerHTML = '';
    statusEl.textContent = 'Direct GitHub profile remains available';
  } finally {
    clearTimeout(timeout);
  }
}

async function callAI(mode, prompt, target, button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = mode === 'fit' ? 'Comparing evidence…' : 'Reasoning…';
  target.classList.remove('hidden');
  target.textContent = mode === 'fit' ? 'Comparing documented evidence with the role…' : 'Reading approved portfolio evidence…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ mode, prompt }),
      signal: controller.signal
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.answer || 'AI request failed');
    target.textContent = data.answer || 'No answer returned.';
    if (data.demo === true) {
      qs('#assistant-mode-label').textContent = 'demo · grounded';
      qs('#ai-mode-title').textContent = 'Grounded demo mode';
    } else if (data.demo === false) {
      qs('#assistant-mode-label').textContent = 'live · grounded';
      qs('#ai-mode-title').textContent = 'Live AI mode enabled';
    }
  } catch (error) {
    target.textContent = error.name === 'AbortError'
      ? 'The AI request timed out. Please try again.'
      : `The AI endpoint could not complete this request. ${error.message || ''}`.trim();
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
    button.textContent = original;
  }
}

const aiQuestion = qs('#ai-question');
const askButton = qs('#ask-ai');
const aiAnswer = qs('#ai-answer');
askButton.addEventListener('click', () => {
  const prompt = aiQuestion.value.trim();
  if (!prompt) {
    aiAnswer.textContent = 'Enter a question about projects, experience, architecture or skills.';
    return;
  }
  callAI('chat', prompt, aiAnswer, askButton);
});
aiQuestion.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    askButton.click();
  }
});
qsa('[data-prompt]').forEach((button) => button.addEventListener('click', () => {
  aiQuestion.value = button.dataset.prompt;
  callAI('chat', button.dataset.prompt, aiAnswer, askButton);
}));
qsa('[data-project-prompt]').forEach((button) => button.addEventListener('click', () => {
  aiQuestion.value = button.dataset.projectPrompt;
  qs('#ai').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => callAI('chat', button.dataset.projectPrompt, aiAnswer, askButton), reducedMotion ? 0 : 500);
}));

const job = qs('#job-description');
const fitButton = qs('#analyze-fit');
const fitAnswer = qs('#fit-answer');
fitButton.addEventListener('click', () => {
  const prompt = job.value.trim();
  if (prompt.length < 80) {
    fitAnswer.classList.remove('hidden');
    fitAnswer.textContent = 'Paste a fuller job description so the analysis can compare specific requirements against portfolio evidence.';
    return;
  }
  callAI('fit', prompt, fitAnswer, fitButton);
});

function initCommandPalette() {
  const backdrop = qs('#command-backdrop');
  const firstLink = qs('.command-palette a');
  const openCommand = () => {
    backdrop.classList.remove('hidden');
    backdrop.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    setTimeout(() => firstLink?.focus(), 0);
  };
  const closeCommand = () => {
    backdrop.classList.add('hidden');
    backdrop.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
  };
  qs('#open-command').addEventListener('click', openCommand);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeCommand(); });
  qsa('.command-palette a').forEach((link) => link.addEventListener('click', closeCommand));
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      backdrop.classList.contains('hidden') ? openCommand() : closeCommand();
    }
    if (event.key === 'Escape') closeCommand();
  });
}

wireProfile();
initScrollUI();
initReveal();
initCommandPalette();
checkHealth();
loadGitHub();
loadNews();
