export const meta = {
  name: 'design-tournament',
  description: 'Blind multi-round design tournament: designers build divergent directions, a packer makes blind sheets, lens judges score a rubric, code tallies with tie-breaks and a noise threshold, and the field narrows round by round',
  phases: [{ title: 'Build' }, { title: 'Judge' }, { title: 'Report' }],
}
// Pass everything through args. Shape:
// {
//   root: '/abs/path/tournament',                 // all rounds write under root/r<n>/<id>/
//   brief: '...',                                 // artifact, owner's taste words verbatim, anti-references, surfaces
//   rules: '...',                                 // designer working rules: skills to use, gates to pass, render command, write-only-here
//   deliverables: 'symbol.svg, lockup.svg ...',   // what each designer leaves in its folder
//   directions: [{ id, name, world, idea }],      // round 1 field
//   rounds: [{ keep: 4, build: '...' }, { keep: 2, build: '...' }, { keep: 1, build: '...' }],
//   stopAfter: 1,                                 // owner checkpoint: return after this round (resume with stopAfter raised)
//   ownerNotes: { <id>: '...' },                  // owner's keep/cut reasons, fed to the next round's designers
//   cut: [ids],                                   // directions the owner cut at the checkpoint
//   sheetCommand: '...',                          // how the packer renders one blind sheet: use {inputs} and {out}
//   rubric: [{ key, name, points, earns, loses }],
//   tieBreaks: ['function', 'distinct'],          // criterion keys, in order
//   noise: 6,                                     // points of 100 under which totals count as a tie
//   lenses: [{ id, brief }],
// }
const A = args
const totalPoints = A.rubric.reduce((s, c) => s + c.points, 0)
const ENTRY = { type: 'object', properties: { idea: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, gatesPass: { type: 'boolean' }, notes: { type: 'string' } }, required: ['idea', 'files', 'gatesPass', 'notes'] }
const SCORES = { type: 'object', properties: { scores: { type: 'array', items: { type: 'object', properties: Object.assign({ entry: { type: 'number' }, strength: { type: 'string' }, weakness: { type: 'string' }, change: { type: 'string' } }, ...A.rubric.map(c => ({ [c.key]: { type: 'number' } }))), required: ['entry', 'strength', 'weakness', 'change', ...A.rubric.map(c => c.key)] } } }, required: ['scores'] }
const rubricText = A.rubric.map(c => `- ${c.key} (${c.name}, 0 to ${c.points}): earns: ${c.earns}; loses: ${c.loses}`).join('\n')

function order(n, round) {
  // Deterministic per-round shuffle so a carried entry doesn't keep one position.
  const idx = Array.from({ length: n }, (_, i) => i)
  const rot = (round * 2 + 1) % n
  const out = idx.slice(rot).concat(idx.slice(0, rot))
  return round % 2 ? out.reverse() : out
}

async function build(round, field, notes) {
  phase('Build')
  const spec = A.rounds[round - 1]
  return parallel(field.map(d => () => agent(`${A.brief}\n\nYou are the designer for the direction "${d.name}" (${d.world}).\nIdea: ${d.idea}\n\nRound ${round}: ${spec.build}\n${notes[d.id] ? `\nJudges' notes from the last round (they saw a neutral label, not your name):\n${notes[d.id]}\n` : ''}${A.ownerNotes?.[d.id] ? `\nThe owner's note: ${A.ownerNotes[d.id]}\n` : ''}\nStay distinct: if your direction is converging on another direction's typeface or palette, say so and push apart.\nYour folder: ${A.root}/r${round}/${d.id}/ (build on ${A.root}/r${round - 1}/${d.id}/ if it exists). Deliver: ${A.deliverables}.\n\n${A.rules}\n\nReturn the idea as it now stands, the absolute paths of your deliverables, whether every gate passes, and short notes.`,
    { label: `r${round} ${d.id}`, phase: 'Build', schema: ENTRY })))
}

