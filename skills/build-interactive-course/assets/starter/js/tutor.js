/* Course tutor helpers: the prompt a learner hands to their own coding agent to check a written answer,
   and read-aloud through the browser's speech synthesis. The page never calls a model itself. */
(function () {
  'use strict';
  const C = (window.Course = window.Course || {});

  function topic() {
    const c = (C.app && C.app.course) || {};
    return c.topic || c.title || 'the subject of this course';
  }

  // Only what the learner could see while answering. A reveal block's hidden part stays out.
  function contextText(q) {
    const c = q.context || (q.block && { kind: q.block.kind, label: q.block.label, body: q.block.shown || q.block.body });
    if (!c || !c.body) return '';
    const body = typeof c.body === 'string' ? c.body : (c.body || []).map(m => m.role + ': ' + m.text).join('\n');
    return '\nShown to me beside the question (' + (c.label || c.kind || 'context') + '):\n' + body.slice(0, 1800);
  }

  const Tutor = {
    // Any agent that can read text can grade from this. It holds the rubric and not the reference
    // answer, so a learner who reads the prompt sees what a check needs but no finished answer.
    agentPrompt(q, answer, attempt) {
      const r = q.rubric || { must: [], pass: 0 };
      const must = (r.must || []).map((m, i) => (i + 1) + '. ' + m).join('\n');
      const need = r.pass || (r.must || []).length;
      const mis = (r.misconceptions || []).map(m => '- If the answer says: ' + m.claim + ' Ask something like: ' + m.probe).join('\n');
      return [
        'I am taking a Socratic course on ' + topic() + '. Check my written answer strictly against the key points below, then reply in the format at the end.',
        '',
        'Rules for you:',
        '- A key point counts only if my answer states it clearly in my own words. A vague gesture does not count.',
        '- Do not reveal, quote or paraphrase a key point my answer did not make.',
        '- Do not give me the answer, and do not praise.',
        q.type === 'teach' ? '- This is a teach-back. Say "Got it" only if you would let this explanation go to someone new to the subject unchanged.' : '',
        '',
        'Question:',
        q.prompt || '',
        contextText(q),
        '',
        'Key points (' + need + ' of ' + (r.must || []).length + ' needed to pass):',
        must,
        mis ? '\nKnown mistakes to watch for:\n' + mis : '',
        '',
        'My answer (attempt ' + attempt + ' of 3):',
        '"""',
        String(answer).slice(0, 4000),
        '"""',
        '',
        'Reply format:',
        'First line: exactly "Got it" or "Not yet".',
        'If "Got it": one sentence on what the answer got right.',
        'If "Not yet": one sentence naming what is missing or wrong, without giving the answer away. Then one narrower question that points me at one concrete thing to look at or reason through. Stop after the question.',
      ].filter(x => x !== '').join('\n');
    },

    canSpeak() { return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function'; },
    // Read-aloud is off until the learner turns it on in Progress.
    speak(text) {
      if (!this.canSpeak() || !C.app || !C.app.engine || !C.app.engine.s.voice) return;
      const clean = String(text).replace(/`/g, '').replace(/\*\*/g, '').slice(0, 1900);
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(clean);
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
      } catch (e) { /* speech is a convenience, so a failure stays silent */ }
    },
    hush() { if (this.canSpeak()) { try { window.speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ } } },
  };

  C.Tutor = Tutor;
})();
