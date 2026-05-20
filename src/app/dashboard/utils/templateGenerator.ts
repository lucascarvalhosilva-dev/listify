import * as XLSX from 'xlsx'

export function downloadTemplate(): void {
  const wb = XLSX.utils.book_new()

  const ws = XLSX.utils.aoa_to_sheet([
    ['SKU', 'Nome do produto', 'Estoque', 'Custo unitário (R$)'],
    ['001', 'Camiseta Básica Preta P', 10, 25.00],
  ])

  ws['!cols'] = [
    { wch: 12 },
    { wch: 36 },
    { wch: 10 },
    { wch: 22 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
  XLSX.writeFile(wb, 'listify-template.xlsx')
}
