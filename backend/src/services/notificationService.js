const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

let ioInstance = null;

// Inject Socket.io instance from app lifecycle
const setIoInstance = (io) => {
  ioInstance = io;
};

// Dispatch a notification
const dispatchNotification = async ({ recipient, recipientRole, title, message, type, metadata = {} }) => {
  try {
    const notification = await Notification.create({
      recipient,
      recipientRole: recipientRole || 'All',
      title,
      message,
      type,
      metadata,
    });

    if (ioInstance) {
      // If it's for a specific user, emit to user's private channel
      if (recipient) {
        ioInstance.to(`user:${recipient.toString()}`).emit('notification:new', notification);
      }
      
      // Emit to role room
      if (recipientRole && recipientRole !== 'All') {
        ioInstance.to(`role:${recipientRole}`).emit('notification:new', notification);
      } else if (!recipient) {
        // Emit to all connected
        ioInstance.emit('notification:new', notification);
      }
    }
    
    return notification;
  } catch (error) {
    console.error('Error dispatching notification:', error);
  }
};

// Log user activities
const logActivity = async ({ user, action, details, ipAddress = '' }) => {
  try {
    await ActivityLog.create({
      user,
      action,
      details,
      ipAddress,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

module.exports = {
  setIoInstance,
  dispatchNotification,
  logActivity,
};
