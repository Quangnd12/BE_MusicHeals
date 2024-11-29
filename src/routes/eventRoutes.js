const express = require('express');
const EventController = require('../controllers/eventController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

const router = express.Router();

router.use(authMiddleware);

router.post('/', upload.single('coverImage'), EventController.createEvent);
router.get('/', EventController.getAllEvents);
router.get('/:id', EventController.getEvent);
router.put('/:id', upload.single('coverImage'), EventController.updateEvent);
router.delete('/:id', EventController.deleteEvent);


module.exports = router;