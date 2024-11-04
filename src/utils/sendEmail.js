const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
  try {
    // Tạo transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD 
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Cấu hình email
    const mailOptions = {
      from: {
        name: 'Music Heals Support',
        address: process.env.EMAIL_USERNAME
      },
      to: to,
      subject: subject,
      html: html
    };

    // Gửi email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;

  } catch (error) {
    console.error('Send email error: ', error);
    throw new Error('Failed to send email');
  }
};

module.exports = sendEmail;