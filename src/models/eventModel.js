const db = require("../config/db");

class EventModel {
  static async createEvent(eventData) {
    const {
      name,
      startTime,
      endTime,
      location,
      eventCategory,
      description,
      coverUrl,
      createdByUser,
    } = eventData;

    const query = `
      INSERT INTO events 
      (name, startTime, endTime, location, eventCategory, description, coverUrl, createdByUser)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      name,
      startTime,
      endTime,
      location,
      eventCategory,
      description,
      coverUrl,
      createdByUser,
    ]);

    return result.insertId;
  }

  static async checkEventNameExists(name) {
    const query = `
      SELECT COUNT(*) as count 
      FROM events 
      WHERE name = ?
    `;
    const [rows] = await db.execute(query, [name]);
    return rows[0].count > 0;
  }

  static async getEventById(id) {
    // Cập nhật trạng thái sự kiện trước khi truy vấn
    await this.updateEventStatuses();

    // Truy vấn chi tiết sự kiện
    const query = `
      SELECT 
        e.*,
        u.username as createdByUsername
      FROM events e
      LEFT JOIN users u ON e.createdByUser = u.id
      WHERE e.id = ?
    `;

    // Truy vấn nghệ sĩ cho sự kiện
    const artistQuery = `
      SELECT 
        a.id, 
        a.name, 
        a.avatar, 
        a.role, 
        a.biography
      FROM artists a
      JOIN event_artists ea ON a.id = ea.artistId
      WHERE ea.eventId = ?
    `;

    try {
      // Thực hiện truy vấn sự kiện
      const [eventRows] = await db.execute(query, [id]);

      // Kiểm tra xem sự kiện có tồn tại không
      if (!eventRows.length) {
        return null;
      }

      // Lấy thông tin sự kiện
      const event = eventRows[0];

      // Thực hiện truy vấn nghệ sĩ
      const [artistRows] = await db.execute(artistQuery, [id]);

      // Gán mảng nghệ sĩ vào sự kiện
      event.artists = artistRows;
      return event;
    } catch (error) {
      // Ghi log lỗi chi tiết
      console.error("Error in getEventById:", {
        eventId: id,
        errorMessage: error.message,
        errorStack: error.stack,
      });

      // Ném lỗi để middleware xử lý
      throw error;
    }
  }
  static async updateEventStatuses() {
    const query = `
      UPDATE events 
      SET status = CASE 
        WHEN NOW() >= startTime AND NOW() < endTime THEN 'ongoing'
        WHEN NOW() >= endTime THEN 'completed'
        ELSE 'upcoming'
      END
      WHERE status != CASE 
        WHEN NOW() >= startTime AND NOW() < endTime THEN 'ongoing'
        WHEN NOW() >= endTime THEN 'completed'
        ELSE 'upcoming'
      END
    `;

    await db.execute(query);
  }

  static async getAllEvents({
    page = 1,
    limit = 5,
    search = "",
    status = null,
    eventCategory = null,
    sort = "createdAt",
    order = "DESC",
  }) {
    await this.updateEventStatuses();

    let query = `
      SELECT DISTINCT
        e.*,
        u.username as createdByUsername
      FROM events e
      LEFT JOIN users u ON e.createdByUser = u.id
    `;

    let countQuery = `
      SELECT COUNT(DISTINCT e.id) as total 
      FROM events e
      LEFT JOIN users u ON e.createdByUser = u.id
    `;

    const params = [];
    const conditions = [];

    if (search) {
      conditions.push("(e.name LIKE ? OR e.location LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      conditions.push("e.status = ?");
      params.push(status);
    }

    if (eventCategory) {
      conditions.push("e.eventCategory = ?");
      params.push(eventCategory);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
      countQuery += " WHERE " + conditions.join(" AND ");
    }

    query += ` ORDER BY e.${sort} ${order}`;
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;

    const offset = (page - 1) * limit;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await db.execute(query, params);

    // Separate query to get artists for each event
    const eventsWithArtists = await Promise.all(
      rows.map(async (event) => {
        const [artists] = await db.execute(
          `
        SELECT 
          a.id, 
          a.name, 
          a.avatar, 
          a.role, 
          a.biography
        FROM artists a
        JOIN event_artists ea ON a.id = ea.artistId
        WHERE ea.eventId = ?
      `,
          [event.id]
        );

        return {
          ...event,
          artists: artists,
        };
      })
    );

    return {
      events: eventsWithArtists,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }

  static async updateEvent(id, eventData) {
    const {
      name,
      startTime,
      endTime,
      location,
      eventCategory,
      description,
      coverUrl,
      status,
    } = eventData;

    const query = `
      UPDATE events 
      SET name = ?, 
          startTime = ?, 
          endTime = ?, 
          location = ?, 
          eventCategory = ?, 
          description = ?, 
          coverUrl = ?, 
          status = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.execute(query, [
      name,
      startTime,
      endTime,
      location,
      eventCategory,
      description,
      coverUrl,
      status,
      id,
    ]);
  }

  static async deleteEvent(id) {
    const query = "DELETE FROM events WHERE id = ?";
    await db.execute(query, [id]);
  }
}

module.exports = EventModel;
