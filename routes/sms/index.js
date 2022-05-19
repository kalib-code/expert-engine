'use strict'
const axios = require('axios')
const axiosInstance = axios.create({
  baseURL: 'https://app.sendmo.co'
})

function getCustomData (contact) {
  const { custom_fields, ...contacts } = contact
  let custom_field = {}
  if (custom_fields) {
    contact.custom_fields.forEach(custom => {
      custom_field[custom.key] = custom.value
    })
  }

  return { ...contacts, ...custom_field }
}

module.exports = async function (fastify, opts) {
  fastify.post('/queue', async function (request, reply) {
    const { body } = request

    const {
      data: { data }
    } = await axiosInstance.get(
      `/items/contact_group/${body.payload.groups}?fields=*.*,contactList.*`
    )

    const contacts = await Promise.all(
      data.contactList.map(async element => {
        const {
          data: { data: contact }
        } = await axiosInstance.get(
          `/items/contacts/${element.contacts_id}?fields=*.*`
        )
        return contact
      })
    )

    contacts.forEach(async contact => {
      let messageTemplate = (str, obj) =>
        str.replace(/\${(.*?)}/g, (x, g) => obj[g])
      const message = body.payload.Template
      const data = getCustomData(contact)
      const toSendMessage = messageTemplate(message, data)

      const { data: response } = await axiosInstance.post('/items/SMS_Queue', {
        user_id: body.accountability.user,
        sendername: 'NinjaCash',
        recipient: data.phone,
        scheduled: body.payload.Scheduled,
        message: toSendMessage
      })
    })

    reply.code(200).send({ message: 'success' })
  })
}
