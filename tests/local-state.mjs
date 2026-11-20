import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { emptyLocalState, readLocalState, readLocalEpoch, changeLocalState, replaceLocalState, validateLocalBackup, validateLocalState } from '../src/lib/local-store.ts';

assert.deepEqual(await readLocalState(), emptyLocalState());
console.log('  PASS a fresh browser database starts with empty private state');
await Promise.all(Array.from({ length: 40 }, (_, index) => changeLocalState((state) => {
  const id = ++state.counters.note;
  state.notes.push({ id, scriptureSlug: 'heart-sutra', scriptureTitle: '心经', passageSlug: 'part-one', passageTitle: '第一段', excerpt: '原文快照', note: `并发记录${index}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
})));
const concurrent = await readLocalState();
assert.equal(concurrent.notes.length, 40);
assert.equal(new Set(concurrent.notes.map((note) => note.id)).size, 40);
assert.equal(concurrent.counters.note, 40);
console.log('  PASS concurrent read-modify-write operations preserve every note with distinct IDs');
const beforeFailure = await readLocalState();
await assert.rejects(changeLocalState((state) => { state.notes = []; throw new Error('deliberate abort'); }), /deliberate abort/);
assert.deepEqual(await readLocalState(), beforeFailure);
await assert.rejects(changeLocalState((state) => { state.counters.note = -1; }), /计数/);
assert.deepEqual(await readLocalState(), beforeFailure);
console.log('  PASS failed or invalid mutations abort without overwriting existing private data');
const controller = new AbortController(); controller.abort();
await assert.rejects(changeLocalState((state) => { state.notes = []; }, controller.signal), { name: 'AbortError' });
assert.deepEqual(await readLocalState(), beforeFailure);
console.log('  PASS canceled writes preserve existing state');
const backup = { format: 'fanjin-local-backup', version: 1, exportedAt: new Date().toISOString(), data: beforeFailure };
const parsed = validateLocalBackup(JSON.parse(JSON.stringify(backup)));
await replaceLocalState(emptyLocalState());
assert.equal((await readLocalState()).notes.length, 0);
await replaceLocalState(parsed);
assert.deepEqual(await readLocalState(), beforeFailure);
console.log('  PASS exported JSON restores all original note snapshots and counters');
for (const invalid of [
  { ...backup, version: 2 },
  { ...backup, format: 'other-app' },
  { ...backup, data: { ...beforeFailure, notes: [beforeFailure.notes[0], beforeFailure.notes[0]] } },
  { ...backup, data: { ...beforeFailure, preferences: { interests: ['unknown'], minutes: 15, intention: 'quiet' } } },
  { ...backup, data: { ...beforeFailure, logs: [{ id: 1, planId: 999, scriptureSlug: 'heart-sutra', scriptureTitle: '心经', passageSlug: 'part-one', passageTitle: '第一段', date: '2026-11-20', minutes: 15, note: '', createdAt: new Date().toISOString() }] } },
]) {
  assert.throws(() => validateLocalBackup(invalid));
  assert.deepEqual(await readLocalState(), beforeFailure);
}
console.log('  PASS malformed backups, duplicate IDs and orphan daily logs cannot replace user data');
const corrected = validateLocalState({ ...beforeFailure, counters: { ...beforeFailure.counters, note: 0 } });
assert.equal(corrected.counters.note, 40);
console.log('  PASS imported counters cannot cause later note ID reuse');
const staleEpoch = await readLocalEpoch();
await replaceLocalState(beforeFailure);
assert.ok((await readLocalEpoch()) > staleEpoch);
await assert.rejects(changeLocalState((state) => { state.profile.name = 'stale delayed write'; }, undefined, staleEpoch), { name: 'AbortError' });
assert.deepEqual(await readLocalState(), beforeFailure);
console.log('  PASS importing or clearing data invalidates delayed writes from an earlier database epoch');
console.log('\nLocal state: 8 passed.');
