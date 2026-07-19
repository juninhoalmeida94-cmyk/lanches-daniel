# Daniel Lanches — Spec MVP oficial

## Escopo

O MVP contém exatamente oito entregas. Nada além disso entra na versão de lançamento.

| # | Entrega | O que inclui |
|---|---------|-------------|
| 1 | **Cardápio público** | Lista de produtos por categoria, busca, oferta em destaque, disponível sem login |
| 2 | **Carrinho** | Adicionar/remover itens, subtotal, taxa de entrega, alerta de loja fechada |
| 3 | **Conecte-se** | Cadastro e login via e-mail/senha (Supabase Auth), sessão persistente |
| 4 | **Confira (Checkout)** | Endereço, modo de entrega, pagamento, observações, confirmação de pedido |
| 5 | **Pedidos** | Cliente acompanha status do próprio pedido em tempo real |
| 6 | **Painel admin** | Kanban de pedidos, avanço de status, abertura/fechamento de loja, cadastro de produtos |
| 7 | **Tempo real** | Supabase Realtime: novos pedidos e mudanças de status aparecem sem recarregar |
| 8 | **Estoque básico** | Campo `stock` por produto; trigger bloqueia pedido se estoque < quantidade; baixa automática após insert |

---

## O que está fora do MVP

Tudo o que não aparece na tabela acima está fora do escopo de lançamento:

- cupons e promoções
- entregador / rastreamento de rota
- relatórios e gráficos avançados
- integração com impressora
- WhatsApp / notificação push
- multi-tenant / Super Admin
- IA copiloto

---

## Configuração rápida

### 1. Banco de dados

Execute `supabase_schema.sql` no SQL Editor do Supabase.

Cria: `profiles`, `products`, `orders`, `store_settings`, triggers de validação/estoque e RLS completo.

### 2. Credenciais

Crie/edite o arquivo `env.js` na raiz:

```js
window.__ENV__ = {
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_ANON_KEY: "SUA_ANON_KEY"
};
```

### 3. Auth

No painel Supabase → Authentication:
- habilite **Email/Password**
- habilite **Confirm email** para validar o fluxo real de confirmação
- habilite o provider **Google**
- em **URL Configuration**, mantenha a URL publicada como Site URL
- adicione as URLs do cardápio local e publicado na lista de Redirect URLs

Exemplos usados pelo app:

```text
http://localhost:4173/index.html?tab=profile
https://juninhoalmeida94-cmyk.github.io/lanches-daniel/cardapio?tab=profile
https://juninhoalmeida94-cmyk.github.io/lanches-daniel/admin/login
```

O cadastro de cliente é livre. O acesso administrativo continua dependendo do
campo `profiles.role` ser `employee`, `delivery`, `admin` ou `super_admin`.

### 4. Promover admin

```sql
insert into public.profiles (id, full_name, phone, role)
values ('USER_UUID_AQUI', 'Admin Daniel', '(11) 98888-2026', 'admin')
on conflict (id) do update
set role = 'admin',
    full_name = excluded.full_name,
    phone = excluded.phone;
```

---

## Regras de segurança (RLS)

- visitante não lê pedidos
- cliente autenticado cria pedido apenas com o próprio `auth.uid()`
- preço, taxa e estoque nunca são confiados ao navegador — o banco reprocessa tudo
- pedido abaixo do mínimo é recusado pelo Postgres
- somente equipe altera status e abre/fecha loja
- somente admin/super_admin exclui pedidos e produtos

---

## Deploy GitHub Pages

O deploy oficial usa `.github/workflows/deploy.yml`.

No GitHub, configure em **Settings → Secrets and variables → Actions → New repository secret**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

A cada push na branch `main`, o workflow:

1. baixa o repositório
2. gera `outputs/env.js` a partir dos secrets
3. publica a pasta `outputs` no GitHub Pages

O arquivo `env.js` real não deve ser commitado. Ele fica protegido pelo `.gitignore`.

### Rotas do SPA

GitHub Pages não tem rewrite de servidor como Netlify. Por isso, o projeto usa `404.html` + um pequeno script no `index.html`: rotas como `/cardapio` e `/admin/login` voltam para o SPA sem perder o caminho.

### Limitação de headers

Os arquivos `_headers` e `_redirects` eram específicos de Netlify e foram removidos. GitHub Pages não aplica `X-Frame-Options`, CSP ou HSTS por arquivo estático. Se esses headers forem obrigatórios em produção, coloque Cloudflare ou outro proxy/CDN na frente do GitHub Pages.

## Deploy e cache

Sempre que alterar `index.html`, `style.css`, `script.js` ou `public-app.js`, suba o número em `CACHE_VERSION` no `sw.js`. Sem isso, usuários com o PWA instalado continuam vendo a versão antiga em cache.

---

## Teste de ponta a ponta

1. Cadastre um e-mail novo e confirme que `data.session` fica vazio enquanto a confirmação estiver pendente.
2. Abra o link recebido e entre com o e-mail confirmado.
3. Entre com Google e confirme o retorno para `?tab=profile`.
4. Atualize a página e confira que a sessão e o perfil permanecem ativos.
5. Edite telefone/endereço e confirme os dados em `public.profiles`.
6. Saia da conta e confira a tela “Entre ou crie sua conta”; o carrinho deve permanecer.
7. Repita com um segundo usuário e confirme que os perfis têm UUIDs e dados diferentes.
8. Finalize um pedido em cada conta e confira `orders.user_id = auth.uid()`.
9. Confirme que cada cliente vê somente os próprios pedidos.
10. Confira os dois usuários em **Authentication → Users** e os UUIDs correspondentes em `public.profiles`.
11. Em outra aba, entre como admin e confirme que os pedidos continuam visíveis no kanban em tempo real.
12. Avance o status e confirme a atualização no cliente sem recarregar.
