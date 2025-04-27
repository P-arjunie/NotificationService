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

const sendStatusEmail = async (order, status) => {
  // Email content customization based on status
  let subject, heading, statusMessage, statusColor, emoji;
  
  if (status === 'Accepted') {
    subject = `BiteSpeed: Your order has been accepted! 🎉`;
    heading = `Thanks for your order!`;
    statusMessage = `Your order for <strong>${order.itemName}</strong> has been <span style="color:#FF6B00;"><strong>accepted</strong></span> and is being prepared for you.`;
    statusColor = '#FF6B00'; // BiteSpeed orange
    emoji = '✅';
  } else if (status === 'Delivered') {
    subject = `BiteSpeed: Your order has been delivered! 🎉`;
    heading = `Enjoy your meal!`;
    statusMessage = `Your order for <strong>${order.itemName}</strong> has been <span style="color:#FF6B00;"><strong>delivered</strong></span>. We hope you enjoy it!`;
    statusColor = '#FF6B00'; // BiteSpeed orange
    emoji = '🛵';
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: order.email || 'example@fallback.com',
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; border: 2px solid #FF6B00;">
        <div style="text-align: center; padding: 15px 0; background-color: #FF6B00; color: white; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px;">BiteSpeed ${emoji}</h1>
          <p style="margin: 5px 0 0 0; font-size: 16px;">Fast Food, Faster Delivery!</p>
        </div>
        
        <h2 style="color: #333; margin-bottom: 20px;">Hey ${order.customerName}! ${heading}</h2>
        
        <div style="background-color: #FFF4EA; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="font-size: 16px; line-height: 1.5;">${statusMessage}</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: ${statusColor}; margin-top: 0;">Order Details:</h3>
          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Item:</strong> ${order.itemName}</p>
          <p><strong>Driver:</strong> ${order.driverName || 'To be assigned'}</p>
          <p><strong>Delivery Address:</strong> ${order.address}</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 14px;">Thanks for choosing BiteSpeed!</p>
          <p style="color: #888; font-size: 12px;">© 2025 BiteSpeed - All rights reserved</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ ${status} email sent to ${order.customerName}`);
  } catch (err) {
    console.error(`❌ ${status} email failed:`, err.message);
  }
};

const watchOrderChanges = async () => {
  const db = await connectToMongo();
  const orders = db.collection('orders');

  console.log('👀 Watching for status updates in orders...');

  // Watch for both "Accepted" and "Delivered" status changes
  const changeStream = orders.watch([
    {
      $match: {
        $or: [
          { 'updateDescription.updatedFields.status': 'Accepted' },
          { 'updateDescription.updatedFields.status': 'Delivered' }
        ]
      },
    },
  ]);

  changeStream.on('change', async (change) => {
    const orderId = change.documentKey._id;
    const updatedOrder = await orders.findOne({ _id: orderId });
    
    if (updatedOrder) {
      const newStatus = updatedOrder.status;
      if (newStatus === 'Accepted' || newStatus === 'Delivered') {
        await sendStatusEmail(updatedOrder, newStatus);
      }
    }
  });
};

module.exports = watchOrderChanges;