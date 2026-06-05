const chatRoomController = require('./chatRoomController');
const chatMessageController = require('./chatMessageController');

module.exports = {
    ...chatRoomController,
    ...chatMessageController
};
