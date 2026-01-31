"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const nodemailer = require("nodemailer");

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

module.exports = createCoreController(
  "api::contact-submission.contact-submission",
  ({ strapi }) => ({
    async create(ctx) {
      // Create the contact submission entry
      const response = await super.create(ctx);

      // Get the submitted data
      const { firstName, lastName, email, phone, preferredReading, referral, message } = ctx.request.body.data;
      const fullName = `${firstName} ${lastName}`;

      // Send email notification (fire-and-forget, don't block response)
      const transporter = createTransporter();
      transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.CONTACT_EMAIL,
        replyTo: email,
        subject: `New Contact Form Submission from ${fullName}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <p><strong>Preferred Reading:</strong> ${preferredReading}</p>
          <p><strong>Referral:</strong> ${referral || "Not provided"}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
        text: `
New Contact Form Submission

Name: ${fullName}
Email: ${email}
Phone: ${phone || "Not provided"}
Preferred Reading: ${preferredReading}
Referral: ${referral || "Not provided"}
Message: ${message}
        `.trim(),
      }).then(() => {
        strapi.log.info(`Contact form email sent for submission from ${email}`);
      }).catch((err) => {
        strapi.log.error("Failed to send contact form email:", err);
      });

      return response;
    },
  })
);
