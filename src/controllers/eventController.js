const EventModel = require("../models/eventModel");
const db = require("../config/db");
const { bucket } = require("../config/firebase");
const { format } = require("util");
const path = require("path");

class EventController {
  static async createEvent(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { 
        name, 
        startTime, 
        endTime, 
        location, 
        eventCategory, 
        description,
        artistIds = [] // Thêm mảng artistIds
      } = req.body;
      
      const createdByUser = req.user.id;

      // Kiểm tra trùng tên sự kiện
      const eventNameExists = await EventModel.checkEventNameExists(name);
      if (eventNameExists) {
        return res.status(400).json({ message: "An event with this name already exists" });
      }

      let coverUrl = "https://storage.googleapis.com/music-app/default-event.jpg";

      if (req.file) {
        const timestamp = Date.now();
        const fileName = `events/${createdByUser}_${timestamp}_${path.basename(req.file.originalname)}`;
        const blob = bucket.file(fileName);

        const blobStream = blob.createWriteStream({
          metadata: { contentType: req.file.mimetype },
        });

        return new Promise((resolve, reject) => {
          blobStream.on("error", (error) => {
            console.error("Upload error:", error);
            reject(error);
          });

          blobStream.on("finish", async () => {
            try {
              await blob.makePublic();
              coverUrl = format(
                `https://storage.googleapis.com/${bucket.name}/${blob.name}`
              );

              const eventData = {
                name,
                startTime,
                endTime,
                location,
                eventCategory,
                description,
                coverUrl,
                createdByUser,
              };

              const eventId = await EventModel.createEvent(eventData);

              // Thêm nghệ sĩ vào sự kiện
              if (artistIds.length > 0) {
                const artistValues = artistIds.map(artistId => 
                  `(${eventId}, ${artistId})`
                ).join(',');

                await connection.query(
                  `INSERT INTO event_artists (eventId, artistId) VALUES ${artistValues}`
                );
              }

              await connection.commit();

              resolve(
                res.status(201).json({
                  message: "Event created successfully",
                  eventId,
                  eventData,
                  artists: artistIds
                })
              );
            } catch (error) {
              await connection.rollback();
              reject(error);
            }
          });

          blobStream.end(req.file.buffer);
        });
      } else {
        const eventData = {
          name,
          startTime,
          endTime,
          location,
          eventCategory,
          description,
          coverUrl,
          createdByUser,
        };

        const eventId = await EventModel.createEvent(eventData);

        // Thêm nghệ sĩ vào sự kiện
        if (artistIds.length > 0) {
          const artistValues = artistIds.map(artistId => 
            `(${eventId}, ${artistId})` // Sử dụng eventId được trả về từ createEvent
          ).join(',');
        
          await connection.query(
            `INSERT INTO event_artists (eventId, artistId) VALUES ${artistValues}`
          );
        }

        await connection.commit();

        res.status(201).json({
          message: "Event created successfully",
          eventId,
          artists: artistIds
        });
     
      }
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }

  static async getEvent(req, res) {
    try {
      const { id } = req.params;
      const event = await EventModel.getEventById(id);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.status(200).json(event);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  static async getAllEvents(req, res) {
    try {
      const { page, limit, search, status, eventCategory, sort, order } =
        req.query;

      const result = await EventModel.getAllEvents({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 5,
        search,
        status,
        eventCategory,
        sort,
        order,
      });

      res.status(200).json({
        message: "Events retrieved successfully",
        ...result,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  static async updateEvent(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const {
        name,
        startTime,
        endTime,
        location,
        eventCategory,
        description,
        status,
        artistIds = [] // Thêm mảng artistIds
      } = req.body;

      let coverUrl = req.body.coverUrl;

      // Xóa các nghệ sĩ cũ
      await connection.query(
        'DELETE FROM event_artists WHERE eventId = ?', 
        [id]
      );

      // Thêm nghệ sĩ mới nếu có
      if (artistIds.length > 0) {
        const artistValues = artistIds.map(artistId => 
          `(${id}, ${artistId})` // Sử dụng id từ req.params
        ).join(',');
      
        await connection.query(
          `INSERT INTO event_artists (eventId, artistId) VALUES ${artistValues}`
        );
      }

      // Phần còn lại của logic update event như cũ...
      if (req.file) {
        // Upload logic giữ nguyên như trước
        const timestamp = Date.now();
        const fileName = `events/${req.user.id}_${timestamp}_${path.basename(
          req.file.originalname
        )}`;
        const blob = bucket.file(fileName);

        const blobStream = blob.createWriteStream({
          metadata: { contentType: req.file.mimetype },
        });

        return new Promise((resolve, reject) => {
          blobStream.on("error", (error) => {
            console.error("Upload error:", error);
            reject(error);
          });

          blobStream.on("finish", async () => {
            try {
              await blob.makePublic();
              coverUrl = format(
                `https://storage.googleapis.com/${bucket.name}/${blob.name}`
              );

              const eventData = {
                name,
                startTime,
                endTime,
                location,
                eventCategory,
                description,
                coverUrl,
                status,
              };

              await EventModel.updateEvent(id, eventData);

              await connection.commit();

              resolve(
                res.status(200).json({
                  message: "Event updated successfully",
                  coverUrl,
                  artists: artistIds
                })
              );
            } catch (error) {
              await connection.rollback();
              reject(error);
            }
          });

          blobStream.end(req.file.buffer);
        });
      } else {
        const eventData = {
          name,
          startTime,
          endTime,
          location,
          eventCategory,
          description,
          coverUrl,
          status,
        };

        await EventModel.updateEvent(id, eventData);
        await connection.commit();

        res.status(200).json({ 
          message: "Event updated successfully",
          artists: artistIds
        });
      }
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }

  static async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      await EventModel.deleteEvent(id);
      res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
}

module.exports = EventController;
