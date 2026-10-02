// Categorias e subcategorias iniciais (Plano de Projeto, seção 5)
import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'

const categories: { name: string; description: string; subcategories: string[] }[] = [
  { name: 'Papel / Papelão', description: 'Papel e papelão', subcategories: ['Papel', 'Papelão'] },
  {
    name: 'Plástico',
    description: 'Embalagens e objetos plásticos',
    subcategories: ['Garrafas PET', 'Embalagens', 'Plástico rígido', 'Outros'],
  },
  {
    name: 'Metal',
    description: 'Metais em geral',
    subcategories: ['Alumínio', 'Ferro', 'Cobre', 'Outros'],
  },
  {
    name: 'Vidro',
    description: 'Vidros em geral',
    subcategories: ['Garrafas', 'Potes', 'Vidro em geral'],
  },
  {
    name: 'Eletrônicos',
    description: 'Equipamentos e componentes eletrônicos',
    subcategories: ['Celulares', 'Computadores', 'Componentes', 'Outros'],
  },
  {
    name: 'Outros',
    description: 'Materiais que não se enquadram nas categorias principais',
    subcategories: [],
  },
]

async function main() {
  for (const { name, description, subcategories } of categories) {
    const category = await prisma.category.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    })
    for (const sub of subcategories) {
      await prisma.subcategory.upsert({
        where: { categoryId_name: { categoryId: category.id, name: sub } },
        update: {},
        create: { categoryId: category.id, name: sub },
      })
    }
  }
  console.log(`Seed concluído: ${categories.length} categorias.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
