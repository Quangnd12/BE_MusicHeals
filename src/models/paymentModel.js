const db = require('../config/db');

class PaymentModel {

  static async addPayment(data) {

    const { user_id, amount, status, subscription_date, expiry_date, is_notified } = data;

    const query = 'INSERT INTO payments (user_id, amount, status, subscription_date, expiry_date,	is_notified) VALUES (?, ?, ?, ?, ?, ?)';
    const [result] = await db.execute(query, [user_id, amount, status, subscription_date, expiry_date, is_notified]);

    return result.insertId;
  }

  static async UpdatePayment() {
    const query = `SELECT user_id FROM payments WHERE expiry_date < NOW()`;
    const [rows] = await db.execute(query);
    return rows;
  }

  static async UpdateIsNotified(id) {
    const query = `UPDATE  payments SET is_notified = 1 WHERE user_id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows;
  }

  static async getPaymentByUser(id) {
    const query = `SELECT users.username, users.email,users.id, payments.*  FROM payments JOIN users ON payments.user_id=users.id WHERE payments.user_id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  static async DeletePayment(id) {
    const query = `DELETE FROM payments WHERE user_id = ?`;
    await db.execute(query, [id]);
  }

    static async Renew(id,data) {
      const {is_notified, subscription_date, expiry_date} = data;
    const query = `UPDATE payments SET 	is_notified = ? , subscription_date = ?, expiry_date = ? WHERE user_id = ?
    `;
    const [rows] = await db.execute(query, [is_notified, subscription_date,expiry_date, id]);
    return rows;
  }

  static async getExpiringPayments() {
    const query = `
    SELECT * FROM payments 
    WHERE DATEDIFF(expiry_date, NOW()) <= 3
    `;
    const [rows] = await db.execute(query);
    return rows;
  }


}

module.exports = PaymentModel;
