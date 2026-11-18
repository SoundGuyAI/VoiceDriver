import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand, classify, transition, speechError } from '../logic.js';
test('accepts whole commands, never a phrase containing a command',()=>{assert.equal(parseCommand(' YES! '),'yes'); for(const word of ['yesterday','no thanks','yes no','I said left',''])assert.equal(parseCommand(word),null);});
test('rejects noise, unknown words, low confidence and malformed scores',()=>{assert.equal(classify(['yes','no','_unknown_'],[.1,.05,.85]).word,null);assert.equal(classify(['yes','no'],[.6,.4]).word,null);assert.equal(classify(['yes'],[NaN]).word,null);assert.equal(classify(['yes','no'],[.9,.1]).word,'yes');});
test('all story branches lead to the existing next question and end',()=>{for(const word of ['yes','no']){assert.deepEqual(transition('q2',word),{response:`q2-${word}`,next:'q3'});assert.deepEqual(transition('q3',word),{response:`q3-${word}`,next:'end'});}assert.equal(transition('q2','left'),null);assert.equal(transition('end','yes'),null);});
test('permission errors identify a parked recovery, not a silent fallback',()=>{assert.match(speechError('not-allowed'),/parked/);});
