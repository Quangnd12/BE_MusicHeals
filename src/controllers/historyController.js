const HistorySongModel = require('../models/historyModel');

// Lấy tất cả lịch sử nghe
const getAllListeningHistories = async (req, res) => {
  try {
    const listeningHistories = await HistorySongModel.getAllHistory();
    return res.status(200).json(listeningHistories);
  } catch (error) {
    console.error('Error retrieving listening histories:', error);
    return res.status(500).json({ message: 'Error retrieving listening histories', error: error.message });
  }
};

// Lấy lịch sử nghe theo ID
const getListeningHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const listeningHistory = await HistorySongModel.getHistoryById(id);

    if (!listeningHistory) {
      return res.status(404).json({ message: 'Listening history not found' });
    }

    res.json(listeningHistory);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving listening history', error: error.message });
  }
};

// Thêm lịch sử nghe
const createListeningHistory = async (req, res) => {
  try {
    const { songID } = req.body;
    const userID = req.user.id;

    if (!userID || !songID) {
      return res.status(400).json({ message: 'userID, songID are required' });
    }

    const checkHistory = await HistorySongModel.getHistoryById(userID)
    if (checkHistory) {
      return res.status(400).json({ message: 'History record already exists for this user' });
    }
    const newHistory = { userID, songID };
    const historyId = await HistorySongModel.createHistory(newHistory);
    res.status(200).json({ id: historyId, ...newHistory });

  } catch (error) {
    console.error('Error creating listening history:', error);
    res.status(500).json({ message: 'Error creating listening history', error: error.message });
  }
};



module.exports = {
  getAllListeningHistories,
  getListeningHistoryById,
  createListeningHistory,

};
