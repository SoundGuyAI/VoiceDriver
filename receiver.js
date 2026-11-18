import { classify, parseCommand, speechError } from './logic.js';
export class Receiver {
  constructor(onWord, onStatus, onError, threshold) { Object.assign(this, {onWord,onStatus,onError,threshold}); this.active=false; this.prepared=null; this.local=null; this.recognition=null; this.generation=0; }
  async prepare(method) {
    this.prepared=null;
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw Error('Use HTTPS or localhost with microphone access.');
    if (method === 'local') {
      this.onStatus('Loading local word model...');
      const tf=await import('@tensorflow/tfjs'); await tf.ready();
      const module=await import('@tensorflow-models/speech-commands');
      const commands=module.default || module;
      this.local ||= commands.create('BROWSER_FFT','18w');
      await this.local.ensureModelLoaded();
    } else if (method !== 'manual') {
      const API=globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
      if (!API) throw Error('Browser speech recognition is not available here. Try the local model.');
      if (method === 'device') {
        if (!('processLocally' in API.prototype) || typeof API.available !== 'function') throw Error('This browser does not expose on-device speech recognition.');
        const state=await API.available({langs:['en-US'],processLocally:true});
        if (state !== 'available') throw Error(`On-device English is ${state}. No pack was installed. Try another method.`);
      }
    }
    this.prepared=method; this.onStatus('Receiver ready. Device testing still required.');
  }
  async start(method) {
    if (this.prepared !== method) throw Error('Prepare this receiver first while parked.');
    this.active=true; const generation=++this.generation;
    if (method === 'local') {
      try {
        await this.local.listen(result => {
          if (!this.active || generation !== this.generation) return;
          const data=classify(this.local.wordLabels(),Array.from(result.scores),this.threshold());
          this.onWord(data.word,data);
        },{probabilityThreshold:0,invokeCallbackOnNoiseAndUnknown:true,overlapFactor:.5});
        if (!this.active || generation !== this.generation) { if (this.local.isListening()) await this.local.stopListening(); }
      } catch(error) { if(generation === this.generation) this.active=false; throw error; }
    }
  }
  listenWindow() {
    if (!this.active || this.prepared === 'local' || this.prepared === 'manual') return;
    const API=globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    const recognition=new API(); this.recognition=recognition;
    const generation=this.generation;
    recognition.lang='en-US'; recognition.continuous=false; recognition.interimResults=false;
    if(this.prepared === 'device') recognition.processLocally=true;
    recognition.onresult=event=>{if(!this.active || generation !== this.generation || this.recognition !== recognition)return; const item=event.results[event.resultIndex]; if(item?.isFinal){const transcript=item[0].transcript; this.onWord(parseCommand(transcript),{top:transcript,score:item[0].confidence});}};
    recognition.onerror=event=>{if(this.active && generation === this.generation && this.recognition === recognition && event.error !== 'aborted')this.onError(speechError(event.error));};
    recognition.onend=()=>{if(this.active && generation === this.generation && this.recognition === recognition){this.recognition=null;this.onStatus('Browser listening ended. No automatic answer.');}};
    try{recognition.start();}catch(error){this.onError(`Automatic microphone start failed: ${error.message}. Resume only while parked.`);}
  }
  closeWindow(){const recognition=this.recognition; this.recognition=null; recognition?.abort();}
  async stop(){this.active=false; ++this.generation; this.closeWindow(); if(this.local?.isListening())await this.local.stopListening();}
}
