const db = require('../config/db');

class StatisticalModel {

  // Lấy tổng số tiền trong tháng hiện tại
  static async getRevenueByMonth(year) {
    const query = `
      SELECT 
        MONTH(subscription_date) AS month, 
        SUM(amount) AS total_amount 
      FROM payments 
      WHERE YEAR(subscription_date) = ? 
      GROUP BY MONTH(subscription_date)
      ORDER BY MONTH(subscription_date)
    `;
    const [rows] = await db.execute(query, [year]);
    return rows;
  }

  // Lấy tổng số tiền trong năm hiện tại
  static async getTotalAmountByYear(year) {
    const query = `
      SELECT SUM(amount) as total
      FROM payments
      WHERE YEAR(subscription_date) = ?
    `;
    const [rows] = await db.execute(query,[year]);
    return rows[0].total || 0; // Trả về 0 nếu không có dữ liệu
  }

}

module.exports = StatisticalModel;
