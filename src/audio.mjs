const pitches={
  mote_picked:[740,988],lantern_lit:[440,554,659,880],pulse:[210,105],player_hit:[171,112],jump:[280,430],
  dash:[350,160],refuel:[510,680],lantern_out:[352,245],won:[523,659,784,1046],lost:[392,311,220],shade_spawned:[116,147],
  countdown:[660],wind:[215,184,135],charm_picked:[610,800,1050],drifter_steal:[400,270],
};
const chords=[
  [45,52,59,64], [41,48,55,60], [48,55,62,67], [43,50,57,62],
];
const melody=[64,null,67,71,69,null,67,64,60,null,64,67,65,64,null,60,
              67,null,69,74,72,null,69,67,62,null,67,69,67,64,null,62];
const hertz=midi=>440*2**((midi-69)/12);
const eighth=.44;

export function createAudio(getVolume,getMusicVolume) {
  let audio,master,music;
  let active=false,timer,nextNote=0,noteIndex=0;
  const voices=new Set();

  function syncVolume(){
    if(!audio)return;
    const now=audio.currentTime;
    master.gain.setTargetAtTime(getVolume(),now,.04);
    music.gain.setTargetAtTime(active?getMusicVolume():0,now,.06);
  }

  function voice(freq,t,duration,level,attack,type,bus,tracked=false){
    const osc=audio.createOscillator(), gain=audio.createGain();
    osc.type=type;osc.frequency.value=freq;
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(level,t+attack);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain).connect(bus);
    if(tracked)voices.add(osc);
    osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};
    osc.start(t);osc.stop(t+duration+.02);
  }

  function queueMusic(){
    if(!active||!audio||audio.state!=='running')return;
    const now=audio.currentTime;
    if(nextNote<now)nextNote=now+.025;
    while(nextNote<now+.27){
      const index=noteIndex++%32;
      const chord=chords[Math.floor(index/8)];
      if(index%8===0){
        chord.forEach((note,i)=>{
          voice(hertz(note),nextNote,3.75,.095-i*.011,.52,'sine',music,true);
        });
        voice(hertz(chord[0]-12),nextNote,2.55,.083,.28,'sine',music,true);
      }
      if(index%2===0){
        const note=chord[[1,2,3,2][Math.floor(index/2)%4]];
        voice(hertz(note),nextNote,1.2,.14,.022,'sine',music,true);
      }
      const note=melody[index];
      if(note!==null){
        voice(hertz(note),nextNote+.035,1.12,.125,.022,'triangle',music,true);
        voice(hertz(note+12),nextNote+.04,.55,.032,.02,'sine',music,true);
      }
      nextNote+=eighth;
    }
  }

  function start(){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    if(!audio){
      audio=new Audio();
      master=audio.createGain();
      music=audio.createGain();
      master.gain.value=getVolume();
      music.gain.value=active?getMusicVolume():0;
      music.connect(master);
      master.connect(audio.destination);
    }
    syncVolume();
    if(audio.state==='running')queueMusic();
    else audio.resume().then(queueMusic).catch(()=>{});
  }

  function setMusic(playing){
    if(active===playing)return;
    active=playing;
    syncVolume();
    if(playing){
      nextNote=audio?.currentTime??0;
      timer=window.setInterval(queueMusic,85);
      queueMusic();
    }else{
      window.clearInterval(timer);
      if(audio)for(const osc of voices)osc.stop(audio.currentTime+.15);
    }
  }

  return {start,setMusic,syncVolume,play(name){
    if(!audio||audio.state!=='running')return;
    const now=audio.currentTime;
    pitches[name]?.forEach((note,i)=>
      voice(note,now+i*.077,.24,.16,.033,name==='player_hit'?'triangle':'sine',master));
  }};
}
