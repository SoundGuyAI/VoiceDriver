# VoiceDriver development

- Focused branches and PRs; no merge without explicit approval for that PR.
- Publish complete atomic changes only after Node tests, production build and relevant browser tests pass.
- Do not add hosting, workflows, account access or deployment settings without approval.
- Keep imported Cypher recordings and captions unchanged. Existing story provenance and technical limits are in README.md.
- Separate parked button Lab, parked recognition workbench and automatic question/answer drama loop.
- Never pick a story branch on silence, rejection, timeout, permission failure, stop or hidden/background state.
- Real device, iPhone/background and driving claims require actual evidence. Mocks, synthetic microphone capture and dataset fixtures must be labeled separately.
