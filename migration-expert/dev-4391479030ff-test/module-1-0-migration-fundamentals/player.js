// ---- registry.js
// Block registry. Every visual element the player renders is a block registered here, so a
// new element is one file in player/src/blocks/ (or a course's own player_blocks file) and
// core.js never changes.
//
//   Player.register('name', {
//     render(block, ctx)    returns a DOM node. ctx: key, page, course, learner, config,
//                           isDone(key), markDone(key), el(tag, attrs, children)
//     required(block, key)  optional. Items the learner must finish before Next unlocks:
//                           [{ key, label: 'flip card' }]. Keys are stored in suspend data.
//   });
//
// course.js names each block's type in its "t" key. build.py concatenates this file, the
// blocks, then core.js into one player.js.
window.Player = (function () {
  const blocks = {};

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
    }
    for (const child of [].concat(children || [])) if (child) node.append(child);
    return node;
  }

  // Unique IDs for aria-controls and label wiring.
  let uid = 0;
  function id(prefix) { uid += 1; return `${prefix || 'p'}-${uid}`; }

  function register(name, def) {
    if (typeof def.render !== 'function') throw new Error(`Block ${name} has no render()`);
    blocks[name] = def;
  }

  return { blocks, register, el, id };
})();

// ---- basic.js
// Text, accordion, flip card and callout: the WorkRamp content objects.
(function () {
  const { el, register } = Player;

  register('html', {
    render: block => el('div', { html: block.html }),
  });

  register('accordion', {
    required: (block, key) => block.items.map((_, i) => ({ key: `${key}:${i}`, label: 'accordion section' })),
    render(block, ctx) {
      return el('div', { class: 'accordion' }, block.items.map((item, i) => {
        const panelId = Player.id('acc');
        const panel = el('div', { class: 'accordion-panel', id: panelId, html: item.html, hidden: true });
        const button = el('button', {
          type: 'button', 'aria-expanded': 'false', 'aria-controls': panelId,
          onclick: () => {
            const open = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', String(!open));
            panel.hidden = open;
            if (!open) ctx.markDone(`${ctx.key}:${i}`);
          },
        }, item.title);
        return el('div', { class: 'accordion-item' }, [button, panel]);
      }));
    },
  });

  register('flip', {
    required: (block, key) => [{ key, label: 'flip card' }],
    render(block, ctx) {
      const card = el('div', { class: 'flip', role: 'button', tabindex: '0', 'aria-pressed': 'false' },
        el('div', { class: 'flip-inner' }, [
          el('div', { class: 'flip-face flip-front' }, [el('div', { html: block.front }), el('span', { class: 'flip-hint', text: 'Click to flip' })]),
          el('div', { class: 'flip-face flip-back' }, [el('div', { html: block.back }), el('span', { class: 'flip-hint', text: 'Click to flip back' })]),
        ]));
      const toggle = e => {
        if (e.target.closest('a')) return;
        const flipped = card.classList.toggle('flipped');
        card.setAttribute('aria-pressed', String(flipped));
        ctx.markDone(ctx.key);
      };
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); }
      });
      return card;
    },
  });

  register('callout', {
    render(block) {
      const kind = ['info', 'warning', 'tip'].includes(block.kind) ? block.kind : 'info';
      return el('div', { class: `callout ${kind}`, role: 'note' }, [
        el('img', { class: 'callout-icon', src: `images/callout-${kind}.svg`, alt: kind === 'info' ? 'Note' : kind[0].toUpperCase() + kind.slice(1) }),
        el('div', { class: 'callout-body' }, [
          block.title ? el('div', { class: 'callout-title', text: block.title }) : null,
          el('div', { html: block.html }),
        ]),
      ]);
    },
  });
})();

// ---- lab.js
// Launch Lab: opens the Instruqt track in a new tab with the learner's SCORM ID as
// icp_learnerid. When the track finishes, Instruqt's webhook (the Zap) marks the learner's
// WorkRamp registration complete. That runs server to server, so a learner can't fake it
// from the browser, and a module with a lab never marks itself complete.
(function () {
  const { el, register } = Player;

  function url(block, ctx) {
    const params = new URLSearchParams({
      token: block.token,
      show_challenges: 'true',
      finish_text: block.finishText || '',
      icp_name: ctx.learner.name,
      icp_learnerid: ctx.learner.id,
      icp_guideid: ctx.course.guideId,
      icp_guidename: ctx.course.title,
      icp_source: 'scorm',
    });
    return `${block.url}?${params}`;
  }

  register('lab', {
    url,
    render(block, ctx) {
      // The package can't see the lab's result, only that the learner launched it.
      const note = () => (ctx.launched && ctx.launched()
        ? 'You launched this lab. The module is marked complete when you finish every challenge. If you closed the lab before finishing, launch it again.'
        : 'The lab opens in a new tab. This module is marked complete when you finish every challenge in the lab.');
      const text = el('p', { class: 'subtext', text: note() });
      return el('div', { class: 'lab-launch' }, [
        el('a', { class: 'btn lab-btn', href: url(block, ctx), target: '_blank', rel: 'noopener', text: 'Launch Lab ►',
          onclick: () => { if (ctx.labLaunched) ctx.labLaunched(); text.textContent = note(); } }),
        text,
      ]);
    },
  });
})();

