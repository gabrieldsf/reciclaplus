// Envio de e-mails transacionais.
//   brevo   → API da Brevo (produção; exige BREVO_API_KEY e EMAIL_FROM)
//   console → só mostra o e-mail no terminal (desenvolvimento sem chave)
//   memory  → guarda numa "caixa de saída" em memória (testes automatizados)
// EMAIL_TRANSPORT escolhe; sem ela, usa brevo se houver chave, senão console.

export type Email = { to: string; subject: string; html: string; text: string }

type Transport = 'brevo' | 'console' | 'memory'

const outbox: Email[] = []

export function transport(): Transport {
  const chosen = process.env['EMAIL_TRANSPORT']
  if (chosen === 'brevo' || chosen === 'console' || chosen === 'memory') return chosen
  return process.env['BREVO_API_KEY'] ? 'brevo' : 'console'
}

async function sendWithBrevo(email: Email) {
  const apiKey = process.env['BREVO_API_KEY']
  const from = process.env['EMAIL_FROM']
  if (!apiKey || !from) throw new Error('BREVO_API_KEY e EMAIL_FROM precisam estar configurados')

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: from, name: process.env['EMAIL_FROM_NAME'] ?? 'Recicla+' },
      to: [{ email: email.to }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    throw new Error(`Brevo respondeu ${res.status}: ${await res.text()}`)
  }
}

export async function sendEmail(email: Email) {
  switch (transport()) {
    case 'brevo':
      return sendWithBrevo(email)
    case 'memory':
      outbox.push(email)
      return
    case 'console':
      console.log(
        `\n📧 E-mail (não enviado — configure BREVO_API_KEY)\nPara: ${email.to}\nAssunto: ${email.subject}\n${email.text}\n`,
      )
  }
}

// Caixa de saída simulada (só tem conteúdo com EMAIL_TRANSPORT=memory)
export const memoryOutbox = {
  all: () => [...outbox],
  lastTo: (to: string) => outbox.findLast((e) => e.to === to.toLowerCase()) ?? null,
  clear: () => {
    outbox.length = 0
  },
}
