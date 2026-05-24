const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export const TEMPLATE_XLSX_URL = `${SUPABASE_URL}/storage/v1/object/public/templates/template-guiamos.xlsx`
export const TEMPLATE_CSV_URL = `${SUPABASE_URL}/storage/v1/object/public/templates/template-guiamos.csv`

export function getUrlTemplate(formato: 'xlsx' | 'csv'): string {
  return formato === 'xlsx' ? TEMPLATE_XLSX_URL : TEMPLATE_CSV_URL
}
