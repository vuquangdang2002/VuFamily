// Error handling middleware
function errorHandler(err, req, res, next) {
    console.error('❌ Server Error:', err.message);

    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Đã xảy ra lỗi server'
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
}

// Not found middleware
function notFound(req, res) {
    res.status(404).json({
        success: false,
        error: `Không tìm thấy route: ${req.method} ${req.originalUrl}`
    });
}

module.exports = { errorHandler, notFound };
