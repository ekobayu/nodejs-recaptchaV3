const axios = require('axios')
const FormData = require('form-data')

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*') // Or your specific domain
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Ensure this is a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    })
  }

  try {
    // Extract form data and metadata
    const { 'g-recaptcha-response': token, _formName, _formId, _siteId, _redirect, _source, ...formFields } = req.body

    // Verify the token is present
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA token is missing'
      })
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
        score: score
      })
    }

    // reCAPTCHA validation passed, now submit to Webflow
    console.log('reCAPTCHA validation successful, submitting to Webflow')

    // Create form data for Webflow submission
    const formData = new FormData()

    // Add all form fields
    Object.entries(formFields).forEach(([key, value]) => {
      formData.append(key, value)
    })

    // Add required Webflow fields
    formData.append('name', _formName)
    formData.append('source', _source)
    formData.append('test', false)
    formData.append('dolphin', false)

    // Determine the Webflow endpoint
    const siteId = _siteId || 'bullseye-bali-website'
    const webflowEndpoint = `https://webflow.com/api/v1/form/${siteId}`

    console.log(`Submitting to Webflow endpoint: ${webflowEndpoint}`)

    // Submit to Webflow
    const webflowResponse = await axios.post(webflowEndpoint, formData, {
      headers: {
        ...formData.getHeaders(),
        Origin: 'https://bullseye-bali-website.webflow.io'
      }
    })

    console.log('Webflow response:', webflowResponse.data)

    // Return success response with redirect if available
    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully',
      redirect: _redirect || webflowResponse.data?.redirect || null
    })
  } catch (error) {
    console.error('Error processing form:', error)

    // Provide detailed error information
    const errorMessage = error.response?.data?.err || error.message || 'Unknown error'
    const statusCode = error.response?.status || 500

    return res.status(statusCode).json({
      success: false,
      message: `Error: ${errorMessage}`,
      details: error.response?.data || null
    })
  }
}
