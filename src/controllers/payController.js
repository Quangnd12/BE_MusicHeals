const stripeInstance = require('../config/stripe');
const db = require('../config/db');
const cron = require('node-cron');
const PaymentModel = require("../models/paymentModel");
const moment = require('moment');
const nodemailer = require('nodemailer');

const Payment = async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amount * 100,
      currency: 'usd',
      payment_method_types: ['card'],
    });
    console.log('Payment Intent:', paymentIntent);
    res.send({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error('Lỗi khi tạo PaymentIntent:', error.message);
    res.status(500).send({ error: error.message });
  }
};

const getAllPayment = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const searchName = req.query.searchName || '';

  if (!page && !limit) {
    try {
      const payment = await PaymentModel.getAllPayment(false, null, null, searchName);
      return res.status(200).json({ payment });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error retrieving payment', error: error.message });
    }
  }

  if (page < 1 || limit < 1) {
    return res.status(400).json({ message: 'Page and limit must be greater than 0.' });
  }

  try {

    let payment;
    if (!req.query.page || !req.query.limit) {
      payment = await PaymentModel.getAllPayment(false, null, null, searchName);
      return res.status(200).json({ payment });
    }

    payment = await PaymentModel.getAllPayment(true, page, limit, searchName);
    const totalCount = await PaymentModel.getCount();
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      payment,
      totalPages,
      totalCount,
      limit,
      currentPage: page
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error retrieving payment', error: error.message });
  }
};


const addPayments = async (req, res) => {
  try {
    const subscription_date = moment().format('YYYY-MM-DD HH:mm:ss');
    const expiry_date = moment().add(1, 'months').format('YYYY-MM-DD HH:mm:ss');
    const { amount } = req.body;
    const user_id = req.user.id;
    const email = req.user.email;
    const paymentData = {
      user_id,
      amount: amount * 100,
      status: 1,
      subscription_date,
      expiry_date,
      is_notified: 0
    };
    const checkUser = await PaymentModel.getPaymentByUser(user_id);
    if (checkUser) {
      return res.status(400).json({ message: 'Payment record already exists for this user' });
    }
    const PayId = await PaymentModel.addPayment(paymentData);
    await sendBill(email, paymentData.amount, paymentData.subscription_date, paymentData.expiry_date);
    console.log('Bill sent successfully.');

    res.status(200).json({ id: PayId, ...paymentData });

  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Error creating payment', error: error.message });
  }
};

const renewPayments = async (req, res) => {
  try {
    const subscription_date = moment().format('YYYY-MM-DD HH:mm:ss');
    const expiry_date = moment().add(1, 'months').format('YYYY-MM-DD HH:mm:ss');
    const user_id = req.user.id;
    const paymentData = {
      is_notified: 0,
      subscription_date,
      expiry_date,
    };

    const checkUser = await PaymentModel.getPaymentByUser(user_id);

    const bill = {
      amount: checkUser.amount / 100,
      subscription_date: checkUser.subscription_date,
      email: checkUser.email
    }

    const PayId = await PaymentModel.Renew(user_id, paymentData);
    await sendBill(bill.email, bill.amount, paymentData.subscription_date, paymentData.expiry_date);
    console.log('Bill sent successfully.');

    res.status(200).json({ id: PayId, ...paymentData });

  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Error creating payment', error: error.message });
  }
};

