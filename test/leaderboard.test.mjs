import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rank,validScore } from '../src/leaderboard.mjs';

const sample=(name,score,time='2026-11-20T10:00:00Z')=>({name,score,nights_won:2,seed:42,achieved_at:time});
test('leaderboard stores the best ten, with earlier achievement resolving ties',()=>{
  const entries=Array.from({length:12},(_,i)=>sample('May_'+i,i));
  entries.push(sample('Older',11,'2026-11-20T09:55:00Z'));
  entries.push(sample('Bad name',9999));
  const results=rank(entries);
  assert.equal(results.length,10);
  assert.deepEqual(results.slice(0,2).map(x=>x.name),['Older','May_11']);
  assert.equal(validScore(sample('Valid_42',1)),true);
  assert.equal(validScore(sample('abc',1,'2026-11-20T10:00:00')),false);
});
