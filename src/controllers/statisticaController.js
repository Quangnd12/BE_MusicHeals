const StatisticalModel = require('../models/statisticalModel');

// Controller để lấy tổng số tiền theo tháng
const getRevenueByMonth = async (req, res) => {
    try {
      const { year } = req.params; // Lấy năm từ params
      const revenue = await StatisticalModel.getRevenueByMonth(year);
  
      if (!revenue || revenue.length === 0) {
        return res.status(404).json({ message: 'No data found for the given year' });
      }
  
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving revenue by month', error: error.message });
    }
  };

// Controller để lấy tổng số tiền theo năm
const getTotalAmountByYear = async (req, res) => {
  try {
    const { year } = req.params;
    const totalAmount = await StatisticalModel.getTotalAmountByYear(year);

    // Kiểm tra nếu không có dữ liệu
    if (totalAmount === 0) {
      return res.status(404).json({ message: 'No data found for this year' });
    }

    // Trả về dữ liệu tổng số tiền
    res.json({ totalAmount });
  } catch (error) {
    // Xử lý lỗi và trả về thông báo lỗi
    res.status(500).json({ message: 'Error retrieving total amount by year', error: error.message });
  }
};

module.exports = { 
 getRevenueByMonth,
  getTotalAmountByYear 
};
