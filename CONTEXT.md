# Draft Timer

Un judge automatico per il booster draft di Magic: dal telefono sul tavolo
scandisce ad alta voce le fasi del draft con i tempi delle Magic Tournament
Rules. Non conosce le carte né i giocatori: solo tempo e annunci.

## Language

**Busta** (pack):
Un booster aperto e draftato da un giocatore; il draft è una sequenza di
buste, ognuna con la propria direzione di passaggio, annunciata una sola
volta all'apertura.
_Avoid_: pacco, booster (nel parlato del judge)

**Pick**:
La scelta di una carta dalla busta in mano. Ogni pick attraversa tre
chiamate del judge: conteggio, «potete guardare», «draft».
_Avoid_: scelta, turno

**Apertura** (open):
Il tempo, non regolato dalle MTR, per aprire la busta, contare le carte a
faccia in giù e togliere i token. Fa da conteggio della prima pick.

**Conteggio** (check):
«Controllate di avere N carte»: la busta è appena arrivata, ancora a faccia
in giù. Tempo fisso breve, non regolato dalle MTR.
_Avoid_: verifica, controllo

**Guardare** (look):
«Potete guardare, avete N secondi»: l'unico passo con tempo MTR, che dipende
dalle carte rimaste. Qui cadono «dieci secondi» e il conto alla rovescia.
_Avoid_: timer pick, pick timer

**Draft** (draft call):
La chiamata «draft» a tempo scaduto: si prende la carta e si passa la busta.
Occupa un tempo fisso proprio, non regolato dalle MTR.
_Avoid_: passaggio, pass

**Ultima carta** (last pick):
La pick con una sola carta rimasta: «controllate di avere una carta e
prendetela». Senza tempo MTR.

**Revisione** (review):
Il periodo tra una busta e l'altra in cui i giocatori guardano le proprie
pick. Durata fissa scelta dal tavolo (30 s), non la rampa MTR 60/90/120.
_Avoid_: pausa, review period (in italiano)

**Costruzione** (build):
Il tempo MTR dopo l'ultima busta per registrare e costruire il mazzo:
25 minuti per un draft. Opzionale; il judge scandisce 10, 5 e 1 minuto.
_Avoid_: deckbuilding, revisione finale

**Passo** (step):
Un'unità temporizzata del programma del draft: apertura, conteggio,
guardare, draft, ultima carta, revisione, costruzione. Il judge annuncia l'inizio di ogni
passo.
_Avoid_: fase, stato
