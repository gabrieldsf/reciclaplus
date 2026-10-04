import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'

export const categoriesRouter = Router()

categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      subcategories: { orderBy: { id: 'asc' }, select: { id: true, name: true } },
    },
  })
  res.json({ categories })
})
