# 🔥 Smoker Pods — Guia Completo

E-commerce + gestão de estoque para loja de pods/vapes.
**Stack:** Next.js 14 (App Router) · Tailwind CSS · Supabase

---

## 📁 Estrutura

```
smoker-pods/
├── app/
│   ├── globals.css
│   ├── layout.js
│   ├── page.js              ← Vitrine do cliente
│   ├── login/page.js        ← Login admin
│   └── admin/page.js        ← Painel admin (protegido)
├── components/
│   └── Cart.js              ← Carrinho + checkout WhatsApp
├── lib/
│   └── supabase.js          ← Cliente Supabase + helpers
├── supabase/
│   └── schema.sql           ← SQL completo (execute no Supabase)
├── middleware.js             ← Proteção de rotas /admin
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

---

## 🚀 Setup Passo a Passo

### Passo 1 — Supabase
1. Acesse [supabase.com](https://supabase.com) → **New Project**
2. Escolha nome, senha forte, região **São Paulo**
3. Aguarde o projeto inicializar (~2 min)
4. Vá em **SQL Editor** → cole o conteúdo de `supabase/schema.sql` → **Run**
5. Vá em **Authentication → Users → Add User** → crie o login do admin

### Passo 2 — Variáveis de Ambiente
```bash
cp .env.example .env.local
```
Preencha com os valores de **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Passo 3 — WhatsApp
Em `components/Cart.js`, linha 7, altere:
```js
const WHATSAPP_NUMBER = '5511987654321'  // DDI + DDD + número
```

### Passo 4 — Instalar e Rodar
```bash
npm install
npm run dev
# Acesse: http://localhost:3000
```

---

## 🌐 Deploy (Vercel — Recomendado, Gratuito)

### Via CLI
```bash
npm i -g vercel
vercel
# Siga as instruções — ele detecta Next.js automaticamente
```

### Via GitHub (mais fácil)
1. Suba o projeto: `git push` para um repositório no GitHub
2. Acesse [vercel.com](https://vercel.com) → **New Project** → importe o repositório
3. Em **Environment Variables**, adicione as mesmas variáveis do `.env.local`
4. Clique em **Deploy**

> A Vercel oferece HTTPS automático, CDN global e CI/CD integrado.
> O plano gratuito suporta projetos comerciais pequenos.

---

## 🔒 Segurança Backend — Guia Completo

### Camada 1: Row Level Security (RLS) — obrigatório
O RLS é ativado pelo `schema.sql`. Com ele:
- Visitantes podem apenas **ler** produtos (SELECT público)
- Somente usuários autenticados podem **criar, editar e deletar** (INSERT/UPDATE/DELETE)
- **Mesmo que alguém descubra sua anon key, não consegue modificar nada**

```sql
-- Confirme que está ativo:
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'pods';
-- rowsecurity deve ser TRUE
```

### Camada 2: Anon Key vs Service Role Key
| Chave | Onde usar | Risco |
|-------|-----------|-------|
| `anon key` | Frontend (`.env.local` com `NEXT_PUBLIC_`) | Baixo — limitada pelo RLS |
| `service_role key` | Apenas servidor (Route Handlers) | Alto — bypassa RLS |

**NUNCA coloque a service_role key em variável com `NEXT_PUBLIC_`.**

### Camada 3: Autenticação via Middleware
O arquivo `middleware.js` verifica o JWT do Supabase a cada request em `/admin`.
Sem sessão válida → redirecionamento imediato para `/login`.
O token é renovado automaticamente pelo `@supabase/auth-helpers-nextjs`.

### Camada 4: Validação no Banco de Dados
As constraints do SQL garantem integridade mesmo se o frontend for bypassado:
```sql
price >= 0
stock_qty >= 0
char_length(name) BETWEEN 2 AND 120
promo_price < price  (preço promo menor que preço normal)
```

### Camada 5: Storage Seguro
- Bucket configurado com **tipos MIME permitidos** (apenas imagens)
- **Tamanho máximo: 5MB** por arquivo
- Upload apenas por usuários autenticados
- URLs públicas apenas para leitura

### Camada 6: Proteção de Senhas
No Supabase → Authentication → Settings:
- ✅ Ative **"Leaked password protection"** (bloqueia senhas comprometidas)
- ✅ Configure **"Password strength"** como Strong ou Very Strong
- ✅ Ative **"Email confirmations"** em produção

### Camada 7: CORS em Produção
No Supabase → API Settings → Allowed Origins:
```
https://seudominio.com.br
```
Remova o `*` (wildcard) em produção.

### Checklist de Segurança Final
- [ ] RLS habilitado na tabela `pods`
- [ ] `service_role key` NUNCA no frontend
- [ ] `.env.local` no `.gitignore`
- [ ] Número correto no `Cart.js`
- [ ] CORS configurado para seu domínio
- [ ] Password strength no Supabase em Strong+
- [ ] Leaked password protection ativada
- [ ] Backup automático ativado (Supabase → Settings → Backups)

---

## ✅ Funcionalidades Implementadas

- [x] Vitrine responsiva com grid de produtos
- [x] Dados em tempo real via Supabase Realtime
- [x] Tags de sabor clicáveis (seleção obrigatória)
- [x] Alerta de estoque baixo (≤3) em laranja
- [x] "Esgotado" com imagem em grayscale e botão desabilitado
- [x] Carrinho lateral com animação suave
- [x] Campos obrigatórios: pagamento + "como nos conheceu"
- [x] Geração de link WhatsApp formatado
- [x] Painel admin com autenticação Supabase
- [x] CRUD completo de produtos
- [x] Upload de imagens com validação de tipo e tamanho
- [x] Gerenciamento de sabores como array de tags
- [x] Controle de estoque com +/− rápido na tabela
- [x] Middleware de proteção de rotas
- [x] RLS configurado no Supabase

---

## ❌ O que ainda falta (próximos passos opcionais)

| Feature | Como implementar |
|---------|-----------------|
| Histórico de pedidos | Tabela `orders` + salvar ao gerar link WhatsApp |
| Múltiplos admins | Tabela `profiles` com campo `role` |
| Notificação de estoque baixo | Supabase Edge Function + Resend (e-mail) |
| PWA (app no celular) | Pacote `next-pwa` |
| SEO por produto | `generateMetadata()` no App Router |
| Analytics | Vercel Analytics (gratuito no plano hobby) |
| Domínio personalizado | Vercel → Settings → Domains |
