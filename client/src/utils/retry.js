/**
 * Thực thi một hàm bất đồng bộ (async function) với cơ chế tự động thử lại (auto-retry).
 * 
 * @param {Function} fn - Hàm bất đồng bộ cần thực thi.
 * @param {Object} options - Các cấu hình cho tính năng retry.
 * @param {number} [options.maxRetries=3] - Số lần thử lại tối đa.
 * @param {number} [options.baseDelay=1000] - Khoảng thời gian chờ ban đầu (milliseconds).
 * @param {boolean} [options.exponentialBackoff=true] - Bật chờ tăng dần theo cấp số nhân.
 * @param {Function} [options.onRetry] - Callback được gọi khi xảy ra lỗi và chuẩn bị thử lại. Nhận (error, attempt).
 * @param {Function} [options.shouldRetry] - Hàm đánh giá xem lỗi này có nên được thử lại hay không.
 * @returns {Promise<any>}
 */
export const withRetry = async (fn, options = {}) => {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        exponentialBackoff = true,
        onRetry = (error, attempt) => {
            console.warn(`[AutoRetry] Lần ${attempt} thất bại. Đang thử lại...\nChi tiết lỗi:`, error.message);
        },
        shouldRetry = (error) => true, // Mặc định là sẽ retry với mọi loại lỗi
    } = options;

    let attempt = 0;

    while (attempt <= maxRetries) {
        try {
            // Thực thi hàm truyền vào
            return await fn();
        } catch (error) {
            attempt++;

            // Nếu đã vượt quá số lần retry HOẶC loại lỗi không cho phép retry thì ném ra lỗi luôn
            if (attempt > maxRetries || !shouldRetry(error)) {
                throw error;
            }

            // Gọi callback onRetry để ghi log hoặc update UI
            if (onRetry) {
                onRetry(error, attempt);
            }

            // Tính toán thời gian chờ cho lần tiếp theo
            // Nếu exponentialBackoff là true: delay sẽ là baseDelay * 2^(attempt-1)
            const delay = exponentialBackoff
                ? baseDelay * Math.pow(2, attempt - 1)
                : baseDelay;

            // Chờ trong khoảng thời gian delay trước khi lặp lại
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
};
