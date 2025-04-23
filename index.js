const express = require('express')
const axios = require('axios')
const app = express()

app.use(express.urlencoded({ extended: true }))

app.post('/submit-form', async (req, res) => {
  const token = req.body['g-recaptcha-response']
  const secret = 'your-key'

  const response = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
  )

  if (response.data.success && response.data.score >= 0.5) {
    // Form submission is valid
    res.send('Success!')
  } else {
    // Likely a bot
    res.status(400).send('Failed reCAPTCHA')
  }
})

app.listen(3000, () => console.log('Server running'))
