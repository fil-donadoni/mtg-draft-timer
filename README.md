# Draft Timer

Un judge in tasca per il booster draft di Magic: il telefono sul tavolo
annuncia apertura buste, pick, «dieci secondi», passaggi e periodi di
revisione, con i tempi ufficiali delle Magic Tournament Rules.

## Uso

```sh
bun install
bun run dev        # http://localhost:5173
bun run build      # dist/
bun run check:all  # prettier + eslint + tsc + vitest
```

Configura buste, carte per busta, lingua e voce, poi **Inizia il draft**.
Il tap di avvio sblocca l'audio (obbligatorio su iOS/Android) e attiva il
wake lock dello schermo. Le impostazioni restano in `localStorage`.

## Tempi (MTR, Appendice B — ed. 27 feb 2026)

| Carte rimaste | Secondi |
| ------------- | ------- |
| 15 · 14       | 40      |
| 13            | 35      |
| 12            | 30      |
| 11 · 10       | 25      |
| 9 · 8         | 20      |
| 7             | 15      |
| 6 · 5         | 10      |
| 4 · 3 · 2     | 5       |
| 1             | —       |

Revisione: 60 s dopo la prima busta, +20 s per ogni busta successiva.
Passaggio: sinistra, destra, sinistra (MTR 7.7). Buste sopra le 15 carte
usano la riga 15.

Ciclo per ogni pick, come al tavolo: «Controllate di avere N carte» →
«Potete guardare, avete N secondi» (timer MTR, «dieci secondi», beep 3‑2‑1)
→ «Draft» (scelta + passaggio). La prima pick di ogni busta parte
dall'apertura («aprite, contate, togliete i token… questa busta si passa a
sinistra»); l'ultima carta è «controllate di avere una carta e prendetela».

Dopo l'ultima busta, opzionale (default on): **Costruzione**, 25 minuti per
registrazione e costruzione del mazzo (MTR Appendice B), con annunci a 10,
5 e 1 minuto.

Non da regolamento, configurabili: apertura busta (20 s), conteggio (4 s),
draft e passaggio (5 s), ultima carta (5 s).

## Struttura

```
src/lib/draft/timing.ts     tabella MTR, revisione, direzione
src/lib/draft/schedule.ts   config → lista di step (open/check/look/draft/last-pick/review/build/done)
src/lib/draft/messages.ts   frasi del judge (it/en) + etichette
src/lib/draft/engine.ts     macchina a stati pura, clock esplicito, cue (annuncio/10 s/3-2-1)
src/lib/audio/announcer.ts  Web Speech + Web Audio (beep sintetici)
src/hooks/useDraftEngine.ts engine ↔ wall clock (interval + visibilitychange)
src/components/             SetupScreen, TimerScreen, DraftSession
```

Il dominio (`src/lib/draft`) non tocca il DOM: i test lo coprono per intero
con un clock finto. `App.test.tsx` fa girare un draft con `fireEvent` e
fake timers (user-event va in deadlock con i fake timers di vitest).
