import story from './story.json';
import { transition } from './logic.js';
import { Receiver } from './receiver.js';
import './style.css';
const $=id=>document.getElementById(id);
let active=false, listening=false, lab=false, node='intro', token=0, timer=null, audio=null, wake=null, gate=0;
const status=text=>{$('state').textContent=text;$('workbenchState').textContent=text;};
const receiver=new Receiver(onWord,status,fail,()=>Number($('threshold').value));
const privacy={local:'Local inference on this device. Initial model download needs internet. No audio upload by this app.',browser:'Browser speech may send audio to its vendor for processing. This app does not store audio or send it to our servers.',device:'Experimental browser on-device speech. Requires an already-installed English pack. Never silently falls back to a server.',manual:'Button-driven Lab only. No microphone. Not hands-free.'};
function log(text){const li=document.createElement('li');li.textContent=`${new Date().toLocaleTimeString()} · ${text}`;$('log').prepend(li);while($('log').children.length>30)$('log').lastChild.remove();}
function controls(){for(const id of ['engine','voice','prepare','test','start','lab','parked'])$(id).disabled=active;$('stop').disabled=!active;$('fallback').hidden=!active||!lab;document.body.dataset.active=active;}
async function stop(message='Stopped. Start again while parked.'){
  active=false;listening=false;++token;clearTimeout(timer);timer=null;
  if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null;}
  status(message);$('hint').textContent='No microphone session is active.';controls();
  await receiver.stop(); if(wake){await wake.release().catch(()=>{});wake=null;}
}
function fail(message){log(message);void stop(message);}
async function prepare(){try{$('prepare').disabled=true;await receiver.prepare($('engine').value);$('capability').textContent='Prepared. Initial permission/start is still required; actual device reliability unverified.';}catch(error){$('capability').textContent=error.message;status('Receiver not ready');}finally{$('prepare').disabled=false;}}
function capability(){const API=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;$('privacy').textContent=privacy[$('engine').value];$('capability').textContent=`Secure context: ${isSecureContext?'yes':'no'}. Microphone API: ${navigator.mediaDevices?.getUserMedia?'present':'absent'}. Browser speech: ${API?'present (not a reliability guarantee)':'absent'}.`;}
async function play(clip,current){
  if(!active||current!==token)return false;
  listening=false;receiver.closeWindow();clearTimeout(timer);status('Cypher transmitting');$('caption').textContent=story[clip];$('hint').textContent='Microphone answers are ignored during the recording.';
  const player=audio ||=new Audio();player.src=`./audio/${$('voice').value}/${clip}.mp3`;player.preload='auto';
  return new Promise((resolve,reject)=>{
    player.onended=()=>resolve(active&&current===token);
    player.onerror=()=>reject(Error('Cypher audio could not load. No story step was skipped.'));
    player.play().catch(()=>reject(Error('Audio playback was blocked. Start or resume while parked.')));
  });
}
function arm(current){
  if(!active||current!==token)return;
  gate=performance.now()+500;listening=true;status(lab?'Lab choice ready':'Listening for yes or no');$('hint').textContent=lab?'Use the Lab buttons. The microphone is off.':'Say yes or no after the question. No answer is selected for silence.';
  if(!lab){receiver.listenWindow();timer=setTimeout(()=>fail('No answer received in 12 seconds. Paused without choosing a branch.'),12000);}
}
async function prompt(current){if(await play(node,current)){if(node==='end')await stop('Transmission complete');else arm(current);}}
async function answer(word){
  if(!active||!listening||performance.now()<gate)return;
  const next=transition(node,word);if(!next){log(`Ignored ${word}: this story accepts yes/no only.`);return;}
  listening=false;receiver.closeWindow();clearTimeout(timer);const current=token;log(`Story ${node}: ${word}`);
  try{if(next.response&&!await play(next.response,current))return;node=next.next;await prompt(current);}catch(error){fail(error.message);}
}
function onWord(word,data){
  if(!active||!listening||performance.now()<gate)return;
  $('result').textContent=`Top: ${data.top} · score ${Number(data.score).toFixed(2)} · ${word?'accepted '+word:'rejected'}`;
  if(word){if(lab){log(`Workbench: ${word}`);}else void answer(word);}
}
async function begin(mode){
  if(!$('parked').checked){status('Confirm you are parked in setup below before starting.');$('parked').scrollIntoView({block:'center'});$('parked').focus();return;}
  if(mode!=='lab' && receiver.prepared!==$('engine').value){status('Prepare the selected receiver in parked setup first.');$('prepare').scrollIntoView({block:'center'});$('prepare').focus();return;}
  lab=mode==='lab'; const workbench=mode==='test';
  if(!lab&&$('engine').value==='manual'){status('Buttons only is not a hands-free receiver. Choose the Lab.');return;}
  active=true;node='intro';++token;const current=token;controls();status('Starting...');
  try{
    if(workbench){
      // Microphone-only testing must not wait for audio playback or a wake lock.
      // Browser speech starts in the tap handler, before any asynchronous wait.
      lab=true;listening=true;gate=performance.now();
      status('Requesting microphone for workbench...');
      $('hint').textContent='Allow microphone access if asked. Say yes, no, left or right after listening starts.';
      $('result').textContent='Starting receiver...';
      timer=setTimeout(()=>fail('Microphone did not start within 15 seconds. Check browser permissions, then try Listen again.'),15000);
      const starting=receiver.start($('engine').value);
      if($('engine').value!=='local')receiver.listenWindow();
      await starting;
      if(!active||current!==token)return;
      clearTimeout(timer);status('Workbench listening');
      $('hint').textContent='Say yes, no, left or right.';
      $('result').textContent='Listening. No results yet.';
      timer=setTimeout(()=>void stop('Workbench finished'),12000);
      return;
    }
    // Play the real first question directly from the tap, not a silent unlock clip.
    // Start local microphone setup in parallel; neither depends on a wake-lock promise.
    const firstQuestion=play(node,current);
    timer=setTimeout(()=>fail('Audio or microphone did not start within 20 seconds. Check permissions and audio output, then start again while parked.'),20000);
    const starting=lab?Promise.resolve():receiver.start($('engine').value);
    if(navigator.wakeLock){
      navigator.wakeLock.request('screen').then(lock=>{
        if(active&&current===token)wake=lock;else void lock.release().catch(()=>{});
      }).catch(()=>log('Screen wake lock unavailable. Keep the screen awake manually while parked.'));
    }
    const [,played]=await Promise.all([starting,firstQuestion]);
    if(!active||current!==token||!played)return;
    clearTimeout(timer);arm(current);
  }catch(error){fail(error.message);}
}
$('start').onclick=()=>void begin('story');$('lab').onclick=()=>void begin('lab');$('test').onclick=()=>void begin('test');$('stop').onclick=()=>void stop();$('prepare').onclick=()=>void prepare();$('yes').onclick=()=>void answer('yes');$('no').onclick=()=>void answer('no');$('engine').onchange=capability;
$('threshold').oninput=()=>{$('thresholdValue').value=Number($('threshold').value).toFixed(2);};$('clear').onclick=()=>{$('log').replaceChildren();$('result').textContent='No results yet.';};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)void stop('Paused: app left the foreground. Restart while parked.');});window.addEventListener('pagehide',()=>{void stop();});capability();controls();
