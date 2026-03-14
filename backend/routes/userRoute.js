const router = require('express').Router()
const userController = require('../controllers/userController')

router.delete('/delete/:id', userController.deleteUser)
router.get('/getUser/:id', userController.getUser)
router.post('/save-push-token', userController.savePushToken);

module.exports = router