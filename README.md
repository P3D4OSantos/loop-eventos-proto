# loop-eventos-proto

Protótipo Next.js com `framer-motion` e TailwindCSS.

## Instruções rápidas (PowerShell)

Se você ainda não criou o app Next.js, execute:

```powershell
npx create-next-app@latest loop-eventos-proto
cd loop-eventos-proto
```

Instale dependências e configure Tailwind:

```powershell
npm install framer-motion
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

(O `npx tailwindcss init -p` irá criar/atualizar `tailwind.config.js` e `postcss.config.js`.)

Depois, garanta que `tailwind.config.js` contenha as pastas `pages` e `components` no `content` (já preparado aqui).

Por fim rode:

```powershell
npm run dev
```

Abra `http://localhost:3000`.