// ---- sort.js
// Sorting exercise: the learner puts each item in a bucket, then checks. Feedback explains
// every item. All items must be right before Next unlocks; wrong ones can be changed and
// checked again. Buttons, not drag and drop, so it works by keyboard and on touch screens.
//
//   { t: 'sort', title, prompt, buckets: ['A', 'B'], items: [{ text, bucket, why }] }
(function () {
  const { el, register } = Player;

  // Stable order per exercise, so items don't follow the source order (which is usually
  // grouped by answer) and don't move when the page re-renders.
  function shuffled(items, seed) {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return items.map((v, i) => [((h ^ (i * 2654435761)) >>> 0) % 1000, v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  }

  register('sort', {
    required: (block, key) => [{ key, label: 'interactive exercise' }],
    render(block, ctx) {
      const items = shuffled(block.items, ctx.key + block.title);
      const choice = new Map();
      const done = ctx.isDone(ctx.key);
      if (done) items.forEach(item => choice.set(item, item.bucket));

      const result = el('div', { class: 'sort-result', role: 'status' });
      const rows = items.map(item => {
        const buttons = block.buckets.map(bucket => el('button', {
          type: 'button', class: 'sort-choice', text: bucket, 'aria-pressed': String(choice.get(item) === bucket),
          onclick: () => { choice.set(item, bucket); update(row, item, false); result.textContent = ''; },
        }));
        const why = el('div', { class: 'sort-why', hidden: true });
        const row = el('li', { class: 'sort-item' }, [
          el('div', { class: 'sort-text', text: item.text }),
          el('div', { class: 'sort-choices', role: 'group', 'aria-label': `Where does ${item.text} belong?` }, buttons),
          why,
        ]);
        row._buttons = buttons;
        row._why = why;
        return row;
      });

      function update(row, item, checked) {
        row._buttons.forEach(b => b.setAttribute('aria-pressed', String(b.textContent === choice.get(item))));
        row.classList.remove('right', 'wrong');
        row._why.hidden = true;
        if (!checked) return;
        const right = choice.get(item) === item.bucket;
        row.classList.add(right ? 'right' : 'wrong');
        row._why.replaceChildren(el('strong', { text: right ? 'Correct. ' : `Belongs in ${item.bucket}. ` }), el('span', { html: item.why || '' }));
        row._why.hidden = !(item.why || !right);
      }

      function check() {
        const missing = items.filter(item => !choice.has(item)).length;
        if (missing) { result.textContent = `Place every item first (${missing} left).`; return; }
        rows.forEach((row, i) => update(row, items[i], true));
        const right = items.filter(item => choice.get(item) === item.bucket).length;
        if (right === items.length) {
          result.textContent = `All ${items.length} correct.`;
          ctx.markDone(ctx.key);
        } else {
          result.textContent = `${right} of ${items.length} correct. Change the items marked in red and check again.`;
        }
      }

      const wrap = el('div', { class: 'sort' }, [
        el('div', { class: 'sort-head' }, [el('strong', { text: block.title }), block.prompt ? el('p', { html: block.prompt }) : null]),
        el('ol', { class: 'sort-list' }, rows),
        el('div', { class: 'sort-actions' }, [el('button', { type: 'button', class: 'btn', text: 'Check answers', onclick: check }), result]),
      ]);
      if (done) { rows.forEach((row, i) => update(row, items[i], true)); result.textContent = `All ${items.length} correct.`; }
      return wrap;
    },
  });
})();

// ---- terminal.js
// Simulated terminal: the learner types each step's command and gets scripted output.
// {{name}} placeholders are filled with IDs generated per run ({{lines}} with a number).
//
//   steps: [{ title, goal, command, accept: [patterns], output: [{text, style, delay}],
//             mistakes: [{contains, coach}], coach, runs: [{output, coach}] }]
//
// accept patterns are literal commands. [OPTIONAL_QUOTE] matches a quote or nothing.
(function () {
  const { el, register } = Player;

  function randomId() {
    const chars = 'abcdefghijkmnopqrstuwxyz13456789';
    return Array.from({ length: 26 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  function normalize(cmd) {
    return cmd.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
  }

  register('terminal', {
    required: (block, key) => [{ key, label: 'interactive exercise' }],
    render(block, ctx) {
      const key = ctx.key;
      const vars = {};
      const fill = s => s.replace(/\{\{(\w+)\}\}/g, (_, name) => (vars[name] = vars[name] || (name === 'lines' ? String(1000 + Math.floor(Math.random() * 900)) : randomId())));
      const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // The first word of every accepted command, so an unknown command gets a different
      // nudge from a known tool used for the wrong step.
      const tools = new Set(block.steps.flatMap(s => (s.accept || [s.command]).map(a => normalize(a).split(' ')[0])));
      let step = 0;
      let runs = 0;
      let busy = false;
      const history = [];
      let historyAt = 0;

      const screen = el('div', { class: 'term-screen', role: 'log', 'aria-live': 'polite' });
      const input = el('input', { class: 'term-input', type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Terminal command' });
      const promptLine = el('label', { class: 'term-prompt-line' }, [el('span', { class: 'term-prompt', text: block.prompt }), input]);
      const goal = el('div', { class: 'term-goal' });
      const steps = el('ol', { class: 'term-steps' });
      const wrap = el('div', { class: 'term' }, [
        el('div', { class: 'term-head' }, [el('strong', { text: block.title }), block.intro ? el('p', { text: block.intro }) : null]),
        steps,
        goal,
        // Clicking the window focuses the prompt, except when the click ends a text
        // selection: focusing then would clear it before the learner can copy an ID.
        el('div', { class: 'term-window', onclick: () => { if (!window.getSelection().toString()) input.focus(); } }, [
          el('div', { class: 'term-bar' }, [el('span'), el('span'), el('span'), el('em', { text: block.host || 'terminal' })]),
          screen,
          promptLine,
        ]),
        el('div', { class: 'term-actions' }, [
          el('button', { type: 'button', class: 'btn secondary', text: 'Show command', onclick: () => {
            if (step < block.steps.length) { input.value = fill(block.steps[step].command); input.focus(); }
          } }),
          el('button', { type: 'button', class: 'btn secondary', text: 'Start over', onclick: reset }),
        ]),
      ]);

      function renderSteps() {
        steps.replaceChildren(...block.steps.map((s, i) => el('li', {
          class: i < step ? 'done' : i === step ? 'current' : '', text: s.title,
        })));
        goal.textContent = step < block.steps.length ? fill(block.steps[step].goal || '') : '';
        goal.hidden = step >= block.steps.length;
      }

      function print(text, cls) {
        screen.append(el('div', { class: `term-line ${cls || ''}`, text }));
        screen.scrollTop = screen.scrollHeight;
      }

      const sleep = ms => new Promise(r => setTimeout(r, ms));

      async function play(lines) {
        for (const line of lines) {
          await sleep(line.delay || 250);
          print(fill(line.text), line.style);
        }
      }

      function matches(s, cmd) {
        return (s.accept || [s.command]).some(pattern => {
          const source = escapeRe(normalize(fill(pattern))).replace(/\\\[OPTIONAL_QUOTE\\\]/g, '["\']?');
          return new RegExp(`^${source}$`).test(cmd);
        });
      }

      async function run(raw) {
        const cmd = normalize(raw);
        print(`${block.prompt} ${raw}`, 'echo');
        if (!cmd) return;
        if (cmd === 'clear') { screen.replaceChildren(); return; }
        if (step >= block.steps.length) { print(block.doneMessage || 'Exercise complete.', 'coach'); return; }
        const s = block.steps[step];
        if (cmd === 'help' || cmd === 'hint') { print(`Hint: ${fill(s.goal || s.title)}`, 'coach'); return; }
        if (!matches(s, cmd)) {
          const nudge = (s.mistakes || []).find(m => cmd.includes(fill(m.contains)));
          if (nudge) { print(fill(nudge.coach), 'coach'); return; }
          const which = tools.has(cmd.split(' ')[0]) ? 'That isn\'t the command for this step.' : 'This simulated terminal only runs the commands for this exercise.';
          print(`${which} Type help for a hint, or click Show command.`, 'coach');
          return;
        }
        busy = true;
        input.disabled = true;
        const outcome = s.runs ? s.runs[Math.min(runs, s.runs.length - 1)] : s;
        runs++;
        await play(outcome.output || []);
        if (outcome.coach) print(fill(outcome.coach), 'coach');
        if (!s.runs || runs >= s.runs.length) {
          step++;
          runs = 0;
          if (step >= block.steps.length) {
            print(block.doneMessage || 'Exercise complete.', 'coach done');
            ctx.markDone(key);
          }
        }
        renderSteps();
        busy = false;
        input.disabled = false;
        input.focus();
      }

      function reset() {
        for (const name of Object.keys(vars)) delete vars[name];
        step = 0;
        runs = 0;
        screen.replaceChildren();
        if (block.welcome) print(block.welcome, 'coach');
        renderSteps();
      }

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !busy) {
          const value = input.value;
          input.value = '';
          if (value.trim()) history.push(value);
          historyAt = history.length;
          run(value);
        } else if (e.key === 'ArrowUp' && historyAt > 0) {
          input.value = history[--historyAt];
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          historyAt = Math.min(history.length, historyAt + 1);
          input.value = history[historyAt] || '';
          e.preventDefault();
        }
      });

      reset();
      if (ctx.isDone(key)) print('You completed this exercise. Start over to run it again.', 'coach done');
      return wrap;
    },
  });
})();

// ---- walkthrough.js
// Diagram walkthrough: steps through the parts of an image one at a time. Each step can
// highlight a region of the image (spot: [x, y, width, height] in percent). Every step must
// be viewed before Next unlocks. Without an image it is a plain stepper.
//
//   { t: 'walkthrough', title, intro, image, alt, steps: [{ title, html, spot }] }
(function () {
  const { el, register } = Player;

  register('walkthrough', {
    required: (block, key) => [{ key, label: 'interactive exercise' }],
    render(block, ctx) {
      const total = block.steps.length;
      const seen = new Set();
      let at = 0;

      const panelId = Player.id('walk');
      const counter = el('div', { class: 'walk-count', 'aria-live': 'polite' });
      const panel = el('div', { class: 'walk-panel', id: panelId, role: 'region', 'aria-label': 'Current step' });
      const prev = el('button', { type: 'button', class: 'btn secondary', text: '← Back', onclick: () => show(at - 1) });
      const next = el('button', { type: 'button', class: 'btn', text: 'Next step →', onclick: () => show(at + 1) });

      const spots = [];
      let figure = null;
      if (block.image) {
        figure = el('div', { class: 'walk-figure' }, el('img', { src: block.image, alt: block.alt || block.title }));
        block.steps.forEach((step, i) => {
          if (!step.spot) return;
          const [x, y, w, h] = step.spot;
          const spot = el('button', {
            type: 'button', class: 'walk-spot', 'aria-controls': panelId,
            'aria-label': `Step ${i + 1}: ${step.title}`,
            style: `left:${x}%;top:${y}%;width:${w}%;height:${h}%`,
            onclick: () => show(i),
          }, el('span', { class: 'walk-badge', text: String(i + 1) }));
          spots[i] = spot;
          figure.append(spot);
        });
      }

      const list = el('ol', { class: 'walk-steps' }, block.steps.map((step, i) =>
        el('li', {}, el('button', { type: 'button', 'aria-controls': panelId, onclick: () => show(i) }, step.title))));

      function show(i) {
        at = Math.max(0, Math.min(total - 1, i));
        seen.add(at);
        const step = block.steps[at];
        panel.replaceChildren(el('h4', { text: step.title }), el('div', { html: step.html }));
        counter.textContent = `Step ${at + 1} of ${total} · viewed ${seen.size} of ${total}`;
        prev.disabled = at === 0;
        next.disabled = at === total - 1;
        spots.forEach((spot, j) => { if (spot) spot.classList.toggle('active', j === at); });
        if (figure) figure.classList.toggle('focused', !!spots[at]);
        [...list.children].forEach((li, j) => {
          li.classList.toggle('current', j === at);
          li.classList.toggle('seen', seen.has(j));
          li.firstChild.setAttribute('aria-current', j === at ? 'step' : 'false');
        });
        if (seen.size === total) ctx.markDone(ctx.key);
      }

      const wrap = el('div', { class: 'walk' }, [
        el('div', { class: 'walk-head' }, [el('strong', { text: block.title }), block.intro ? el('p', { html: block.intro }) : null]),
        figure,
        el('div', { class: 'walk-body' }, [list, el('div', { class: 'walk-main' }, [counter, panel, el('div', { class: 'walk-nav' }, [prev, next])])]),
      ]);
      if (ctx.isDone(ctx.key)) block.steps.forEach((_, i) => seen.add(i));
      show(0);
      return wrap;
    },
  });
})();

// ---- core.js
Scorm.whenReady(function () {
  const want = Scorm.launcher && Scorm.launcher.package;
  const have = (window.COURSE.config || {}).package;
  if (want && want !== have) {
    document.getElementById('page').textContent = 'This launcher is for ' + want + ' but loaded ' + have + '. Upload the launcher made for this module.';
    return;
  }
// Course player: renders window.COURSE (written by build.py) and reports progress to the
// LMS through window.Scorm. Blocks come from the registry (registry.js, blocks/*.js).
//
// A module without a lab completes when every page is visited (and the quiz submitted,
// when the package includes it). A module with a lab never marks itself complete: see
// blocks/lab.js.
//
// Pages unlock in order, as in a WorkRamp guide. A page counts as visited only once every
// required item on it is done: each block's required() lists them (flip cards, accordion
// sections, interactive exercises).
(function () {
  const { el, blocks: registry } = Player;
  const course = window.COURSE;
  const config = course.config || {};
  const pages = course.sections.flatMap(s => s.pages);
  const quizPage = pages.find(p => p.kind === 'quiz');
  const labPage = pages.find(p => p.kind === 'lab');
  const lab = labPage && labPage.blocks.find(b => b.t === 'lab');
  const QUESTION_TYPES = ['mc', 'match', 'written'];
  // Quiz rules from module.yml's quiz: key. The defaults are a module quiz; an exam limits
  // attempts and shows only the score.
  //   attempts  0 is unlimited. Otherwise the quiz locks after a pass or the last attempt.
  //   shuffle   question, choice and match order, new for each attempt and learner (default on)
  //   feedback  full (answers and explanations), marks (right or wrong), score (score only)
  //   hints     show each question's hint
  const rules = Object.assign({ attempts: 0, shuffle: true, feedback: 'full', hints: true }, config.quiz || {});
  const freshQuiz = (prev = {}) => ({ submitted: false, answers: {}, score: null, attempts: prev.attempts || 0, best: prev.best == null ? null : prev.best });

  Scorm.init();
  const learner = { id: Scorm.get('cmi.learner_id'), name: Scorm.get('cmi.learner_name') };
  // Taken once at launch, before the package writes anything.
  const diagnostic = config.testMode ? Scorm.diagnose() : null;
  const state = Object.assign(
    { visited: {}, done: {}, quiz: freshQuiz() },
    readSuspend()
  );
  // The score the LMS sees: the best attempt. Suspend data from before attempts were
  // counted has only the last score.
  const bestScore = () => (state.quiz.best != null ? state.quiz.best : state.quiz.score);
  const passed = () => bestScore() != null && bestScore() >= (config.passMark || 0);
  const attemptsLeft = () => (rules.attempts ? Math.max(rules.attempts - (state.quiz.attempts || 0), 0) : Infinity);
  // With limited attempts, the quiz is finished once passed or out of attempts, so the LMS
  // doesn't record a fail while a retake remains.
  const quizFinished = () => state.quiz.submitted && (!rules.attempts || passed() || attemptsLeft() === 0);
  const canRetake = () => !rules.attempts || (!passed() && attemptsLeft() > 0);
  let current = pages.find(p => p.id === Scorm.get('cmi.location')) || pages[0];

  function readSuspend() {
    try { return JSON.parse(Scorm.get('cmi.suspend_data') || '{}'); } catch (e) { return {}; }
  }

  // ---- Required interactions ------------------------------------------------

  // Keys are the page ID plus block index (plus a part index, such as an accordion section).
  function requiredItems(page) {
    const items = [];
    page.blocks.forEach((b, i) => {
      const def = registry[b.t];
      if (def && def.required) items.push(...def.required(b, `${page.id}:${i}`));
    });
    return items;
  }

  function remaining(page) {
    return requiredItems(page).filter(item => !state.done[item.key]).length;
  }

  function markDone(key) {
    if (state.done[key]) return;
    state.done[key] = true;
    if (remaining(current) === 0 && !state.visited[current.id]) {
      state.visited[current.id] = true;
      renderNav();
    }
    // Saved straight away, so a learner who closes the window keeps the item.
    report();
    renderPager();
  }

  // Test builds only: lets a developer move through pages without the required
  // interactions. Not saved, so it ends with the session and never reaches suspend data.
  let devUnlock = false;

  // A page is open once every page before it has been visited.
  function unlocked(page) {
    return devUnlock || pages.slice(0, pages.indexOf(page)).every(p => state.visited[p.id]);
  }

  // ---- LMS reporting -------------------------------------------------------

  function isComplete() {
    const allVisited = pages.every(p => state.visited[p.id]);
    return allVisited && (!quizPage || quizFinished());
  }

  function report() {
    // The quiz page counts when the quiz is finished, not when it's opened: an exam is one
    // page, and opening it isn't half done.
    const steps = pages.length;
    const done = pages.filter(p => p.kind !== 'quiz' && state.visited[p.id]).length + (quizPage && quizFinished() ? 1 : 0);
    Scorm.set('cmi.location', current.id);
    Scorm.set('cmi.suspend_data', JSON.stringify(state));
    Scorm.set('cmi.progress_measure', (done / steps).toFixed(2));
    const score = bestScore();
    if (score != null) {
      Scorm.set('cmi.score.scaled', score.toFixed(2));
      Scorm.set('cmi.score.raw', Math.round(score * 100));
      Scorm.set('cmi.score.min', 0);
      Scorm.set('cmi.score.max', 100);
    }
    if (isComplete() && !lab) {
      Scorm.set('cmi.completion_status', 'completed');
      Scorm.set('cmi.success_status', score == null || passed() ? 'passed' : 'failed');
    } else {
      Scorm.set('cmi.completion_status', 'incomplete');
    }
    Scorm.commit();
    renderProgress(done, steps);
    renderDebug();
  }

  // ---- Navigation -----------------------------------------------------------

  function renderNav() {
    document.getElementById('module-title').textContent = course.title;
    document.title = course.title;
    const nav = document.getElementById('nav');
    nav.replaceChildren();
    for (const section of course.sections) {
      nav.append(el('li', { class: 'section', text: section.title }));
      for (const page of section.pages) {
        const done = page.kind === 'quiz' ? quizFinished() : state.visited[page.id];
        const open = unlocked(page);
        nav.append(el('li', { class: `${done ? 'done' : ''}${open ? '' : ' locked'}` }, el('button', {
          type: 'button',
          'aria-current': page === current ? 'page' : false,
          'aria-disabled': open ? false : 'true',
          title: open ? false : 'Finish the earlier pages first',
          onclick: () => { if (open) go(page); },
        }, [el('span', { class: 'dot', 'aria-hidden': 'true' }), el('span', { text: page.title })])));
      }
    }
  }

  function renderProgress(done, steps) {
    const pct = Math.round((done / steps) * 100);
    // A lab module completes only when the Instruqt lab is finished, which the package
    // can't see. So it never claims "complete": it says what it can, launched or not.
    const parts = [lab ? `Pages ${pct}%` : `${pct}% complete`];
    if (bestScore() != null) parts.push(`Quiz ${Math.round(bestScore() * 100)}%`);
    if (lab) parts.push(state.labLaunched ? 'Lab launched, finish it in Instruqt' : 'Lab not started');
    const box = document.getElementById('progress');
    box.replaceChildren(el('div', { text: parts.join(' · ') }),
      el('div', { class: 'bar' }, el('span', { style: `width:${pct}%` })));
  }

  // Set by Finish: the LMS session is over, so nothing may write to it.
  let closed = false;

  function go(page) {
    if (closed) return;
    current = page;
    if (remaining(page) === 0) state.visited[page.id] = true;
    renderPage();
    renderNav();
    report();
    window.scrollTo(0, 0);
  }

  // ---- Blocks ---------------------------------------------------------------

  function context(page, key) {
    return {
      key, page, course, learner, config, el,
      isDone: k => !!state.done[k],
      markDone,
      labLaunched,
      launched: () => !!state.labLaunched,
    };
  }

  // Quiz questions are rendered separately by quizView.
  function renderBlocks(page) {
    return page.blocks.map((block, i) => {
      if (QUESTION_TYPES.includes(block.t)) return null;
      const def = registry[block.t];
      if (!def) {
        console.warn(`No player block registered for "${block.t}"`);
        return config.testMode ? el('div', { class: 'block missing-image', text: `[no player block for "${block.t}"]` }) : null;
      }
      return el('div', { class: `block block-${block.t}` }, def.render(block, context(page, `${page.id}:${i}`)));
    }).filter(Boolean);
  }

  // ---- Quiz -----------------------------------------------------------------

  function shuffled(items, seed) {
    // Stable per question, so the order doesn't change when the page re-renders.
    // Fisher-Yates driven by mulberry32, seeded from the string.
    let h = 1779033703;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353) >>> 0;
    const random = () => {
      h = (h + 0x6D2B79F5) >>> 0;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function grade(q, answer) {
    if (q.t === 'mc') {
      const picked = [].concat(answer || []).sort();
      return picked.length === q.correct.length && [...q.correct].sort().every((id, i) => id === picked[i]);
    }
    if (q.t === 'match') return q.pairs.every((p, i) => (answer || {})[i] === p.answer);
    return null; // written answers are recorded, not scored
  }

  // Seeds the shuffle for the attempt on screen: a submitted attempt keeps its order.
  function attemptSeed() {
    const n = (state.quiz.attempts || 0) - (state.quiz.submitted ? 1 : 0);
    return `${learner.id || ''}:${n}`;
  }

  function questionView(q, n) {
    const submitted = state.quiz.submitted;
    const answer = state.quiz.answers[q.id];
    const trueFalse = q.t === 'mc' && q.choices.map(c => c.text).join() === 'True,False';
    const choices = q.t === 'mc' && rules.shuffle && !trueFalse ? shuffled(q.choices, attemptSeed() + q.id) : q.choices;
    const box = el('div', { class: 'question' }, [
      el('div', { class: 'q-num', text: `Question ${n}${q.t === 'written' ? ' (written response, not auto-graded)' : ''}` }),
      q.subtext ? el('p', { class: 'subtext', text: q.subtext }) : null,
      el('p', {}, el('strong', { text: q.question })),
    ]);
    if (q.t === 'mc') {
      if (q.multi) box.append(el('p', { class: 'subtext', text: `Select ${q.correct.length}.` }));
      for (const choice of choices) {
        const checked = [].concat(answer || []).includes(choice.id);
        box.append(el('label', {}, [
          el('input', { type: q.multi ? 'checkbox' : 'radio', name: q.id, value: choice.id, checked, disabled: submitted }),
          el('span', { text: choice.text }),
        ]));
      }
    } else if (q.t === 'match') {
      // The answers are always shuffled, or each row's answer would sit in its own position.
      // With shuffle on, the rows move too, and both change with each attempt.
      const seed = rules.shuffle ? attemptSeed() + q.id : q.id;
      const options = shuffled(q.pairs.map(p => p.answer), seed);
      const rows = q.pairs.map((pair, i) => ({ pair, i }));
      for (const { pair, i } of rules.shuffle ? shuffled(rows, seed + ':rows') : rows) {
        const select = el('select', { name: `${q.id}:${i}`, disabled: submitted, 'aria-label': pair.prompt },
          [el('option', { value: '', text: 'Choose…' }), ...options.map(o => el('option', { value: o, text: o, selected: (answer || {})[i] === o }))]);
        box.append(el('div', { class: 'match-row' }, [el('span', { text: pair.prompt }), select]));
      }
    } else {
      box.append(el('textarea', { name: q.id, disabled: submitted, 'aria-label': q.question }, answer || ''));
    }
    if (q.hint && !submitted && rules.hints) {
      const hint = el('div', { class: 'hint' });
      hint.append(el('button', { type: 'button', text: 'Show hint', onclick: () => hint.replaceChildren(`Hint: ${q.hint}`) }));
      box.append(hint);
    }
    if (submitted) {
      const result = grade(q, answer);
      const cls = result === null ? 'recorded' : result ? 'correct' : 'incorrect';
      const label = result === null ? 'Response recorded.' : result ? 'Correct.' : 'Incorrect.';
      const fb = el('div', { class: `feedback ${cls}` }, el('div', { text: label }));
      if (rules.feedback === 'marks') {
        box.append(fb);
        return box;
      }
      if (result === false && q.t === 'mc') {
        fb.append(el('div', { class: 'why', text: 'Correct answer: ' + q.choices.filter(c => q.correct.includes(c.id)).map(c => c.text).join('; ') }));
      }
      if (result === false && q.t === 'match') {
        fb.append(el('div', { class: 'why', text: 'Correct matches: ' + q.pairs.map(p => `${p.prompt} → ${p.answer}`).join('; ') }));
      }
      if (q.explanation) fb.append(el('div', { class: 'why', text: q.explanation }));
      if (q.modelAnswer) fb.append(el('div', { class: 'why', text: `A strong answer: ${q.modelAnswer}` }));
      box.append(fb);
    }
    return box;
  }

  function collect(form, questions) {
    const answers = {};
    for (const q of questions) {
      if (q.t === 'mc') {
        const picked = [...form.querySelectorAll(`input[name="${q.id}"]:checked`)].map(i => i.value);
        answers[q.id] = q.multi ? picked : picked[0];
      } else if (q.t === 'match') {
        answers[q.id] = q.pairs.map((_, i) => form.querySelector(`select[name="${q.id}:${i}"]`).value);
      } else {
        answers[q.id] = form.querySelector(`textarea[name="${q.id}"]`).value.trim();
      }
    }
    return answers;
  }

  function unanswered(q, a) {
    if (q.t === 'mc') return !a || (Array.isArray(a) && a.length === 0);
    if (q.t === 'match') return a.some(v => !v);
    return !a;
  }

  function recordInteractions(questions) {
    const types = { mc: 'choice', match: 'matching', written: 'long-fill-in' };
    let n = Number(Scorm.get('cmi.interactions._count')) || 0;
    for (const q of questions) {
      const a = state.quiz.answers[q.id];
      const result = grade(q, a);
      const response = q.t === 'mc' ? [].concat(a).join('[,]')
        : q.t === 'match' ? q.pairs.map((p, i) => `${i}[.]${(a[i] || '').replace(/\W+/g, '_')}`).join('[,]')
        : a;
      Scorm.set(`cmi.interactions.${n}.id`, q.id);
      Scorm.set(`cmi.interactions.${n}.type`, types[q.t]);
      Scorm.set(`cmi.interactions.${n}.description`, q.question.slice(0, 250));
      Scorm.set(`cmi.interactions.${n}.learner_response`, String(response).slice(0, 4000));
      Scorm.set(`cmi.interactions.${n}.result`, result === null ? 'neutral' : result ? 'correct' : 'incorrect');
      n++;
    }
  }

  function quizView(blocks) {
    const all = blocks.filter(b => QUESTION_TYPES.includes(b.t));
    const questions = rules.shuffle ? shuffled(all, attemptSeed()) : all;
    const form = el('form', { class: 'block', novalidate: true });
    const submitted = state.quiz.submitted;
    // feedback: score hides the questions once submitted, so a retake can't copy the key.
    if (!(submitted && rules.feedback === 'score')) questions.forEach((q, i) => form.append(questionView(q, i + 1)));
    const message = el('p', { class: 'subtext', role: 'status' });
    const pct = s => `${Math.round(s * 100)}%`;
    if (!submitted && rules.attempts) {
      form.prepend(el('p', { class: 'subtext', text: `Attempt ${(state.quiz.attempts || 0) + 1} of ${rules.attempts}.` +
        (config.passMark ? ` You need ${pct(config.passMark)} to pass.` : '') }));
    }
    if (submitted) {
      const gradable = questions.filter(q => q.t !== 'written').length;
      const right = questions.filter(q => grade(q, state.quiz.answers[q.id]) === true).length;
      const lines = [`Score: ${right} of ${gradable} auto-graded questions correct (${pct(state.quiz.score)}).`];
      if (config.passMark) {
        lines.push(passed() ? 'Passed.' : `Not passed. You need ${pct(config.passMark)} to pass.`);
        if (state.quiz.attempts > 1) lines.push(`Best score: ${pct(bestScore())}.`);
      }
      if (rules.attempts && !passed()) {
        lines.push(attemptsLeft() ? `${attemptsLeft()} of ${rules.attempts} attempts left.` : 'No attempts left.');
      }
      form.append(el('div', { class: 'quiz-result' }, lines.map(text => el('div', { text }))));
      if (canRetake()) {
        form.append(el('p', {}, el('button', { type: 'button', class: 'btn secondary', text: 'Retake quiz', onclick: () => {
          state.quiz = freshQuiz(state.quiz);
          go(current);
        } })));
      }
    } else {
      form.append(message, el('button', { type: 'submit', class: 'btn', text: 'Submit answers' }));
    }
    form.addEventListener('submit', e => {
      e.preventDefault();
      const answers = collect(form, questions);
      const missing = questions.filter(q => unanswered(q, answers[q.id])).length;
      if (missing) { message.textContent = `Answer every question before submitting (${missing} left).`; return; }
      submitQuiz(questions, answers);
      go(current);
    });
    return form;
  }

  // Scores one attempt and records it. Both the form and the Dev course debugger use it,
  // so a debugger submission reaches the LMS the same way a learner's does.
  function submitQuiz(questions, answers) {
    const gradable = questions.filter(q => q.t !== 'written');
    const right = gradable.filter(q => grade(q, answers[q.id])).length;
    const score = gradable.length ? right / gradable.length : 1;
    const best = state.quiz.best == null ? score : Math.max(state.quiz.best, score);
    state.quiz = { submitted: true, answers, score, attempts: (state.quiz.attempts || 0) + 1, best };
    recordInteractions(questions);
  }

  // The package's own answer key, for the debugger's Complete quiz.
  function correctAnswer(q) {
    if (q.t === 'mc') return q.multi ? [...q.correct] : q.correct[0];
    if (q.t === 'match') return q.pairs.map(p => p.answer);
    return 'Answered by the Dev course debugger.';
  }

  // ---- Page -----------------------------------------------------------------

  function renderPage() {
    const page = document.getElementById('page');
    page.replaceChildren();
    const first = current.blocks[0];
    if (!(first && first.t === 'html' && /^\s*<h[1-3]/i.test(first.html))) page.append(el('h1', { text: current.title }));
    page.append(...renderBlocks(current));
    if (current.kind === 'quiz') page.append(quizView(current.blocks));
    if (lab && current === pages[pages.length - 1] && current !== labPage) page.append(labReminder());
    renderPager();
  }

  // On the last page of a lab module: the module completes only from the lab. The package
  // knows whether the learner launched it, not whether they finished it.
  function labReminder() {
    const box = registry.callout.render(state.labLaunched
      ? { kind: 'info', title: 'Finish the lab to complete this module',
        html: '<p>This module is marked complete when you finish every challenge in the lab. If you haven\'t finished it, launch it again from the lab page. After you finish, completion can take a few minutes to appear in the certification.</p>' }
      : { kind: 'warning', title: 'You haven\'t started the lab',
        html: '<p>This module is marked complete only when you finish every challenge in the lab.</p>' });
    box.classList.add('lab-reminder');
    box.querySelector('.callout-body').append(el('button', { type: 'button', class: 'btn secondary', text: `Go to ${labPage.title}`, onclick: () => go(labPage) }));
    return box;
  }

  function labLaunched() {
    if (state.labLaunched) return;
    state.labLaunched = true;
    report();
  }

  function renderPager() {
    const i = pages.indexOf(current);
    const left = remaining(current);
    const prev = document.getElementById('prev');
    const next = document.getElementById('next');
    const last = i === pages.length - 1;
    // The last page has no next page, so the button becomes Finish: it saves the attempt and
    // asks the LMS to close the course. A quiz page needs its quiz submitted first.
    const quizOpen = current.kind === 'quiz' && !state.quiz.submitted;
    prev.disabled = i === 0;
    next.disabled = (left > 0 || (last && quizOpen)) && !devUnlock;
    next.innerHTML = last ? 'Finish' : 'Next &rarr;';
    prev.onclick = () => go(pages[i - 1]);
    next.onclick = last ? finishCourse : () => go(pages[i + 1]);
    document.getElementById('gate').textContent = left
      ? `Complete every flip card, accordion section and exercise to continue (${left} left).`
      : last && quizOpen ? 'Submit the quiz to finish.' : '';
    const wrap = document.getElementById('next-wrap');
    if (left) wrap.dataset.tip = gateTip(current);
    else delete wrap.dataset.tip;
  }

  // suspendAll keeps the attempt, so the learner resumes with their progress next time.
  // exitAll would end the attempt, and the next launch would start from nothing.
  function finishCourse() {
    report();
    Scorm.set('adl.nav.request', 'suspendAll');
    Scorm.finish();
    closed = true;
    // The LMS normally closes the course now. If it doesn't (or there is no LMS), say so.
    const page = document.getElementById('page');
    page.replaceChildren(...[el('h1', { text: 'Progress saved' }),
      el('p', { text: 'You can close this window and return to the certification.' }),
      lab ? el('p', { text: 'This module is marked complete when you finish every challenge in the lab.' }) : null,
    ].filter(Boolean));
    for (const id of ['prev', 'next']) document.getElementById(id).disabled = true;
    document.getElementById('gate').textContent = '';
  }

  function gateTip(page) {
    const open = requiredItems(page).filter(item => !state.done[item.key]);
    const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
    const counts = {};
    for (const item of open) counts[item.label] = (counts[item.label] || 0) + 1;
    const kinds = Object.entries(counts).map(([label, n]) => plural(n, label))
      .join(', ').replace(/, ([^,]*)$/, ' and $1');
    return `You have ${plural(open.length, 'required item')} left (${kinds}). ` +
      'Complete each one to continue to the next page.';
  }

  // ---- Dev course debugger (test builds) ------------------------------------

  // The panel starts collapsed to a small tab so it doesn't cover the course.
  let debugOpen = false;

  // When, how and by whom this package was built (scormkit/buildinfo.py).
  function buildView() {
    const b = config.build;
    if (!b) return [el('h4', { text: 'Build' }), el('pre', { text: 'No build details. Rebuild with the current build.py.' })];
    const lines = [
      ['Version', b.version || 'none (not built by release.py)'],
      ['Built', b.time],
      ['By', b.by || 'unknown'],
      ['How', b.how],
      ['Run', b.command],
      ['From', `${b.commit || 'no git commit'}${b.branch ? ` on ${b.branch}` : ''}`],
      ['Type', `${b.mode} build, ${b.quiz ? 'with' : 'without'} the module quiz`],
    ].map(([label, value]) => `${(label + ':').padEnd(9)}${value}`);
    const warnings = [];
    if (b.uncommitted) warnings.push(`${b.uncommitted} uncommitted change${b.uncommitted > 1 ? 's' : ''} in scorm/ or the course at build time: the package may not match ${b.commit}.`);
    if (b.source) warnings.push(b.source);
    return [
      el('h4', { text: 'Build' }),
      el('pre', { text: lines.join('\n') }),
      b.run ? el('a', { href: b.run, target: '_blank', rel: 'noopener', class: 'debug-link', text: 'Open the workflow run' }) : null,
      ...warnings.map(text => el('pre', { class: 'debug-warn', text })),
    ];
  }

  function renderDebug() {
    if (!config.testMode) return;
    const box = document.getElementById('debug');
    box.hidden = false;
    box.classList.toggle('collapsed', !debugOpen);
    const header = el('div', { class: 'debug-head' }, [
      el('strong', { text: 'Dev course debugger' }),
      el('button', { type: 'button', class: 'debug-toggle', 'aria-expanded': String(debugOpen),
        text: debugOpen ? 'Minimize' : 'Show', onclick: () => { debugOpen = !debugOpen; renderDebug(); } }),
    ]);
    if (!debugOpen) {
      box.replaceChildren(header);
      return;
    }
    const labUrl = lab && registry.lab ? registry.lab.url(lab, context(labPage, '')) : '';
    // Optional entries are null when they don't apply; leave them out.
    box.replaceChildren(...[
      header,
      ...buildView(),
      el('h4', { text: 'LMS' }),
      el('pre', { text: `Connected to LMS API: ${Scorm.connected}\nlearner_id: ${learner.id}\nlearner_name: ${learner.name}\npages done: ${isComplete()}${lab ? ' (lab module: completion comes from the Zap)' : ''}` }),
      lab ? el('h4', { text: 'Lab URL' }) : null,
      lab ? el('pre', { text: labUrl.replace(/token=[^&]+/, 'token=…') }) : null,
      el('details', {}, [
        el('summary', { text: 'Launch diagnostic' }),
        el('pre', { text: JSON.stringify(diagnostic, null, 1) }),
      ]),
      el('button', { type: 'button', class: 'btn secondary', text: 'Copy diagnostic', onclick: e => {
        const text = JSON.stringify(diagnostic, null, 1);
        const done = () => { e.target.textContent = 'Copied'; };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => window.prompt('Copy the diagnostic:', text));
        else window.prompt('Copy the diagnostic:', text);
      } }),
      el('button', { type: 'button', class: 'btn secondary', text: devUnlock ? 'Relock pages' : 'Unlock all pages', onclick: () => {
        devUnlock = !devUnlock;
        renderNav();
        renderPager();
        renderDebug();
      } }),
      el('button', { type: 'button', class: 'btn secondary', text: 'Mark all pages read', onclick: () => {
        pages.forEach(p => { requiredItems(p).forEach(item => { state.done[item.key] = true; }); state.visited[p.id] = true; });
        go(current);
      } }),
      // Submits every question correctly, as a learner would: it uses an attempt, scores
      // 100% and completes the quiz. Out of attempts or already passed, there is nothing to do.
      quizPage ? el('button', { type: 'button', class: 'btn secondary', text: 'Complete quiz',
        disabled: state.quiz.submitted && !canRetake(),
        title: state.quiz.submitted && !canRetake() ? 'The quiz is finished' : 'Submit every question correctly',
        onclick: () => {
          if (state.quiz.submitted) state.quiz = freshQuiz(state.quiz);
          const questions = quizPage.blocks.filter(b => QUESTION_TYPES.includes(b.t));
          submitQuiz(questions, Object.fromEntries(questions.map(q => [q.id, correctAnswer(q)])));
          go(quizPage);
        } }) : null,
      el('button', { type: 'button', class: 'btn secondary', text: 'Reset progress', onclick: () => {
        Object.assign(state, { visited: {}, done: {}, quiz: freshQuiz(), labLaunched: false });
        go(pages[0]);
      } }),
      el('h4', { text: 'SCORM calls (last 25)' }),
      el('pre', { text: Scorm.log.slice(-25).join('\n') }),
    ].filter(Boolean));
  }

  go(current);
})();

});