const axios = require('axios')
const FormData = require('form-data')
const { URLSearchParams } = require('url')

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

    console.log('Received form data:', {
      token: token ? `${token.substring(0, 10)}...` : 'missing',
      formName: _formName,
      formId: _formId,
      siteId: _siteId,
      fields: Object.keys(formFields)
    })

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

    // Use URLSearchParams instead of FormData for Webflow submission
    const params = new URLSearchParams()

    // Add all form fields
    Object.entries(formFields).forEach(([key, value]) => {
      params.append(key, value)
    })

    // Add required Webflow fields
    params.append('name', _formName || '')
    params.append('source', _source || '')
    params.append('test', 'false')
    params.append('dolphin', 'false')

    // Determine the Webflow endpoint
    const siteId = _siteId || 'bullseye-bali-website'
    const webflowEndpoint = `https://webflow.com/api/v1/form/${siteId}`

    console.log(`Submitting to Webflow endpoint: ${webflowEndpoint}`)
    console.log('Form data being sent:', params.toString())

    // Submit to Webflow
    const webflowResponse = await axios.post(
      webflowEndpoint,
      params.toString(), // Convert URLSearchParams to string
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: 'https://bullseye-bali-website.webflow.io'
        }
      }
    )

    console.log('Webflow response:', webflowResponse.data)

    // Return success response with redirect if available
    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully',
      redirect: _redirect || (webflowResponse.data && webflowResponse.data.redirect) || null
    })
  } catch (error) {
    console.error('Error processing form:', error)

    // Provide detailed error information
    let errorMessage = 'Unknown error'
    let errorDetails = null

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = `Server responded with error: ${error.response.status}`
      errorDetails = {
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from server'
      errorDetails = {
        request: 'Request was sent but no response was received'
      }
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message
      errorDetails = {
        stack: error.stack
      }
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      details: errorDetails
    })
  }
}
