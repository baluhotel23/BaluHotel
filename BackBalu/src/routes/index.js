const { Router } = require('express');

const router = Router();


router.use("/user", require("./authRoutes"));
//router.use("/permission", require("./permissionRouter"));

                                                                                                                                                           
module.exports = router;