const getPaymentByUser = async (req, res) => {
  try {
    const user_id = req.user.id;
    const payment = await PaymentModel.getPaymentByUser(user_id);

    if (!payment || payment.length === 0) {
      return res.json([]);
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving payment', error: error.message });
  }
};



const updateExpiringPayments = async () => {
  try {
    const expiringPayments = await PaymentModel.getExpiringPayments();
    if (expiringPayments.length > 0) {
      for (const payment of expiringPayments) {
        const user = await PaymentModel.getPaymentByUser(payment.user_id);

        if (user && user.email) {
          if (user.is_notified === 0) {
            await sendNotification(user.email);
            await PaymentModel.UpdateIsNotified(payment.user_id);
          }
        }
      }
      console.log("Notifications have been sent to users with expiring subscriptions.");
    }
    const expiredPayments = await PaymentModel.UpdatePayment();

    if (expiredPayments.length > 0) {
      for (const payment of expiredPayments) {
        const user = await PaymentModel.getPaymentByUser(payment.user_id);

        if (user && user.email) {
          await sendNotification(user.email);
        }
        await PaymentModel.DeletePayment(payment.user_id);
        await sendCancelPayment(user.email);
        console.log(`Payment record for user ${payment.user_id} has been deleted.`);
      }
      console.log("Expired payments have been removed successfully.");
    } else {
      console.log("No expired payments to delete.");
    }
  } catch (error) {
    console.error("Error checking or removing expired payments:", error);
  }
};


cron.schedule('0 0 * * *', async () => {
  await updateExpiringPayments();
});


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendNotification = async (userEmail) => {
  try {
    const mailOptions = {
      from: `"Music Heals" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: 'Thời gian sử dụng Premium của bạn sắp hết!',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f7fc; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto;">
          <div style="background-color: #1a73e8; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Music Heals</h1>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1a73e8;">Thời gian sử dụng Premium của bạn sắp hết!</h2>
            <p style="font-size: 16px; line-height: 1.5; color: #333333;">
              Thời gian sử dụng gói Premium của bạn sẽ hết hạn trong <strong>3 ngày</strong>. Hãy cân nhắc gia hạn hoặc hủy gói đăng ký của bạn.
            </p>
            <p style="font-size: 16px; line-height: 1.5; color: #333333;">
              Nếu bạn muốn gia hạn đăng ký, hãy nhấn vào nút bên dưới:
            </p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.CLIENT_URL}/upgrade" style="text-decoration: none; background-color: #1a73e8; color: white; padding: 12px 25px; border-radius: 4px; font-size: 16px;">
                Gia Hạn Ngay
              </a>
            </div>
            <p style="font-size: 14px; line-height: 1.5; color: #777777; margin-top: 20px;">
              Nếu bạn quyết định không gia hạn, tài khoản của bạn sẽ chuyển về gói miễn phí.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <p style="font-size: 14px; color: #999999;">
              Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email: <a href="mailto:${process.env.EMAIL_SUPPORT}" style="color: #1a73e8;">${process.env.EMAIL_SUPPORT}</a>.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Notification sent to:', userEmail);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

const sendCancelPayment = async (userEmail) => {
  try {
    const mailOptions = {
      from: `"Music Heals" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: 'Gói Premium của bạn đã bị hủy!',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f7fc; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto;">
          <div style="background-color: #1a73e8; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Music Heals</h1>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #e63946;">Gói Premium của bạn đã bị hủy!</h2>
            <p style="font-size: 16px; line-height: 1.5; color: #333333;">
              Chúng tôi rất tiếc khi bạn quyết định hủy gói Premium. Từ giờ, tài khoản của bạn sẽ chuyển về gói miễn phí với các tính năng cơ bản.
            </p>
            <p style="font-size: 16px; line-height: 1.5; color: #333333;">
              Nếu bạn thay đổi quyết định và muốn tiếp tục sử dụng gói Premium, bạn có thể đăng ký lại bất cứ lúc nào bằng cách nhấn vào nút bên dưới:
            </p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.CLIENT_URL}/login" style="text-decoration: none; background-color: #1a73e8; color: white; padding: 12px 25px; border-radius: 4px; font-size: 16px;">
                Đăng Ký Lại Premium
              </a>
            </div>
            
          </div>
          <div style="text-align: center; margin-top: 20px;">
          <p style="font-size: 14px; color: #999999;">
          Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email: <a href="mailto:${process.env.EMAIL_SUPPORT}" style="color: #1a73e8;">${process.env.EMAIL_SUPPORT}</a>.
        </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Cancellation notification sent to:', userEmail);
  } catch (error) {
    console.error('Error sending cancellation notification:', error);
  }
};


const sendBill = async (userEmail, amount, subscription_date, expiry_date) => {
  try {
    const money = amount / 100;
    const mailOptions = {
      from: `"Music Heals" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: 'Chúc mừng! Bạn đã nâng cấp lên gói Premium thành công 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #1a73e8; text-align: center;">🎵 Music Heals - Premium Activation</h2>
          <p>Xin chào <strong>${userEmail}</strong>,</p>
          <p>Chúng tôi rất vui khi bạn đã nâng cấp lên gói <strong>Premium</strong>. Dưới đây là thông tin giao dịch của bạn:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Gói dịch vụ</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">Premium</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Số tiền</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${money} USD</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Phương thức thanh toán</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">Thanh toán online</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Ngày thanh toán</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${subscription_date}</td>
            </tr>
               <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Ngày hết hạn</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${expiry_date}</td>
            </tr>
          </table>
          <p style="color: #333;">Hãy đăng nhập vào tài khoản của bạn và tận hưởng âm nhạc không giới hạn cùng nhiều lợi ích từ gói Premium:</p>
          <ul style="color: #333; line-height: 1.6;">
            <li>Nghe nhạc không quảng cáo.</li>
            <li>Tải xuống bài hát để nghe offline.</li>
            <li>Chất lượng âm thanh cao hơn.</li>
          </ul>
          <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua email: <a href="mailto:${process.env.EMAIL_SUPPORT}" style="color: #1a73e8;">${process.env.EMAIL_SUPPORT}</a>.</p>
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL}" style="background-color: #1a73e8; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Khám phá ngay</a>
          </p>
          <p style="text-align: center; margin-top: 20px; color: #888;">© 2024 Music Heals. All rights reserved.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Notification sent to:', userEmail);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};


module.exports = { Payment, updateExpiringPayments, addPayments, getPaymentByUser, renewPayments,getAllPayment };