async function judge(round, field, entries) {
  phase('Judge')
  const blind = order(field.length, round).map((i, k) => ({ k: k + 1, d: field[i], e: entries[i] })).filter(x => x.e && x.e.gatesPass)
  const out = `${A.root}/r${round}/blind`
  await agent(`Make blind sheets for round ${round}. mkdir -p ${out}. For each entry run: ${A.sheetCommand} with {inputs} = its files and {out} = ${out}/entry-<k>.png. No direction names in any file name or image. Read each sheet once to confirm it rendered.\n\n${blind.map(x => `Entry ${x.k}: ${x.e.files.join(' ')}`).join('\n')}`, { label: `r${round} blind sheets`, phase: 'Judge', effort: 'low' })
  const votes = await parallel(A.lenses.map(l => () => agent(`${A.brief}\n\n${l.brief}\n\nRound ${round} of a blind design tournament. Read every sheet below with the Read tool, side by side, before scoring. Calibration: half marks are mediocre, 80% very good, 95% and up exceptional and rare; use the whole range.\n\nRubric:\n${rubricText}\n\n${blind.map(x => `Entry ${x.k}: ${out}/entry-${x.k}.png. Idea: ${x.e.idea}`).join('\n')}`, { label: `r${round} judge ${l.id}`, phase: 'Judge', schema: SCORES })))
  const tally = {}
  for (const x of blind) tally[x.d.id] = { d: x.d, total: 0, by: {}, n: 0, notes: [] }
  for (const [li, v] of votes.entries()) for (const s of (v?.scores || [])) {
    const x = blind.find(b => b.k === s.entry); if (!x) continue
    const t = tally[x.d.id]; t.n++
    for (const c of A.rubric) { const val = Math.max(0, Math.min(c.points, Number(s[c.key]) || 0)); t.by[c.key] = (t.by[c.key] || 0) + val }
    t.notes.push(`[${A.lenses[li].id}] strength: ${s.strength} weakness: ${s.weakness} change: ${s.change}`)
  }
  for (const t of Object.values(tally)) { for (const k in t.by) t.by[k] /= Math.max(1, t.n); t.total = Object.values(t.by).reduce((a, b) => a + b, 0) * 100 / totalPoints }
  const rows = Object.values(tally).sort((a, b) => (b.total - a.total) || A.tieBreaks.reduce((r, k) => r || ((b.by[k] || 0) - (a.by[k] || 0)), 0))
  const keep = A.rounds[round - 1].keep
  const cutoff = rows[Math.min(keep, rows.length) - 1]?.total ?? 0
  const tiedAtCut = rows.filter((r, i) => i >= keep && cutoff - r.total < A.noise).map(r => r.d.name)
  log(`Round ${round}:\n${rows.map((r, i) => `${i + 1}. ${r.d.name}: ${r.total.toFixed(1)}/100${i < keep ? '' : ' (out)'}`).join('\n')}${tiedAtCut.length ? `\nWithin the noise of the cut: ${tiedAtCut.join(', ')}` : ''}`)
  return { rows: rows.map(r => ({ id: r.d.id, name: r.d.name, total: Math.round(r.total * 10) / 10, by: r.by, notes: r.notes })), survivors: rows.slice(0, keep).map(r => r.d), tiedAtCut, blindMap: blind.map(x => ({ entry: x.k, id: x.d.id })) }
}

const history = []
let field = A.directions.filter(d => !(A.cut || []).includes(d.id)), notes = {}
for (let round = 1; round <= A.rounds.length; round++) {
  const entries = await build(round, field, notes)
  const result = await judge(round, field, entries)
  history.push({ round, ...result, entries: field.map((d, i) => ({ id: d.id, ...(entries[i] || {}) })) })
  notes = Object.fromEntries(result.rows.map(r => [r.id, r.notes.join('\n')]))
  field = result.survivors
  if (A.stopAfter && round >= A.stopAfter && round < A.rounds.length) { log(`Stopping after round ${round} for the owner checkpoint.`); break }
}
phase('Report')
return { history, survivors: field.map(d => d.id) }
