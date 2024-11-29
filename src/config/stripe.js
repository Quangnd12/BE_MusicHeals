const stripe = require('stripe');

// Tạo instance của Stripe với Stripe Secret Key từ biến môi trường
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

// Kiểm tra kết nối với Stripe bằng cách gọi API đơn giản
const checkStripeConnection = async () => {
    try {
      const response = await stripeInstance.balance.retrieve();
      console.log('Kết nối Stripe thành công!', response);
    } catch (error) {
      console.error('Kết nối Stripe thất bại:', error.message);
    }
  };
  

// Gọi hàm kiểm tra kết nối Stripe
checkStripeConnection();

module.exports = stripeInstance;
