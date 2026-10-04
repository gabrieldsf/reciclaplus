import { Router } from 'express'
import { memoryOutbox } from '../lib/mailer.js'

// SÓ para testes automatizados (EMAIL_TRANSPORT=memory): lê o último e-mail
// "enviado" para um endereço, para o teste E2E digitar o código como um usuário faria.
// Nunca é registrada com o envio real (Brevo).
export const devOutboxRouter = Router()

devOutboxRouter.get('/', (req, res) => {
  const to = String(req.query['to'] ?? '')
  const email = memoryOutbox.lastTo(to)
  if (!email) {
    res.status(404).json({ message: 'Nenhum e-mail para esse endereço' })
    return
  }
  res.json({ email })
})
