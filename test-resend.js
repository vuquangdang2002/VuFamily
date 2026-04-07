require('dotenv').config();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
    try {
        console.log("Sending email with API key: ", process.env.RESEND_API_KEY);
        const data = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: process.env.ADMIN_EMAIL,
            subject: 'Test Email',
            html: '<p>Test email from VuFamily app.</p>'
        });
        console.log("Success: ", data);
    } catch (e) {
        console.error("Error: ", e);
    }
}
test();
