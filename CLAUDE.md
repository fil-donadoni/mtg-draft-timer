# CLAUDE.md

Draft Timer: PWA-style timer che fa da judge per un booster draft di Magic.
Stack: Vite 8, React 19, TypeScript 5.9, Tailwind 4, shadcn (base-nova /
`@base-ui/react`), Vitest 5 + happy-dom. Package manager: bun.

## Comandi

- `bun run dev` / `bun run build`
- `bun run check:all` — prettier check, eslint, `tsc -b`, vitest. Deve
  passare prima di dichiarare finito.
- `bun run format` — prettier (4 spazi, doppi apici, 80 col — vedi
  `.prettierrc`, copiata da `../tolaria`).

## Regole

- Tempi per pick = tabella MTR Appendice B in `src/lib/draft/timing.ts`.
  Non inventare tempi: se serve altro (apertura busta, pausa passaggio,
  ultima carta) è un parametro di `DraftConfig`, non da regolamento.
- `src/lib/draft/**` è puro: nessun DOM, nessun `Date.now()` — il tempo
  entra come argomento (`now`). Test prima per ogni cambio di regole.
- Audio solo via `Announcer` (`src/lib/audio/announcer.ts`); i componenti
  ricevono l'istanza, non parlano con `speechSynthesis` direttamente. In
  test si inietta un fake.
- Test di componenti: `fireEvent` + `vi.useFakeTimers({ toFake: [...] })`
  limitato a timer e `Date`. `user-event` va in deadlock con i fake timers;
  fakeare `queueMicrotask`/`setImmediate` blocca happy-dom.
- Niente `window.confirm`/`alert`: bloccano l'automazione browser. Conferme
  a doppio tap (vedi Esci in `TimerScreen`).
- Componenti shadcn generati in `src/components/ui/`: la CLI scrive
  `import { cn } from "cn"` — riscrivere a `@/lib/utils` e rimuovere il
  pacchetto `cn` se lo aggiunge.
