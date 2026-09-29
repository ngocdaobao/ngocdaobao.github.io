# ngocdaobao.github.io

Personal academic homepage: a cherry-blossom night theme with falling sakura petals.

## Before publishing
- `images/profile.jpg`: add a square photo. It is clipped to the blossom frame, and until it exists the frame shows "BN".
- `cv.pdf`: add your CV to the repo root.
- `index.html`: replace the LinkedIn placeholder URL (search for `TODO`).
- Latest News: check the WAVE++ entry date.

## Deploy
1. Create a public GitHub repo named exactly `ngocdaobao.github.io`.
2. Push these files to `main`:
   ```
   git init && git add . && git commit -m "Homepage"
   git branch -M main
   git remote add origin https://github.com/ngocdaobao/ngocdaobao.github.io.git
   git push -u origin main
   ```
3. Settings → Pages → Source: "Deploy from a branch", `main` / root. The site is live at https://ngocdaobao.github.io in a minute or two.

## Editing
- Add a publication by copying an `<article class="publication">` block. The venue tile tone is `data-tone="sakura|slate|gold"`, or put an `<img>` inside `.pub-thumb` to show a figure instead.
- Colors are CSS variables at the top of `style.css`.
- Petal density and speed are set in `populate()` and `makePetal()` in `script.js`.
