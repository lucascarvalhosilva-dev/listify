# Próximos Passos

> Ordem aproximada de prioridade. Atualizar conforme o produto evolui.

## 🔴 Bloqueia receita (fazer logo)

### 1. Mercado Pago — checkout e assinaturas
Sem isso, planos pagos (Starter/Profissional/Agência) não funcionam.
- Criar conta em Mercado Pago Developers
- Implementar checkout para os 3 planos
- Webhook de confirmação de pagamento → atualizar coluna `plano` na tabela `profiles`
- Página `/upgrade` já existe (UI), falta backend

## 🟡 Melhoria de experiência (importante mas não bloqueia)

### 2. Refinar chat principal
- Testar redirecionamentos e botões rápidos no `/chat`
- Validar fluxo: pergunta do usuário → detecção de intenção → ação (redirect ou resposta)
- Aprimorar prompts do system message em `/api/chat-principal`

### 3. Chat executar mais ações sem redirecionar
Hoje o chat redireciona pra outras telas quando precisa de input estruturado (subir planilha, escolher canal). Avaliar se faz sentido absorver mais coisas no próprio chat (ex: subir planilha pelo chat?).

### 4. Hosting próprio de fotos (Cloudflare R2)
URLs `.jpg` diretas que funcionam em todos os canais — elimina a fragmentação atual (Drive OK no Shopee/Bling, ruim no ML/Amazon/TikTok). Ver `05-fotos.md`.

## 🟢 Polimento

### 5. Favicon Guiamos
SVG com letra G em fundo azul (`#1a73e8`).

### 6. Testar fluxo completo no domínio guiamos.com.br
- Cadastro → email → onboarding → chat
- Geração end-to-end em cada canal
- Ciclo de correção automática

## 📋 Backlog (não priorizado)

- Integração Bling API (importar catálogo sem CSV)
- Dashboard de performance (margem real por canal)
- Geração de copies pra Meta Ads / Google Ads baseada nos produtos
- Pesquisa de concorrência (preço médio de mercado)
- Suporte a variações de produto (cor, tamanho, modelo)
- White-label completo (plano Agência)
- App mobile (foto com câmera → cadastro)
- API pública pra ERPs parceiros
- Suporte a Casas Bahia / Via Varejo
- Pricing dinâmico baseado em concorrência

## ✅ Já concluído (referência)

- Domínio guiamos.com.br ativo na Vercel
- Email transacional via Resend (`noreply@guiamos.com.br`) com DMARC
- Plano Free funcional (5 produtos, Shopee+ML, 1 catálogo)
- Travas de uso por plano
- Sistema de aprendizado de erros (3 camadas)
- Chat principal como interface principal substituindo painel
- Onboarding 5 telas
- Email de confirmação e reset em PT-BR
- Página `/configuracoes`
- Varredura completa: nome "Listify" substituído por "Guiamos" em todo o projeto
