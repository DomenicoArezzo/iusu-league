# IUSU LEAGUE

La lega del calcetto di Iusu: squadre bilanciate, risultati, statistiche, classifiche e premi.
Next.js + TypeScript + Tailwind + Supabase (PostgreSQL, login, permessi, tempo reale).

## Cosa c'è nella fase 1
- Sito consultabile da chiunque senza login; l'account serve solo per dare la propria disponibilità o gestire la lega. Il **primo account registrato diventa admin**
- Giocatori con valutazioni 1-10, overall per ruolo e carte in stile Ultimate Team
- Disponibilità per partita (ognuno la sua, l'admin per tutti)
- Generatore squadre: casuale, bilanciata, competitiva; blocchi, spostamenti, scambi, panchina, portieri, differenza di forza, salvataggio, condivisione WhatsApp
- Partite con stati (programmata, in corso, da confermare, conclusa, annullata), marcatori, assist, autogol, cartellini, MVP, note
- Classifiche (9) per stagione, mese, ultime 5, ultime 10, storico; premi automatici e a mano; Hall of Fame
- Confronti diretti e statistiche di coppia, record, grafico del rendimento
- Admin: utenti e collegamento al giocatore, stagioni, parametri di voto e algoritmo, registro modifiche
- Solo le partite **confermate** contano nelle classifiche

## Fase 2 (già predisposta nel database, senza interfaccia)
Valore di mercato, fantasquadre, aste, transazioni, pagelle votate dagli amici.
La logica del valore di mercato è già in `src/lib/market.ts`.

## Pubblicare online (circa 15 minuti)

### 1. Database (Supabase, gratis)
1. Crea un progetto su https://supabase.com
2. **SQL Editor** → incolla tutto `supabase/schema.sql` → Run
3. Sempre nel **SQL Editor** incolla `supabase/public_read.sql` → Run. Serve per far vedere partite, risultati e classifiche anche a chi non ha fatto login (email e voti individuali restano riservati). Senza questo passaggio i visitatori vedranno errori di caricamento. Si può rieseguire senza rischi.
4. **Authentication → Providers → Email**: per iniziare disattiva "Confirm email" (altrimenti ogni amico deve confermare via mail)
5. **Project Settings → API**: copia *Project URL* e la chiave *anon public*

### 2. Sito (Vercel, gratis)
1. Metti questa cartella su GitHub
2. Su https://vercel.com → *Add New Project* → scegli il repository
3. In *Environment Variables* aggiungi:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Ti dà un indirizzo da girare agli amici.

### 3. Primo avvio
1. Apri il sito e **registrati per primo con la tua mail**: sei l'admin
2. Aggiungi i giocatori da *Giocatori → Nuovo giocatore*
3. *Admin → Utenti*: collega ogni amico al suo giocatore dopo che si è registrato
4. *Partite → Nuova partita*, poi dalla pagina della partita genera le squadre

## In locale
```
cp .env.example .env.local   # inserisci URL e chiave
npm install
npm run dev
npm test        # test della logica
```

## Nota sulla sicurezza
La chiave "anon" è fatta per stare nel browser: a proteggere i dati sono le regole dello schema
(chi non è admin non può scrivere dati ufficiali). Non usare mai la chiave "service_role" nel sito.
