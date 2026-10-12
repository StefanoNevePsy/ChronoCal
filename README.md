# ChronoCal
Piccola app locale per macOS: conteggio delle ore su calendari Google selezionati, con il design Taccuino fornito dall’utente. La pubblicazione su GitHub Pages è rimandata.

## Uso sul Mac
Apri `~/Applications/ChronoCal.app`, oppure visita http://localhost:4318. Il servizio parte automaticamente al login, rimane sul Mac e non apre finestre del terminale. Il browser si apre quando avvii il collegamento ChronoCal.

## Collegare Google, una sola volta
1. In Google Cloud crea un progetto e abilita Google Calendar API.
2. Configura Google Auth Platform (consenso OAuth); se il progetto è in Testing aggiungi il tuo account agli utenti di test.
3. Crea un client OAuth di tipo **Applicazione web**. Aggiungi esattamente l’URI di redirect `http://localhost:4318/oauth/callback`.
4. Scarica il JSON del client, importalo nel pannello «Configurazione Google, una sola volta» e premi «Collega Google».
5. Autorizza l’accesso di sola lettura. Il server richiede accesso offline e rinnova automaticamente il token.

Google può revocare o far scadere i refresh token. Per i progetti esterni in Testing il token Calendar scade normalmente dopo 7 giorni: usa la configurazione In production appropriata al tuo caso per ridurre le riconnessioni. La modalità produzione non elimina le altre condizioni di scadenza/revoca. Vedi [documentazione OAuth Google](https://developers.google.com/identity/protocols/oauth2).

## Conteggi
- Settimana corrente (lunedì–domenica), mese corrente, mese precedente, anno corrente o date personalizzate.
- Date comprese, dal primo giorno a mezzanotte fino alla mezzanotte successiva all’ultimo giorno, nel fuso del browser.
- Predefinito: unione degli intervalli, anche fra calendari diversi. La somma delle righe per calendario può eccedere il totale.
- Alternativa: somma di tutte le durate, comprese le sovrapposizioni.
- Ricorrenze espanse da Google, eventi cancellati e inviti rifiutati esclusi. Giornata intera esclusa: non ha una durata oraria dichiarata.
- Gli eventi che attraversano i limiti del periodo contano soltanto per la parte inclusa.
- Limite: 30 calendari e un anno per richiesta. Errori Google non producono totali parziali.
- Il CSV contiene riepilogo e dettaglio; le durate del dettaglio sono durate individuali, prima dell’unione.
- I dati dimostrativi sono esplicitamente etichettati e non cambiano la selezione dei calendari reali.

## Privacy e archiviazione
Accesso di sola lettura: non crea o modifica eventi. Calendari e report non vengono salvati dal server; vengono tenuti in memoria per il conteggio. OAuth e credenziali sono conservati fuori dalla repository, in `~/Library/Application Support/OreCalendario/connection.json`, con directory privata (700) e file leggibile/scrivibile solo dall’utente (600). Il file non è cifrato: proteggerlo come una credenziale. Nessun token è inviato al frontend. Il servizio ascolta solo su loopback e verifica Host, sessione e Origin; OAuth usa state e PKCE. Le preferenze non segrete restano nel browser.

## Sviluppo e manutenzione
Node 20+, nessuna dipendenza da installare. `npm start` avvia l’app; `npm test` verifica i conteggi. `node scripts/install-mac.mjs` installa o aggiorna la copia autonoma in Application Support, un runtime Node dedicato, il launcher e il LaunchAgent `it.chronocal.local`. `node scripts/uninstall-mac.mjs` disabilita l’avvio automatico e rimuove il launcher, conservando configurazione e runtime.

I font Gloock, Archivo e La Belle Aurore sono inclusi localmente con le licenze OFL. DESIGN.md conserva il riferimento originale. Google OAuth reale non verificato senza le credenziali dell’utente.
