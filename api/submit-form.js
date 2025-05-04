const axios = require('axios')

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  console.log('Request received:', {
    method: req.method,
    headers: req.headers,
    body: typeof req.body === 'object' ? 'Object received' : 'No body or invalid format'
  })

  // Ensure this is a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      method: req.method
    })
  }

  try {
    // Check if body exists and is properly parsed
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body is empty or not properly formatted',
        receivedBody: req.body
      })
    }

    console.log('Request body keys:', Object.keys(req.body))

    const token = req.body['g-recaptcha-response']

    // Verify the token is present
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA token is missing',
        receivedKeys: Object.keys(req.body)
      })
    }

    console.log('reCAPTCHA token received (first 10 chars):', token.substring(0, 10) + '...')

    // Check if RECAPTCHA_SECRET_KEY is set
    if (!process.env.RECAPTCHA_SECRET_KEY) {
      console.error('RECAPTCHA_SECRET_KEY environment variable is not set')
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      })
    }

    // Verify the reCAPTCHA token with Google
    console.log('Verifying token with Google reCAPTCHA API...')
    const recaptchaResponse = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: token
      }
    })

    console.log('Google reCAPTCHA API response:', recaptchaResponse.data)

    const { success, score } = recaptchaResponse.data

    // Check if verification was successful and score is acceptable
    if (!success || score <= 0.8) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification failed',
        recaptchaResponse: recaptchaResponse.data
      })
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'reCAPTCHA validation successful',
      score: score
    })
  } catch (error) {
    console.error('Error validating reCAPTCHA:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      stack: error.stack
    })
  }
}
