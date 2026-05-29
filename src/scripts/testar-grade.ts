import { buscarGradeTamanho } from '../lib/ml/grade-tamanho'

async function main() {
  const token = process.env.ML_ACCESS_TOKEN ?? ''
  if (!token) {
    console.log('Defina ML_ACCESS_TOKEN antes de rodar: ML_ACCESS_TOKEN=... npx tsx src/scripts/testar-grade.ts')
    process.exit(1)
  }
  const resultado = await buscarGradeTamanho('MLB31447', token)
  console.log('resultado:', JSON.stringify(resultado, null, 2))
}

main()
