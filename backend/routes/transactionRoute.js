const router = require('express').Router()
const transactionController = require('../controllers/transactionController')

router.get('/:userId', transactionController.getTransactionsByUser)

module.exports = router