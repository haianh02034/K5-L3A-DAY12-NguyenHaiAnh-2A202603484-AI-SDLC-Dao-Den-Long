export function validScore(entry){
  return entry&&/^[A-Za-z0-9_]{3,12}$/.test(entry.name)&&Number.isSafeInteger(entry.score)&&entry.score>=0&&
    Number.isInteger(entry.nights_won)&&entry.nights_won>=0&&entry.nights_won<=3&&Number.isSafeInteger(entry.seed)&&
    typeof entry.achieved_at==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(entry.achieved_at)&&Number.isFinite(Date.parse(entry.achieved_at));
}

export function rank(entries){
  return entries.filter(validScore).sort((a,b)=>b.score-a.score||Date.parse(a.achieved_at)-Date.parse(b.achieved_at)).slice(0,10);
}
