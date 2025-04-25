const { client, connectToMongo } = require('./db');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (order) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: order.email || 'example@fallback.com',
    subject: `Your order "${order.itemName}" is accepted!`,
    html: `
      <h2>Hello ${order.customerName},</h2>
      <p>Your order for <strong>${order.itemName}</strong> has been <span style="color:green;"><strong>accepted</strong></span>.</p>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p>Driver: ${order.driverName}</p>
      <p>Location: ${order.address}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${order.customerName}`);
  } catch (err) {
    console.error('❌ Email failed:', err.message);
  }
};

const watchOrderChanges = async () => {
  const db = await connectToMongo();
  const orders = db.collection('orders');

  console.log('👀 Watching for "accepted" status updates in orders...');

  const changeStream = orders.watch([
    {
      $match: {
        'updateDescription.updatedFields.status': 'accepted',
      },
    },
  ]);

  changeStream.on('change', async (change) => {
    const orderId = change.documentKey._id;
    const updatedOrder = await orders.findOne({ _id: orderId });
    if (updatedOrder) await sendEmail(updatedOrder);
  });
};

module.exports = watchOrderChanges;
