# VoiceDriver

An interactive audio-drama prototype with a separate parked button Lab and recognition workbench. No paid API key required. This is not Siri and is not a driving-safety or device-compatibility certification.

## Run locally

Node 22.12+ is recommended.

```sh
npm ci
npm run dev
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Serve the built `dist/` directory over HTTPS for a physical phone. Microphone access needs HTTPS or localhost. An HTTP LAN address is not equivalent to localhost. This PR does not enable hosting, Actions, Pages or account settings.

## Parked test flow

1. Choose a receiver and existing male/female Cypher voice.
2. Prepare the receiver. The local model is downloaded at this point. Browser on-device mode only works if the API and an installed English pack report available. It never silently switches to a server.
3. Confirm you are parked. Start hands-free drama once and grant microphone permission. Audio plays, then the app automatically listens for yes/no. No answer-button press is needed between questions.
4. Alternatively open the separate button Lab. It plays the same story with Yes/No buttons and no microphone.
5. Expand the recognition workbench to test yes/no/left/right outside the story, compare diagnostics and adjust the local acceptance threshold.
6. Stop, denial, timeout and leaving the foreground cancel listening without selecting a branch. Silence is never treated as no. Return to testing only while parked.

The app attempts to unlock the same audio element on the initial tap, requests a screen wake lock where supported, and ignores recognition during recordings and the first 500ms of each answer window. Neither browser can guarantee against speaker echo. Headphones, Bluetooth routing, navigation interruptions, call interruptions, noisy cabins, Safari automatic restarts and locked-screen behavior need device testing. No background listening is claimed: the app deliberately pauses when hidden. Browser speech sessions can end early; no result causes a pause, never an invented answer.

## Receivers

| Method | What runs | Network / limits |
| --- | --- | --- |
| Local word model | TensorFlow.js Speech Commands `18w`, filtered to yes/no/left/right | Downloads JS + model initially; inference stays in browser. Not a binary yes/no model. Other words/noise are rejected when top-ranked. |
| Browser speech service | `SpeechRecognition` or `webkitSpeechRecognition`, en-US, final whole-word results | Browser may send audio to its vendor. Automatic starts can be rejected. Feature presence is not proof of iPhone reliability. |
| Browser on-device | Same API with `processLocally=true` and availability check | Experimental; requires an already-installed English pack. This app does not install packs or fall back to server recognition. |
| Button Lab | No recognition | Parked test fallback only, not fulfillment of hands-free mode. |

Scores are model/service outputs, not measured accuracy or calibrated confidence. The two services' scores are not directly comparable. No microphone audio is stored or uploaded by this app. Browser service processing remains subject to the browser vendor. The local model is fetched from the library's TensorFlow model host. No service worker/offline caching guarantee is included.

## Cypher demo provenance

The demo reuses the existing Wall Tones Lab q2, q2-yes, q2-no, q3, q3-yes, q3-no and end recordings in both voice sets, byte-for-byte. Captions for these unchanged clips are copied from the corresponding source script. Source: `SoundGuyAI/IWSDKMetaOct2026Pub` commit `948f9a5475d2dcfd383368c88677b5194584bef0`, `src/nod-lab/lab-script.ts` and `public/audio/speech/cypher-lab/`.

The opening restores a voice-adapted connection check and retry in Kore (female) and Algenib (male). Both start with intro, then an automatic yes/no window. Yes advances to q2 once. No plays retry and opens another answer window. Repeated no repeats retry; silence pauses without choosing an answer. The later scene recordings remain unchanged. Left/right are workbench commands only. This is a short scene, not a full-length drama.

New opening clips use a 300-3300 Hz voice band, compression, 12-bit radio texture and a seeded pink-noise bed, mixed to 24 kHz mono and encoded once at 80 kbps MP3. Final encoded clips measure -18.7 to -18.9 LUFS with true peaks below -1.5 dBTP. Transcript alignment verifies the complete spoken lines and split boundaries. Subjective voice/sound matching and physical-device playback remain unverified.

## Verification and caveats

- Pure command parsing and story transitions are covered by Node tests.
- Browser-flow tests use a mock speech service/audio to verify automatic branching, denial and controls. They do not certify the vendor service.
- Integration tests play actual packaged Cypher audio and load/start/stop the actual TensorFlow model with synthetic-silence microphone capture.
- An optional speech-fixture suite runs actual yes/no/left/right WAV recordings through browser microphone capture and the real model. Set `VOICE_FIXTURE_DIR` to a directory with those WAV names. Test archive: https://storage.googleapis.com/download.tensorflow.org/data/speech_commands_test_set_v0.02.tar.gz . First matching test-set examples used in initial verification: yes/no/right `e49428d9_nohash_3.wav`, left `0cb74144_nohash_2.wav`. All four passed at threshold 0.80. This is four examples, not an accuracy benchmark; model-training overlap has not been independently ruled out. Fixtures are not redistributed in this repo.
- Real iPhone/Safari, PWA, screen lock, background, Bluetooth and in-car behavior are not verified.
- `npm audit --omit=dev` is clean at implementation time. Dev tooling has a picomatch ReDoS advisory (GHSA-fc5q-39xc-vjpf); latest available picomatch 4.0.7 was affected. No blind downgrade or hidden audit suppression is used. Do not expose the development server to untrusted networks or glob inputs.

## Technical references

- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- https://github.com/tensorflow/tfjs-models/blob/master/speech-commands/README.md
- https://github.com/tensorflow/datasets/blob/master/tensorflow_datasets/datasets/speech_commands/speech_commands_dataset_builder.py

## Workflow

Use a focused feature branch and PR. Keep source, assets and tests consistent in atomic commits. No merge without an explicit go-ahead for that PR. Do not enable new hosting, workflows or account access as a side effect of prototype work.
