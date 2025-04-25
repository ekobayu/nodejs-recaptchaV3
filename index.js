const axios = require('axios')

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', 'https://bullseye-bali-website.webflow.io')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Ensure this is a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { 'g-recaptcha-response': token, ...formData } = req.body

    // Verify the token is present
    if (!token) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA token is missing' })
    }

    // Verify the reCAPTCHA token with Google
    const recaptchaResponse = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: token
      }
    })

    const { success, score } = recaptchaResponse.data

    // Check if verification was successful and score is acceptable
    if (!success || score < 0.5) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification failed',
        debug: process.env.NODE_ENV === 'development' ? recaptchaResponse.data : undefined
      })
    }

    // Process the form data here
    // For example, send an email, store in database, etc.
    console.log('Form data:', formData)

    // Return success response
    return res.status(200).json({ success: true, message: 'Form submitted successfully' })
  } catch (error) {
    console.error('Error validating reCAPTCHA:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}
