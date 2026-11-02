# Secret Santa Security 🎅

A Secret Santa draw for several families, protected by deeply unnecessary security.

Everyone shops for two people, so everyone gets two gifts. Each person gets their own link, and
before it shows who they're shopping for, they have to get past
"bots" led by **KRAMPUS.exe**:

1. **Basic human check:** an "I'm not a robot" box that runs away, fakes a check, shrinks, and
   finally asks for a $4.99 SantaPay tip. SantaPay is made up and no money ever moves.
2. **Image verification:** select all squares with reindeer. One of them is a relative in a sweater.
3. **Voice verification:** say "I have been good this year" out loud and get roasted.
4. **Final processing:** a progress bar pulled by a reindeer who stops until you feed him.

After each level, KRAMPUS.exe reports how *he* did. Then two scratch-off cards show their two
people. Under each name is the one other person shopping for them, so the two can compare notes
and not buy the same thing. **Easy mode** (per person) skips levels 3 and 4.

There's no budget on purpose; people decide that themselves. To see it all without drawing names,
use **Try a practice run** on the home page or the practice links on the organizer page.

No server, no database, no accounts, and it's free to host.

## How the secret part works

- The organizer page runs the draw in the browser and makes one link per person.
- Each link carries that person's assignment after the `#`. Browsers never send that part to the
  web server, so the host never sees it.
- The assignment inside the link is scrambled, so a glance at the link won't give it away. It is
  **not** real encryption: someone determined, with developer tools, could unscramble it.
- The organizer's page never shows the pairings. The organizer *could* open someone else's link,
  so pick an organizer who can resist.
- Links can't be taken back. If you redraw, old links still open and show the old assignment.

## Hosting it for free on GitHub Pages

1. Create a new repository on GitHub, for example `secret-santa`. It can be public; there are no
   secrets in the code.
2. Push this folder to it:

   ```bash
   git add .
   git commit -m "Secret Santa Security"
   git remote add origin https://github.com/YOUR-NAME/secret-santa.git
   git push -u origin main
   ```

3. On GitHub, open the repository's **Settings › Pages**. Under **Build and deployment**, choose
   **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute, the site is live at `https://YOUR-NAME.github.io/secret-santa/`.
5. Open `https://YOUR-NAME.github.io/secret-santa/organize.html`, set up the families, and draw.
   **Draw on the hosted site, not on your own computer**, so the links point somewhere everyone
   can reach.
6. Send each person their link with **Copy message** or **Share**.

Cloudflare Pages or Netlify work just as well: point them at this folder, with no build command.

## Organizer tips

- Group people by **household**: spouses together, plus anyone at home who shouldn't draw them,
  like a grown kid. The default rule keeps people from drawing their own household.
- **No swaps** stops "Pat shops for Sam and Sam shops for Pat". It needs at least five people.
- When possible, the draw also keeps one household from shopping for the same person, keeps anyone
  from getting both people in one household, and gives everyone two different co-shoppers.
- **Can't draw** covers anything else, like a couple who live apart.
- After each draw, the **Rules check** unscrambles every link in your browser and re-checks each
  rule with separate code from the draw. It shows only checkmarks, never who got whom. If anything
  shows ❌, redraw before sending links.
- **Inside joke** finishes the sentence "It's the person who…" during that person's voice check.
- **Reindeer sweater star** puts one person "in a reindeer sweater" in everyone's image check.
  Leave it on "Someone different for each person" to mix it up. **Blocked microphone suspect**
  is who gets blamed when someone's microphone is blocked during the voice check.
- After the draw, **Save sealed copy for next year**. Next year, load it under *Last year* and
  nobody gets someone they had last year, without anyone seeing last year's list.
- Everything you type stays in that browser's storage. **Download all links** is a handy backup.

## Running it locally

Needs Node 18 or newer. No packages to install.

```bash
npm start
```

Then open http://localhost:5199/. Tests for the draw and the links:

```bash
npm test
```

## Where things live

| Path | What it is |
|---|---|
| `index.html`, `js/gauntlet.js` | The page people land on: intro, levels, KRAMPUS.exe updates |
| `js/trials/*.js` | One file per level. Jokes and messages are at the top of each file |
| `js/reveal.js` | The scratch-off cards |
| `js/practice.js` | The made-up practice-run link |
| `organize.html`, `js/organize.js` | The organizer page |
| `js/draw.js` | Who-gets-who, honoring the rules |
| `js/check.js` | The rules check: re-verifies the finished links, independently of the draw |
| `js/link.js` | Packing an assignment into a link and back |
| `css/site.css` | All the styling |
