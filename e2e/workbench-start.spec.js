import {test,expect} from '@playwright/test';
test('voice-only workbench does not wait for audio or wake lock, starts browser speech on tap',async({page})=>{
 await page.addInitScript(()=>{
  window.Audio=class{play(){return new Promise(()=>{});}};
  Object.defineProperty(navigator,'wakeLock',{value:{request:()=>new Promise(()=>{})},configurable:true});
  window.SpeechRecognition=class{start(){window.__speechStarted=true;window.__gestureAtStart=navigator.userActivation.isActive;this.t=setTimeout(()=>this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:'yes',confidence:.99}],{isFinal:true})]}),100);}abort(){clearTimeout(this.t);}};
 });
 await page.goto('/');await page.locator('#engine').selectOption('browser');await page.locator('#prepare').click();await page.locator('#parked').check();await page.locator('summary').click();await page.locator('#test').click();
 await expect(page.locator('#log')).toContainText('Workbench: yes',{timeout:2500});expect(await page.evaluate(()=>window.__gestureAtStart)).toBe(true);await page.locator('#stop').click();await expect(page.locator('#test')).toBeEnabled();
});
test('local microphone startup timeout unlocks controls without playing drama',async({page})=>{
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=()=>new Promise(()=>{});window.Audio=class{play(){return new Promise(()=>{});}};});
 await page.goto('/');await page.locator('#prepare').click();await expect(page.locator('#state')).toContainText('Receiver ready',{timeout:60000});await page.locator('#parked').check();await page.locator('summary').click();await page.clock.install();await page.locator('#test').click();await expect(page.locator('#workbenchState')).toContainText('Requesting microphone');await page.clock.fastForward(15001);await expect(page.locator('#workbenchState')).toContainText('did not start');await expect(page.locator('#test')).toBeEnabled();await expect(page.locator('#caption')).toHaveText('A hidden channel. Two answers.');
});
test('drama plays its real first question on tap without a silent unlock or wake-lock wait',async({page})=>{
 await page.addInitScript(()=>{
  window.__played=[];window.Audio=class{removeAttribute(){}load(){}pause(){}play(){window.__played.push({src:this.src,gesture:navigator.userActivation.isActive});if(this.src.startsWith('data:'))return new Promise(()=>{});this.t=setTimeout(()=>this.onended?.(),100);return Promise.resolve();}};
  Object.defineProperty(navigator,'wakeLock',{value:{request:()=>new Promise(()=>{})},configurable:true});window.SpeechRecognition=class{start(){window.__dramaSpeech=true;}abort(){}};
 });
 await page.goto('/');await page.locator('#engine').selectOption('browser');await page.locator('#prepare').click();await page.locator('#parked').check();await page.locator('#start').click();await expect(page.locator('#state')).toHaveText('Listening for yes or no');const played=await page.evaluate(()=>window.__played);expect(played).toEqual([{src:'./audio/female/q2.mp3',gesture:true}]);expect(await page.evaluate(()=>window.__dramaSpeech)).toBe(true);await page.locator('#stop').click();
});
test('stalled drama audio start times out without leaving controls locked',async({page})=>{
 await page.addInitScript(()=>{window.Audio=class{removeAttribute(){}load(){}pause(){}play(){return new Promise(()=>{});}};});await page.goto('/');await page.locator('#parked').check();await page.clock.install();await page.locator('#lab').click();await page.clock.fastForward(20001);await expect(page.locator('#state')).toContainText('did not start');await expect(page.locator('#lab')).toBeEnabled();
});
