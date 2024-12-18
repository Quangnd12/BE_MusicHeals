const db = require('../config/db');

class PaymentModel {

  static async addPayment(data) {

    const { user_id, amount, status, subscription_date, expiry_date, is_notified } = data;

    const query = 'INSERT INTO payments (user_id, amount, status, subscription_date, expiry_date,	is_notified) VALUES (?, ?, ?, ?, ?, ?)';
    const [result] = await db.execute(query, [user_id, amount, status, subscription_date, expiry_date, is_notified]);

    return result.insertId;
  }

  static async UpdatePayment() {
    const query = `UPDATE payments SET status = 0 WHERE expiry_date < NOW() AND status = 1`;
    const [result] = await db.execute(query);
    return result;
  }

  static async UpdateIsNotified(id) {
    const query = `UPDATE  payments SET is_notified = 1 WHERE user_id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows;
  }

  static async getPaymentByUser(id) {
    const query = `SELECT users.username, users.email,users.id, payments.* ,payments.id as payment_id  FROM payments JOIN users ON payments.user_id=users.id WHERE payments.user_id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  static async getAllPayment(pagination = false, page, limit, searchName) {
    let query = `SELECT users.username, users.email, users.id, payments.* ,payments.id as payment_id FROM payments JOIN users ON payments.user_id = users.id`;
    const conditions = [];

    if (searchName) {
      conditions.push(`users.username LIKE ?`); 
    }
  
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
  
    if (pagination) {
      const offset = (page - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }
  
    const params = [];
    if (searchName) params.push(`%${searchName}%`); 
    const [rows] = await db.execute(query, params);
    return rows;
  }
  

  static async getCount() {
    const query = 'SELECT COUNT(*) as count FROM payments';
    const [rows] = await db.execute(query);
    return rows[0].count;
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
