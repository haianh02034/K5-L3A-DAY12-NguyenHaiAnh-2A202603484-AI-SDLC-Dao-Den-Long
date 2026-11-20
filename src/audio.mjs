const pitches={
  mote_picked:[740,988],lantern_lit:[440,554,659,880],pulse:[210,105],player_hit:[171,112],jump:[280,430],
  dash:[350,160],won:[523,659,784,1046],lost:[392,311,220],shade_spawned:[116,147],
  countdown:[660],wind:[215,184,135],charm_picked:[610,800,1050],drifter_steal:[400,270],
};
const melody=[196,247,293,247,174,220,261,220,146,196,233,196,174,220,261,293];

export function createAudio(getVolume){
  let audio,gain,lastBeat=-1;
  const start=()=>{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    if(!audio){audio=new Audio();gain=audio.createGain();gain.connect(audio.destination);}
    gain.gain.value=getVolume();
    if(audio.state==='suspended')audio.resume().catch(()=>{});
  };
  function tone(freq,delay,duration,volume,type='sine'){
    if(!audio)return;
    gain.gain.value=getVolume();
    const t=audio.currentTime+delay;
    const osc=audio.createOscillator(),amp=audio.createGain();
    osc.type=type;osc.frequency.value=freq;
    amp.gain.setValueAtTime(.0001,t);
    amp.gain.exponentialRampToValueAtTime(volume,t+.033);
    amp.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(amp).connect(gain);osc.start(t);osc.stop(t+duration+.02);
  }
  return {start, play(name){
    pitches[name]?.forEach((note,i)=>tone(note,i*.077,.24,.16,name==='player_hit'?'triangle':'sine'));
  }, update(tick){
    const beat=Math.floor(tick/47);
    if(beat===lastBeat)return;
    lastBeat=beat;
    tone(melody[beat%melody.length],0,1.27,.036);
    if(beat%4===0)tone(melody[beat%melody.length]/2,0,1.75,.026);
  }};
}
