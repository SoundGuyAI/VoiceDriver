export const COMMANDS = ['yes', 'no', 'left', 'right'];
export function parseCommand(text) {
  const word = String(text).toLowerCase().trim().replace(/[.!?,]+$/u, '');
  return COMMANDS.includes(word) ? word : null;
}
export function classify(labels, scores, threshold = .8) {
  if (!labels.length || labels.length !== scores.length || scores.some(x => !Number.isFinite(x))) return { word: null, top: 'invalid', score: 0 };
  const index = scores.indexOf(Math.max(...scores));
  return { word: scores[index] >= threshold && COMMANDS.includes(labels[index]) ? labels[index] : null, top: labels[index], score: scores[index] };
}
export function transition(node, answer) {
  if (!['yes', 'no'].includes(answer)) return null;
  if (node === 'intro' || node === 'retry') return { response: null, next: answer === 'yes' ? 'q2' : 'retry' };
  if (node === 'q2') return { response: `q2-${answer}`, next: 'q3' };
  if (node === 'q3') return { response: `q3-${answer}`, next: 'end' };
  return null;
}
export function speechError(code) {
  const messages = { 'not-allowed': 'Microphone or speech permission denied. Check permissions while parked.', 'service-not-allowed': 'This browser speech service is unavailable or blocked.', 'audio-capture': 'No microphone is available.', network: 'Browser speech network service failed.', 'language-not-supported': 'English recognition is not installed or supported.', 'no-speech': 'No speech detected. No answer was chosen.' };
  return messages[code] || `Speech recognition stopped (${code}).`;
}
