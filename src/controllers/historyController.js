const HistorySongModel = require('../models/historyModel');

// Lấy tất cả lịch sử nghe
const getAllListeningHistories = async (req, res) => {
  try {
    const listeningHistories = await HistorySongModel.getAllHistory();
    return res.status(200).json({
      success: true,
      data: listeningHistories
    });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử nghe:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Lỗi khi lấy lịch sử nghe', 
      error: error.message 
    });
  }
};


// Lấy lịch sử nghe theo ID
const getListeningHistoryById = async (req, res) => {
  try {
    const {id} = req.params;
    const history = await HistorySongModel.getHistoryById(id);

    if (!history || history.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy lịch sử nghe' 
      });
    }

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi lấy lịch sử nghe', 
      error: error.message 
    });
  }
};

const createListeningHistory = async (req, res) => {
  try {
    const { userID, songID } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!userID || !songID) {
      return res.status(400).json({ 
        success: false,
        message: 'userID và songID không được để trống' 
      });
    }

    // Kiểm tra xem lịch sử đã tồn tại chưa
    const existingHistory = await HistorySongModel.checkExistingHistory(userID, songID);
    if (existingHistory) {
      return res.status(400).json({
        success: false,
        message: 'Lịch sử nghe nhạc này đã tồn tại'
      });
    }

    const newHistory = { userID, songID };
    const result = await HistorySongModel.createHistory(newHistory);
    
    res.status(201).json({ 
      success: true,
      message: 'Đã thêm lịch sử nghe nhạc thành công',
      data: {
        id: result.insertId,
        ...newHistory,
        listeningDate: new Date()
      }
    });

  } catch (error) {
    console.error('Lỗi khi tạo lịch sử nghe:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi tạo lịch sử nghe', 
      error: error.message 
    });
  }
};

const softDeleteListeningHistory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID lịch sử không được để trống'
            });
        }

        await HistorySongModel.softDeleteHistory(id);

        return res.status(200).json({
            success: true,
            message: 'Đã xóa lịch sử nghe nhạc thành công'
        });

    } catch (error) {
        console.error('Lỗi khi xóa lịch sử nghe:', error);
        
        if (error.message === 'Không tìm thấy lịch sử nghe hoặc đã bị xóa') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa lịch sử nghe',
            error: error.message
        });
    }
};

const softDeleteAllListeningHistory = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'ID người dùng không được để trống'
            });
        }

        await HistorySongModel.softDeleteAllHistory(userId);

        return res.status(200).json({
            success: true,
            message: 'Đã xóa tất cả lịch sử nghe nhạc thành công'
        });

    } catch (error) {
        console.error('Lỗi khi xóa tất cả lịch sử nghe:', error);
        
        if (error.message === 'Không tìm thấy lịch sử nghe hoặc đã bị xóa') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa tất cả lịch sử nghe',
            error: error.message
        });
    }
};

module.exports = {
  getAllListeningHistories,
  getListeningHistoryById,
  createListeningHistory,
  softDeleteListeningHistory,
  softDeleteAllListeningHistory
};
