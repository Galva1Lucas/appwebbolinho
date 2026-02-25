# 📚 Minha Biblioteca Digital — SaaS de Conteúdo Exclusivo

App web estilo Netflix para entrega de PDFs, e-books e conteúdo digital para clientes.

---

## 📁 Estrutura de Arquivos

```
meu-app/
│
├─ public/
│   ├─ index.html        # Página de login
│   ├─ dashboard.html    # Biblioteca de conteúdos (estilo Netflix)
│   ├─ style.css         # Estilo visual completo
│   ├─ app.js            # Toda a lógica do app
│   └─ pdfs/             # 📂 Cole seus PDFs aqui
│       ├─ ebook-principal.pdf
│       ├─ receitas.pdf
│       └─ checklist.pdf
│
├─ icons/                # 📂 Ícones do PWA
│   ├─ icon-192.png
│   └─ icon-512.png
│
├─ manifest.json         # Configuração do PWA
├─ service-worker.js     # Suporte offline (PWA)
└─ README.md             # Este arquivo
```

---

## ⚙️ Como Configurar

### 1. Alterar a senha padrão
Abra `public/app.js` e edite a linha:
```js
senha: "12345",
```
Mude para a senha que você quer enviar por e-mail aos compradores.

---

### 2. Adicionar seus PDFs
1. Cole seus arquivos PDF dentro da pasta `public/pdfs/`
2. Abra `public/dashboard.html` e edite os cards na seção **"Conteúdo Principal"**:

```html
<div class="card unlocked"
     data-pdf="pdfs/seu-arquivo.pdf"
     data-title="Nome do seu PDF">
  <div class="card-cover" style="background: linear-gradient(135deg, #1a1a2e, #0f3460)">
    <div class="card-cover-icon">📘</div>
    <div class="card-cover-label">E-book</div>
  </div>
  <div class="card-info">
    <h4>Nome do PDF</h4>
    <p>Descrição curta</p>
    <span class="card-tag free">Incluso</span>
  </div>
</div>
```

---

### 3. Configurar Order Bumps / Upsells
Nos cards bloqueados, mude o link do checkout:

```html
<div class="card locked"
     data-checkout="https://seusite.com/checkout/upsell-1"
     data-title="Nome do Upsell">
```

Depois que o cliente pagar, envie o link com o parâmetro de desbloqueio:
```
https://seuapp.com/public/dashboard.html?unlock=upsell1
```

O mapeamento está em `app.js`:
```js
unlockedKeys: {
  upsell1: "card-upsell-1",
  upsell2: "card-upsell-2",
  upsell3: "card-upsell-3",
},
```

---

### 4. Customizar visual dos cards
Cada card pode ter um gradiente diferente. Altere o `style=""` da `.card-cover`:
```html
style="background: linear-gradient(135deg, #COR1 0%, #COR2 100%)"
```

Sugestões de paletas:
- Roxo: `#2d1b69, #8b5cf6`
- Verde: `#134e5e, #71b280`
- Laranja: `#b34700, #f97316`
- Rosa: `#7c1034, #e91e63`

---

### 5. Adicionar ícones do PWA
Coloque dois arquivos PNG na pasta `icons/`:
- `icon-192.png` (192×192 px)
- `icon-512.png` (512×512 px)

Você pode gerar ícones gratuitamente em: https://realfavicongenerator.net

---

## 🚀 Como Publicar

### Opção 1 — Netlify (Gratuito, mais fácil)
1. Acesse https://netlify.com
2. Arraste a pasta `meu-app` para o painel
3. Pronto! Você recebe um link como `https://seu-app.netlify.app`

### Opção 2 — Vercel (Gratuito)
1. Instale: `npm i -g vercel`
2. Dentro da pasta: `vercel --prod`

### Opção 3 — GitHub Pages
1. Suba o projeto para um repositório GitHub
2. Ative GitHub Pages apontando para a branch `main`

---

## 📱 PWA (Instalar no Celular)

O app detecta automaticamente quando pode ser instalado e mostra o banner.
Para iOS (Safari): o usuário deve usar o botão de Compartilhar → "Adicionar à Tela de Início".

---

## 📧 E-mail para enviar ao comprador

```
Assunto: Seu acesso ao [Nome do Produto] está pronto! 🎉

Olá [Nome],

Seu conteúdo exclusivo está disponível para acesso.

👉 Acesse aqui: https://seu-app.netlify.app

🔑 Senha: 12345

💡 Dica: Instale o app no seu celular para acesso rápido!
No Android: o app oferece instalação automaticamente.
No iPhone: Safari → Compartilhar → Adicionar à Tela de Início.

Qualquer dúvida, responda este e-mail.
```

---

## 🛠️ Manutenção

**Adicionar novo PDF:** cole na pasta `pdfs/` e adicione um novo card no `dashboard.html`.

**Mudar a senha:** edite `senha` em `app.js`. As sessões salvas continuam válidas até expirar.

**Invalidar todas as sessões:** mude o `CACHE_NAME` no `service-worker.js` (ex: `v2`).
