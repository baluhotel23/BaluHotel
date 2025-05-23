const express = require('express');
const router = express.Router();
const getNowColombia = require('../controller/getNowColombia');

router.get('/now-colombia', getNowColombia);

module.exports = router;