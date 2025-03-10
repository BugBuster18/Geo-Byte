require('dotenv').config(); // Add this line to load environment variables

const express = require('express');
const routes = require('./routes/index.route');
const app = express();
const port = 3030; // Fixed port to avoid env issues
const nodemailer = require('nodemailer');
const cors = require('cors');

// Update CORS configuration
app.use(cors({
  origin: '*', // Be more specific in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add debug logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Add error handling middleware before routes
app.use((req, res, next) => {
  res.header('Content-Type', 'application/json');
  next();
});

// Add server status endpoint
app.get('/status', (req, res) => {
  res.json({ status: 'running' });
});

// ! otp

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD // Use the App Password here
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Add a verification step
transporter.verify(function (error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log("Server is ready to send emails");
  }
});

app.post('/send-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'GeoAttend - Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #0061ff; font-size: 32px; letter-spacing: 2px;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

app.use('/', routes);

// Add global error handler at the end
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Update server listen
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});