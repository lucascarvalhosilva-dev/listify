import { buscarDominioML } from '../lib/ml/dominio'

async function main() {
  const resultado = await buscarDominioML('Camiseta Manga Curta Basica Algodao')
  console.log(resultado)
}

main()
