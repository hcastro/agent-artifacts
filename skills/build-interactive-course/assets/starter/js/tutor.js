/* Course tutor: asks Claude to grade free-text answers and to keep a Socratic exchange going,
   and wires dictation and read-aloud. Each piece does nothing when its capability is absent. */
(function () {
  'use strict';
  const C = (window.Course = window.Course || {});

  function topic() {
    const c = (C.app && C.app.course) || {};
    return c.topic || c.title || 'the subject of this course';
  }

  const Tutor = {
    sample: null, dict: null, tts: null, denied: false, ready: false,
    async init() {
      if (!window.claude || !window.claude.use) { this.ready = true; return; }
      const names = ['sample', 'dictation', 'tts'];
      const got = await Promise.all(names.map(n => window.claude.use(n).catch(() => null)));
      this.sample = got[0]; this.dict = got[1]; this.tts = got[2];
      this.ready = true;
    },
    canGrade() { return !!this.sample && !this.denied; },

    _ctx(q) {
      if (!q.context) return '';
      const body = typeof q.context.body === 'string' ? q.context.body : (q.context.body || []).map(m => m.role + ': ' + m.text).join('\n');
      return '\nSHOWN TO THE LEARNER (' + (q.context.label || q.context.kind) + '):\n' + body.slice(0, 1800) + '\n';
    },

    async grade(q, answer, attempt) {
      if (!this.canGrade()) return { error: 'unavailable' };
      const r = q.rubric || { must: [], pass: 0 };
      const must = (r.must || []).map((m, i) => (i + 1) + '. ' + m).join('\n');
      const mis = (r.misconceptions || []).map(m => '- If they claim: ' + m.claim + ' -> probe to adapt: ' + m.probe).join('\n');
      const teach = q.type === 'teach';
      const prompt = [
        'You are the grader inside a Socratic course on ' + topic() + '. Grade ONE answer strictly against the rubric.',
        'You never teach by telling. Do not reveal, quote or paraphrase the reference answer or any rubric point the learner did not state.',
        '',
        'QUESTION:\n' + q.prompt,
        this._ctx(q),
        'REFERENCE ANSWER (hidden from the learner):\n' + (q.answer || ''),
        '',
        'RUBRIC POINTS (hidden). A point counts only if the learner clearly expressed it in their own words. A vague gesture does not count:\n' + must,
        'POINTS NEEDED TO PASS: ' + (r.pass || (r.must || []).length),
        mis ? '\nKNOWN MISCONCEPTIONS:\n' + mis : '',
        '',
        'ATTEMPT: ' + attempt + ' of 3',
        'LEARNER ANSWER:\n"""\n' + String(answer).slice(0, 4000) + '\n"""',
        '',
        'Rules:',
        '- "points" has one boolean per rubric point, in order. Do not credit insight the learner did not state.',
        '- "verdict" is "correct" when enough points are true and nothing they wrote contradicts the reference, "partial" when some points are true, otherwise "wrong".',
        '- If the verdict is not "correct", write "probe": ONE narrower question, 35 words at most, that exposes the gap or contradiction in what they wrote by pointing at one concrete thing to look at or reason through. It must not contain or imply the answer.',
        '- "note": one plain sentence, 25 words at most, naming what they got right, or "" if nothing. No praise words.',
        teach ? '- This is a teach-back. Set "trust" to true only if you would let this explanation go to someone new to the subject unchanged: correct, complete on the rubric, and clear.' : '',
        '',
        'Reply with only JSON, for example: {"verdict":"partial","points":[true,false],"probe":"...","note":"...","trust":false}',
      ].filter(x => x !== '').join('\n');
      try {
        const v = await this.sample.json(prompt, { modelTier: 'default', cache: false });
        if (!v || typeof v !== 'object') return { error: 'invalid_json' };
        const points = Array.isArray(v.points) ? v.points.map(Boolean) : [];
        const need = r.pass || (r.must || []).length;
        const got = points.filter(Boolean).length;
        // the verdict alone is not trusted: the counted points have to clear the bar too
        const ok = v.verdict === 'correct' && got >= Math.min(need, (r.must || []).length);
        return { ok: ok, verdict: ok ? 'correct' : (got > 0 ? 'partial' : 'wrong'), points: points, got: got, need: need, probe: String(v.probe || '').slice(0, 400), note: String(v.note || '').slice(0, 240), trust: !!v.trust };
      } catch (e) {
        const code = (e && e.code) || 'error';
        if (code === 'not_granted' || code === 'sampling_disabled' || code === 'capability_disabled' || code === 'not_declared') this.denied = true;
        return { error: code };
      }
    },

    // The learner replies to a narrower question in their own words, and Claude answers with the next nudge.
    async talk(q, probe, thread) {
      if (!this.canGrade()) return { error: 'unavailable' };
      const lines = thread.map(m => (m.who === 'me' ? 'LEARNER: ' : 'TUTOR: ') + m.text).join('\n');
      const prompt = [
        'You are a Socratic tutor in a course on ' + topic() + '. The learner answered the question below wrongly, and you asked a narrower question. Continue the exchange.',
        'Reply in at most 2 short sentences and end with exactly ONE question that moves them one step closer. Never state the answer, the reference, or a rubric point. Point at something concrete to look at or reason through.',
        'If their latest reply shows they have reasoned to the right idea, reply exactly: "That is the piece. Now answer the original question again." No praise.',
        '',
        'ORIGINAL QUESTION:\n' + q.prompt,
        this._ctx(q),
        'REFERENCE ANSWER (hidden):\n' + (q.answer || ''),
        '',
        'EXCHANGE SO FAR:\nTUTOR: ' + probe + '\n' + lines,
      ].join('\n');
      try {
        const r = await this.sample(prompt, { modelTier: 'default', cache: false });
        return { text: String(r.text || '').trim().slice(0, 500) };
      } catch (e) {
        const code = (e && e.code) || 'error';
        if (code === 'not_granted' || code === 'sampling_disabled') this.denied = true;
        return { error: code };
      }
    },

    // Dictation has to start from the click itself, so call this straight from the handler.
    dictate(area, btn) {
      const d = this.dict;
      if (!d) return;
      if (d.active()) { d.stop().catch(() => {}); return; }
      const base = area.value ? area.value.replace(/\s*$/, ' ') : '';
      let settled = base;
      const offs = [];
      offs.push(d.onPartial(e => { area.value = settled + e.text; }));
      offs.push(d.onFinal(e => { settled = settled + e.text; area.value = settled; area.dispatchEvent(new Event('input')); }));
      offs.push(d.onState(e => {
        btn.setAttribute('aria-pressed', e.state === 'idle' ? 'false' : 'true');
        if (e.state === 'idle') { offs.forEach(f => f()); area.value = settled; area.dispatchEvent(new Event('input')); }
      }));
      d.start({ language: 'en' }).catch(err => {
        btn.setAttribute('aria-pressed', 'false');
        offs.forEach(f => f());
        if (err && err.code === 'not_granted') { btn.hidden = true; }
      });
    },

    speak(text) {
      if (!this.tts || !C.app || !C.app.engine.s.voice) return;
      const clean = String(text).replace(/`/g, '').replace(/\*\*/g, '').slice(0, 1900);
      this.tts.speak(clean, { rate: 1.05 }).catch(() => {});
    },
    hush() { if (this.tts && this.tts.active()) this.tts.stop().catch(() => {}); },
  };

  C.Tutor = Tutor;
})();
