# Pilot release sign-off

Stato: **non approvato per staging** finché le verifiche esterne non sono concluse.

## Verifiche locali completate

- typecheck workspace;
- test unitari dominio, web e Functions;
- build di produzione PWA;
- test end-to-end Chromium in modalità demo.

## Verifiche richieste prima del rilascio

- Security Rules tramite Firestore Emulator con Java disponibile;
- browser matrix Playwright completa;
- audit manuale VoiceOver/NVDA;
- login Google e App Check sul dominio staging;
- creazione di alert, backup giornaliero e prova di restore;
- esecuzione completa di `specs/001-fair-coffee-wheel/quickstart.md` con due account reali.

Compilare data, responsabile, commit e link all’ambiente soltanto dopo il completamento della checklist.
