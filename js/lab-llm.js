/* ==========================================================================
   GAIA AI Lab — language model connection.

   The Lab always has a rule-based answer (lab.js). This file adds a real
   language model on top of it, from the first source that works:

     1. the GAIA server (backend/, POST /assistant): Claude with a paid key, or
        a free OpenAI-compatible service (Groq, Hugging Face, OpenRouter), or
        Ollama running on the same computer (free, offline);
     2. a free model that runs inside the browser (WebLLM, WebGPU): no key, no
        server; downloaded once (about 1 GB), then cached by the browser.

   The model receives only the evidence the Lab retrieved (parcel profile,
   verdicts, records, rule-based answer) plus the last turns of the
   conversation. Numbers it writes that are not in that evidence are marked.
   ========================================================================== */
(function (global) {
  'use strict';
  var G = global.GAIA;
  var WEBLLM_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/+esm';
  var BROWSER_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';   // multilingual (French, Arabic, English, Japanese), ~1.1 GB of GPU memory
  var CONSENT_KEY = 'gaia.lab.browserModel';

  var st = { mode: 'none', checking: true, server: null, providers: [], loading: null, error: null, engine: null };
  var listeners = [];
  function emit() { listeners.forEach(function (f) { try { f(st); } catch (e) { /* ignore */ } }); }
  function lsGet(k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { global.localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  var SYSTEM = 'You are GAIA, the AI Lab assistant for small farms in Tunisia (water, solar energy, agriculture, Tunisian and Japanese practices). ' +
    'You talk with a farmer about their plot. Use the EVIDENCE first and name the records you use. ' +
    'If the evidence does not cover the question, you may use general agronomy knowledge, but begin that part with "General knowledge (not from GAIA records):" translated into the answer language, and say what data would make it specific. ' +
    'Never invent a number about this plot, a price, a law or a source: any figure about the plot must come from the evidence. ' +
    'Say when a value has low confidence or a record is a draft. Use the conversation to understand follow-up questions. ' +
    'Answer ONLY in the language named in LANG, in plain words, at most 150 words, short paragraphs or "- " lists, no headings.';
  var LANG_NAME = { fr: 'French', ar: 'Arabic', en: 'English', ja: 'Japanese' };

  /* ---------------------------------------------------------- server discovery */
  function candidates() {
    var ep = G.CONFIG.assistantEndpoint;
    if (ep) return [ep];
    return (G.serverBases || []).map(function (b) { return b + '/assistant'; });
  }
  function checkServer() {
    var c = candidates();
    st.checking = true; emit();
    return new Promise(function (resolve) {
      (function next(i) {
        if (i >= c.length) { st.server = null; st.providers = []; resolve(null); return; }
        var ctl = global.AbortController ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 3000) : null;
        fetch(c[i].replace(/\/assistant$/, '/health'), ctl ? { signal: ctl.signal } : {})
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
          .then(function (h) {
            clearTimeout(timer);
            var prov = (h && h.assistant_providers) || (h && h.assistant_llm ? ['claude'] : []);
            if (!prov.length) { next(i + 1); return; }
            st.server = c[i]; st.providers = prov; resolve(c[i]);
          })
          .catch(function () { clearTimeout(timer); next(i + 1); });
      }(0));
    }).then(function (srv) {
      st.checking = false;
      if (srv) st.mode = 'server';
      else if (st.engine) st.mode = 'browser';
      else st.mode = 'none';
      emit();
      return srv;
    });
  }

  /* ---------------------------------------------------------- in-browser model */
  function webgpu() { return !!(global.navigator && global.navigator.gpu); }
  function loadBrowser() {
    if (st.engine || st.loading) return Promise.resolve(st.engine);
    if (!webgpu()) { st.error = 'no_webgpu'; emit(); return Promise.resolve(null); }
    st.loading = { p: 0, text: '' }; st.error = null; emit();
    return import(WEBLLM_URL).then(function (webllm) {
      return webllm.CreateMLCEngine(BROWSER_MODEL, {
        initProgressCallback: function (r) { st.loading = { p: r.progress || 0, text: r.text || '' }; emit(); }
      });
    }).then(function (engine) {
      st.engine = engine; st.loading = null; lsSet(CONSENT_KEY, '1');
      if (st.mode !== 'server') st.mode = 'browser';
      emit(); return engine;
    }).catch(function (e) {
      st.loading = null; st.error = 'load_failed'; st.errorText = String(e && e.message || e); emit(); return null;
    });
  }

  /* ---------------------------------------------------------- evidence for a small model */
  function cut(s, n) { s = typeof s === 'string' ? s : JSON.stringify(s); return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }
  function compactEvidence(p) {
    var recs = (p.records || []).slice(0, 4).map(function (r) {
      return { name: r.name, origin: r.origin, summary: cut(r.summary, 300), conditions: cut(r.conditions, 300), cost: cut(r.cost, 160),
        risks: cut(r.risks, 220), adaptations: cut(r.adaptations, 220), status: r.review && r.review.status };
    });
    return { lang: p.lang, plot: p.profile, verdicts: (p.verdicts || []).map(function (v) { return v.id + ': ' + v.verdict; }).join('; '),
      gaia_answer: { title: p.answer.title, recommendation: p.answer.reco, explanation: (p.answer.expl || []).slice(0, 6), missing: (p.answer.missing || []).slice(0, 5) },
      records: recs };
  }
  function browserAsk(p, onToken) {
    var msgs = [{ role: 'system', content: SYSTEM }];
    (p.history || []).slice(-3).forEach(function (h) { msgs.push({ role: 'user', content: h.q }); msgs.push({ role: 'assistant', content: cut(h.a, 600) }); });
    msgs.push({ role: 'user', content: 'EVIDENCE:\n' + JSON.stringify(compactEvidence(p)) + '\n\nLANG: ' + (LANG_NAME[p.lang] || 'French') + '\n\nQUESTION: ' + p.question });
    var text = '';
    return st.engine.chat.completions.create({ messages: msgs, stream: true, temperature: 0.3, max_tokens: 450 }).then(function (chunks) {
      var it = chunks[Symbol.asyncIterator]();
      return (function pump() {
        return it.next().then(function (r) {
          if (r.done) return { text: text.trim(), provider: 'browser', model: BROWSER_MODEL };
          var d = r.value.choices && r.value.choices[0] && r.value.choices[0].delta && r.value.choices[0].delta.content;
          if (d) { text += d; if (onToken) onToken(text); }
          return pump();
        });
      }());
    });
  }

  function serverAsk(p) {
    return fetch(st.server, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error((j.detail && j.detail.message) || r.status); return j; }); });
  }

  /* Ask the model. Resolves to {text, provider, model} or rejects. */
  function ask(p, onToken) {
    if (st.mode === 'server' && st.server) {
      return serverAsk(p).then(function (res) { if (!res.text) throw new Error('empty'); return res; })
        .catch(function (e) { if (st.engine) return browserAsk(p, onToken); throw e; });
    }
    if (st.engine) return browserAsk(p, onToken);
    return Promise.reject(new Error('no_llm'));
  }

  /* ---------------------------------------------------------- display helpers */
  // Numbers in the model's text that are nowhere in the evidence or the question.
  function unverified(text, evidence) {
    var ev = evidence.replace(/,/g, '.');
    return (text.match(/\d+(?:[.,]\d+)?/g) || []).filter(function (n) {
      var m = n.replace(',', '.');
      return ev.indexOf(m) === -1 && !(m.length === 1);   // single digits ("2 options", "1.") are not data
    });
  }
  // Minimal, safe Markdown: paragraphs, "- " / "1. " lists, **bold**. Unverified numbers wrapped in <mark>.
  function render(text, bad) {
    var el = G.el, badSet = {};
    (bad || []).forEach(function (n) { badSet[n] = 1; });
    function inline(s) {
      var out = [];
      s.split(/(\*\*[^*]+\*\*)/).forEach(function (part) {
        var strong = /^\*\*[^*]+\*\*$/.test(part), body = strong ? part.slice(2, -2) : part, nodes = [];
        body.split(/(\d+(?:[.,]\d+)?)/).forEach(function (x) {
          if (!x) return;
          nodes.push(badSet[x] ? el('mark', { class: 'unv', title: 'not in GAIA data' }, [x]) : x);
        });
        out.push(strong ? el('strong', null, nodes) : el('span', null, nodes));
      });
      return out;
    }
    var box = el('div', { class: 'llm-text' }), list = null;
    text.split(/\n+/).forEach(function (line) {
      var m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (m) { if (!list) { list = el('ul'); box.appendChild(list); } list.appendChild(el('li', null, inline(m[1]))); return; }
      list = null;
      if (line.trim()) box.appendChild(el('p', null, inline(line.replace(/^#+\s*/, ''))));
    });
    return box;
  }

  function label() {
    if (st.mode === 'server') {
      var p = st.providers[0];
      return ({ claude: 'Claude', groq: 'Groq', huggingface: 'Hugging Face', openrouter: 'OpenRouter', ollama: 'Ollama', 'ollama-local': 'Ollama' })[p] || p;
    }
    if (st.mode === 'browser') return 'Qwen2.5 1.5B';
    return '';
  }

  var started = false;
  function start() {
    if (started) return; started = true;
    checkServer().then(function (srv) { if (!srv && lsGet(CONSENT_KEY) === '1' && webgpu()) loadBrowser(); });
  }

  global.GAIA_LLM = {
    state: function () { return st; }, on: function (f) { listeners.push(f); }, start: start, recheck: checkServer,
    loadBrowser: loadBrowser, webgpu: webgpu, ask: ask, unverified: unverified, render: render, label: label, BROWSER_MODEL: BROWSER_MODEL
  };
}(window));
