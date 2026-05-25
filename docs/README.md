# Documentação Guiamos

> **Para o Claude Code**: leia este índice primeiro. Depois leia APENAS o(s) arquivo(s) que respondem à pergunta atual. Não carregue toda a pasta.

## O que é o Guiamos

SaaS que automatiza o cadastro de produtos em marketplaces brasileiros usando Claude AI. Antes chamado Listify, agora **Guiamos**. Domínio: **guiamos.com.br**.

## Mapa de arquivos — onde achar cada coisa

| Pergunta típica | Arquivo |
|---|---|
| O que é o produto, princípios, 5 inputs obrigatórios | `01-visao-geral.md` |
| Stack técnica, tabelas Supabase, mapa de arquivos do código | `02-arquitetura.md` |
| Como funciona o fluxo do usuário (cadastro → onboarding → chat → geração) | `03-fluxos.md` |
| Fórmulas de preço, planos (Free, Starter, Profissional, Agência) | `04-precificacao.md` |
| Como o usuário deve preparar fotos (nomenclatura, Drive, requisitos) | `05-fotos.md` |
| Regras de título por canal (SEO) | `06-seo-titulos.md` |
| Sistema de aprendizado de erros em 3 camadas | `07-aprendizado-erros.md` |
| Direção visual, padrões de UI e textos de interface | `08-design-ui.md` |
| Regras específicas de um canal (geração + upload + erros) | `canais/<nome>.md` |
| O que falta fazer no produto | `PROXIMOS-PASSOS.md` |

## Canais suportados (cada um tem seu .md em `canais/`)

- `mercado-livre.md`
- `shopee.md`
- `amazon.md`
- `magalu.md`
- `tiktok.md`
- `bling.md`

## Regras de ouro do produto

1. **Mínimo real**: 5 inputs do usuário (nome, fotos, estoque, custo, regime tributário). IA infere o resto.
2. **Canais independentes**: cada marketplace é um módulo separado. Não há ordem obrigatória.
3. **Templates internos**: usuário nunca baixa template. Recebe arquivo pronto pra upload.

## Convenções desta documentação

- **Atualizada em**: maio/2026 (v6 — Guiamos)
- **Substituiu**: `Listify_Documentacao_v5.docx` (a v5 está desatualizada — não usar)
- **Quem mantém**: Lucas. Toda mudança expressiva no produto deve refletir aqui.
