// Minimal SCORM 2004 runtime wrapper. Finds the LMS's API_1484_11 object in a parent
// frame or the opener window. With no LMS (opening index.html directly), it falls back to
// localStorage so the course can still be previewed; nothing is reported anywhere.
(function () {
  function findApi(win) {
    for (let i = 0; win && i < 10; i++) {
      try {
        // Same origin only: browsers block a cross-origin API anyway (dispatch content
        // reaches the LMS through its launcher instead).
        if (win.API_1484_11 && win.location.origin === window.location.origin) return win.API_1484_11;
      } catch (e) { /* cross-origin frame: keep walking */ }
      if (win.parent === win) break;
      win = win.parent;
    }
    return null;
  }

  const api = findApi(window) || (window.opener && findApi(window.opener));

  // Dispatch: the package in the LMS is a launcher (scormkit/launcher.py) that owns the
  // LMS API and loads this content in a frame from another origin, which can't reach the
  // API. The launcher sends the learner's launch values once, so reads come from that
  // snapshot, and relays every write to the LMS. The player starts only once the snapshot
  // arrives: build.py runs core.js through Scorm.whenReady.
  function bridge(snapshot, launcherOrigin) {
    const data = Object.assign({}, snapshot);
    const send = msg => window.parent.postMessage(Object.assign({ scorm: 1 }, msg), launcherOrigin);
    return {
      Initialize() { return 'true'; },
      GetValue(k) { return k in data ? data[k] : ''; },
      SetValue(k, v) {
        data[k] = String(v);
        // The player reads the interaction count again on each quiz submission.
        const m = /^cmi\.interactions\.(\d+)\.id$/.exec(k);
        if (m) data['cmi.interactions._count'] = String(Math.max(Number(data['cmi.interactions._count']) || 0, Number(m[1]) + 1));
        send({ op: 'set', k, v: String(v) });
        return 'true';
      },
      Commit() { send({ op: 'commit' }); return 'true'; },
      Terminate() { send({ op: 'terminate' }); return 'true'; },
      GetLastError() { return '0'; },
      GetErrorString() { return ''; },
    };
  }
  const framed = !api && window.parent !== window;
  const waiting = [];
  let ready = !framed;
  let launcher = null;

  const local = {
    key: 'scorm-preview:' + location.pathname,
    data: {},
    Initialize() { try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { this.data = {}; } return 'true'; },
    GetValue(k) {
      if (k === 'cmi.learner_id') return 'preview-learner';
      if (k === 'cmi.learner_name') return 'Preview, Learner';
      if (k === 'cmi.entry') return this.data['cmi.suspend_data'] ? 'resume' : 'ab-initio';
      return this.data[k] || '';
    },
    SetValue(k, v) { this.data[k] = String(v); return 'true'; },
    Commit() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* private mode */ } return 'true'; },
    Terminate() { return this.Commit(); },
    GetLastError() { return '0'; },
    GetErrorString() { return ''; },
  };

  let lms = api || local;

  function start() {
    ready = true;
    waiting.splice(0).forEach(fn => fn());
  }

  if (framed) {
    // No launcher answers within a few seconds: a plain preview in someone else's frame.
    const fallback = setTimeout(start, 4000);
    window.addEventListener('message', e => {
      const msg = e.data;
      if (e.source !== window.parent || !msg || msg.scorm !== 1 || msg.op !== 'init' || launcher) return;
      clearTimeout(fallback);
      launcher = Object.assign({ origin: e.origin }, msg.launcher);
      lms = bridge(msg.snapshot || {}, e.origin);
      window.Scorm.connected = true;
      window.Scorm.launcher = launcher;
      start();
    });
    window.parent.postMessage({ scorm: 1, op: 'hello' }, '*');
  }
  let started = false;
  let finished = false;
  const startTime = Date.now();

  function isoDuration(ms) {
    const s = Math.round(ms / 1000);
    return `PT${Math.floor(s / 3600)}H${Math.floor((s % 3600) / 60)}M${s % 60}S`;
  }

  // Every read-only CMI element a SCORM 2004 LMS may fill in at launch.
  const LAUNCH_ELEMENTS = [
    'cmi._version', 'cmi.learner_id', 'cmi.learner_name', 'cmi.launch_data', 'cmi.mode', 'cmi.credit',
    'cmi.entry', 'cmi.location', 'cmi.completion_status', 'cmi.success_status', 'cmi.completion_threshold',
    'cmi.scaled_passing_score', 'cmi.max_time_allowed', 'cmi.time_limit_action', 'cmi.total_time',
    'cmi.learner_preference.language', 'cmi.learner_preference.audio_level',
    'cmi.learner_preference.delivery_speed', 'cmi.learner_preference.audio_captioning',
    'cmi.comments_from_lms._count', 'cmi.objectives._count', 'cmi.interactions._count',
  ];

  // Test builds: everything the package can see about its launch, to find out whether the
  // LMS passes anything beyond the standard learner fields.
  function diagnose() {
    const cmi = {};
    for (const key of LAUNCH_ELEMENTS) {
      const value = lms.GetValue(key);
      const err = lms.GetLastError();
      cmi[key] = err && err !== '0' ? `(error ${err}: ${lms.GetErrorString(err)})` : value;
    }
    const apiProps = {};
    if (api) {
      for (let o = api; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
        for (const name of Object.getOwnPropertyNames(o)) {
          if (name in apiProps) continue;
          let v;
          try { v = api[name]; } catch (e) { v = '(unreadable)'; }
          apiProps[name] = typeof v === 'function' ? 'function' : typeof v === 'object' && v ? `object(${Object.keys(v).slice(0, 15).join(',')})` : v;
        }
      }
    }
    const frames = [];
    for (let w = window, i = 0; i < 10; i++) {
      let href;
      try { href = w.location.href; } catch (e) { href = '(cross-origin)'; }
      frames.push(href);
      if (w.parent === w) break;
      w = w.parent;
    }
    return {
      cmi,
      apiObject: apiProps,
      page: {
        href: location.href,
        referrer: document.referrer,
        windowName: window.name,
        ancestorOrigins: location.ancestorOrigins ? [...location.ancestorOrigins] : 'not supported',
        frames,
        opener: Boolean(window.opener),
      },
    };
  }

  window.Scorm = {
    connected: Boolean(api),
    launcher: null,
    diagnose,
    log: [],
    // Runs fn now, or once a dispatch launcher has sent the launch values.
    whenReady(fn) { if (ready) fn(); else waiting.push(fn); },
    init() {
      if (started) return true;
      started = lms.Initialize('') === 'true';
      this.log.push(`Initialize -> ${started}`);
      return started;
    },
    get(key) {
      const v = lms.GetValue(key);
      this.log.push(`GetValue ${key} -> ${String(v).slice(0, 80)}`);
      return v;
    },
    set(key, value) {
      const ok = lms.SetValue(key, String(value)) === 'true';
      this.log.push(`SetValue ${key} = ${String(value).slice(0, 80)} -> ${ok ? 'ok' : 'error ' + lms.GetLastError()}`);
      return ok;
    },
    commit() { return lms.Commit('') === 'true'; },
    finish() {
      if (!started || finished) return;
      finished = true;
      this.set('cmi.session_time', isoDuration(Date.now() - startTime));
      this.set('cmi.exit', 'suspend');
      lms.Commit('');
      lms.Terminate('');
    },
  };

  window.addEventListener('pagehide', () => window.Scorm.finish());
  window.addEventListener('beforeunload', () => window.Scorm.finish());
})();
