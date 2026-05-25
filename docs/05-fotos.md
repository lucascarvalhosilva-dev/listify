# 05 — Fotos

As fotos são o único input obrigatório que exige preparo antes de usar a plataforma. Este guia é exibido no onboarding (`/guia-fotos`) e é referência permanente.

## Nomenclatura obrigatória

Formato: `[SKU]_[número].jpg`

Exemplos:
- `80171_01.jpg` → foto de **capa** da Vara Telescópica 3m (SKU 80171)
- `80171_02.jpg` → segunda foto
- `712_01.jpg` → capa da Carretilha SP200

**Regra**: `_01` é SEMPRE a foto de capa. O sistema usa esse padrão pra mapear `foto → produto` automaticamente. Sem essa nomenclatura, não há associação automática.

## Requisitos por canal

| Canal | Fotos obrigatórias | Resolução mínima | Fundo | Observação |
|---|---|---|---|---|
| Mercado Livre | 1 capa + adicionais pelo painel | 500×500 (ideal 1200×1200) | Branco na capa | Adicionar fotos pelo editor após upload da planilha |
| Shopee | 1 capa (ideal 5–8) | 500×500 (ideal 1024×1024) | Branco na capa | Drive URL funciona (provado em produção) |
| Amazon Brasil | 1 capa + 5–7 adicionais | 1000×1000 (ideal 2000×2000) | Branco na capa | Alta qualidade muda o Buy Box |
| Magazine Luiza | Mínimo 2 | 900×900 a 1200×1200 | Branco recomendado | Máx. 2MB por arquivo |
| TikTok Shop | 1 | 300×300 | Qualquer | Adicionar pelo painel após upload |
| Bling | Opcional | Sem mínimo | Qualquer | Drive URL funciona |

## Como organizar no Google Drive

1. Criar pasta com nome da loja (ex: "Loja X — Fotos")
2. Colocar TODAS as fotos na mesma pasta (sem subpastas)
3. Nomear cada arquivo com o padrão `SKU_01.jpg`, `SKU_02.jpg`...
4. Botão direito na pasta → Compartilhar → Qualquer pessoa com o link → Visualizador
5. Copiar link e informar no Guiamos

⚠️ **Erro mais comum**: pasta sem acesso público. Abrir o link em aba anônima — se pedir login, o compartilhamento não está correto.

## Compatibilidade de URL do Drive por canal

| Canal | Drive URL funciona? | Recomendação |
|---|---|---|
| Shopee | ✅ SIM | Usar Drive. Formato: `drive.google.com/uc?export=view&id=FILE_ID` |
| Bling | ✅ SIM | Usar Drive (mesmo formato) |
| TikTok Shop | ⚠️ NÃO CONFIÁVEL | Adicionar pelo painel do TikTok após upload do CSV |
| Mercado Livre | ❌ NÃO RECOMENDADO | ML não segue redirects do Drive — adicionar pelo editor após upload |
| Amazon Brasil | ❌ NÃO RECOMENDADO | Upload direto pela Seller Central |
| Magazine Luiza | ⚠️ NÃO TESTADO | Upload direto pelo painel IntegraCommerce |

> Roadmap: armazenamento próprio em Cloudflare R2 vai eliminar essa fragmentação — URLs `.jpg` diretas funcionando em todos os canais. Ver `PROXIMOS-PASSOS.md`.

## Boas práticas (resumo)

| Foto | Conteúdo |
|---|---|
| Capa (`_01`) | Produto centralizado, fundo branco, sem marca d'água/texto |
| 2ª | Lateral ou parte traseira |
| 3ª | Detalhe de componente crítico |
| 4ª | Produto em uso ou contexto |
| 5ª+ | Embalagem, conteúdo da caixa, comparação de tamanho |

Evitar: imagens genéricas da internet, fotos desfocadas, marca d'água, texto sobreposto na capa.
