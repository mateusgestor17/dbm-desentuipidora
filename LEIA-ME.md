# Site — DBM Desentupidora

Site estático (HTML, CSS e JS puros, sem build). Tudo que vai ao ar está em `public/`.

## Ver no computador
```bash
cd public && python3 -m http.server 8081
```
Abra http://localhost:8081

## Onde editar
- `public/assets/js/data.js`: WhatsApp, telefone, e-mail e mensagem padrão.
- `public/index.html`: textos de todas as seções (hero, serviços, como funciona, área, FAQ).
- `public/assets/js/tubo3d.js`: cena 3D do topo (câmera dentro da tubulação).
- `public/assets/js/howto.js`: animação do "Como funciona" (máquina rotativa → cano livre).
- `public/assets/clientes/`: logos de clientes.

## Publicar (Cloudflare Pages)
1. Suba esta pasta para um repositório no GitHub.
2. Cloudflare → Workers & Pages → Create → **Pages** → Connect to Git.
3. Build command: vazio. Output directory: `public` (já definido em `wrangler.toml`).
4. Em Custom domains, adicione o domínio e o `www`.
5. Depois de definir o domínio, adicione `<link rel="canonical">`, a URL absoluta da `og:image` e um `sitemap.xml`.

A cada atualização, troque o `?v=20261030a` dos CSS/JS no `index.html` para evitar cache antigo.
