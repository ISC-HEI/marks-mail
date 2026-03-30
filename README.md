# Grade Mailer — ISC

Outil interne pour envoyer les notes individuelles aux étudiants par email.

## Lancement rapide

```bash
chmod +x dev.sh
./dev.sh
```

Ou manuellement :

```bash
bun install
bun run dev
```

Ouvre ensuite http://localhost:5173

## Utilisation

1. Renseigner le nom du module
2. Coller les colonnes depuis Excel : **M/F | Nom | Prénom | Email | Note**
   - La colonne M/F est optionnelle — sans elle, coller directement Nom | Prénom | Email | Note en partant de la 2ᵉ colonne
3. Personnaliser le template email (objet + corps) avec les tags `{civilite}`, `{prenom}`, `{nom}`, `{note}`, `{module}`
4. Cliquer **Vérifier & envoyer** pour prévisualiser chaque email
5. Envoyer un par un (✉) ou tout d'un coup

## Déploiement GitHub Pages

1. Dans `vite.config.js`, changer `base` :
   ```js
   base: '/nom-du-repo/'
   ```

2. Déployer :
   ```bash
   bun run deploy
   ```

3. Dans GitHub → Settings → Pages → Source : branche `gh-pages`

---

*made with ♥ — ISC 2026*
