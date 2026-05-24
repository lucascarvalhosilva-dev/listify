import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

const headers = ['SKU', 'Nome do Produto', 'Marca', 'Categoria', 'Custo Unitário (R$)', 'Estoque']

const exemplos = [
  ['80171', 'Vara Telescópica CMIK 3m', 'CMIK', 'Varas', 11.60, 50],
  ['80172', 'Molinete Marine Sports Titan 40', 'Marine Sports', 'Molinetes', 45.00, 30],
]

const outputDir = path.join(process.cwd(), 'public', 'templates')
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

// ── XLSX ──────────────────────────────────────────────────────────────────────
const wb = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet([headers, ...exemplos])

ws['!cols'] = [
  { wch: 10 },
  { wch: 38 },
  { wch: 18 },
  { wch: 20 },
  { wch: 20 },
  { wch: 10 },
]

XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
XLSX.writeFile(wb, path.join(outputDir, 'template-guiamos.xlsx'))
console.log('✓ template-guiamos.xlsx gerado')

// ── CSV ───────────────────────────────────────────────────────────────────────
const linhas = [headers, ...exemplos].map(row =>
  row.map(v => (String(v).includes(',') ? `"${v}"` : String(v))).join(',')
)
// BOM para compatibilidade com Excel
const csv = '﻿' + linhas.join('\r\n')
fs.writeFileSync(path.join(outputDir, 'template-guiamos.csv'), csv, 'utf8')
console.log('✓ template-guiamos.csv gerado')
