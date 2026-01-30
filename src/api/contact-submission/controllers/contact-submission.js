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
      const { name, email, phone, message } = ctx.request.body.data;

      // Send email notification
      try {
        const transporter = createTransporter();

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: process.env.CONTACT_EMAIL,
          replyTo: email,
          subject: `New Contact Form Submission from ${name}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `,
          text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
Phone: ${phone || "Not provided"}
Message: ${message}
          `.trim(),
        });

        strapi.log.info(`Contact form email sent for submission from ${email}`);
      } catch (err) {
        strapi.log.error("Failed to send contact form email:", err);
        // Don't fail the request if email fails - the submission is still saved
      }

      return response;
    },
  })
);
