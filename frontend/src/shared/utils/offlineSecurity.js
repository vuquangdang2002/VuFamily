// offlineSecurity.js - Native Client-side Multi-layered Encryption & Compression
// Uses Browser Web Crypto API (AES-GCM) and Compression Streams API (gzip)
// NO external dependencies (0% bundle footprint, maximum speed)

const STATIC_SECRET_KEY = 'vufamily_static_secure_anchor_key_2026';

/**
 * Derives a secure 256-bit CryptoKey using SHA-256 from Static Secret + Dynamic Token
 * @param {string} dynamicToken - The user's active session token
 * @returns {Promise<CryptoKey>} Cryptographic key for AES-GCM
 */
async function deriveKey(dynamicToken) {
    const rawKeyMaterial = `${STATIC_SECRET_KEY}:${dynamicToken || 'anonymous'}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKeyMaterial);
    
    // Hash key material using SHA-256
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    
    // Import raw hash as AES key
    return window.crypto.subtle.importKey(
        'raw',
        hash,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Compresses a string using native gzip stream compression
 * @param {string} text - Raw string text (JSON)
 * @returns {Promise<ArrayBuffer>} Compressed bytes
 */
async function compress(text) {
    const encoder = new TextEncoder();
    const rawBytes = encoder.encode(text);
    const blob = new Blob([rawBytes]);
    const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
}

/**
 * Decompresses gzip bytes back to string
 * @param {ArrayBuffer} buffer - Compressed bytes
 * @returns {Promise<string>} Decompressed raw text string
 */
async function decompress(buffer) {
    const blob = new Blob([buffer]);
    const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
}

/**
 * Encrypts and compresses data
 * @param {object|string} data - Data to secure
 * @param {string} sessionToken - The active session token
 * @returns {Promise<ArrayBuffer>} Combined buffer containing [IV (12 bytes) + EncryptedBytes]
 */
export async function encryptAndCompress(data, sessionToken) {
    try {
        const textData = typeof data === 'string' ? data : JSON.stringify(data);
        
        // Step 1: Compress data
        const compressedBuffer = await compress(textData);
        
        // Step 2: Derive encryption key
        const cryptoKey = await deriveKey(sessionToken);
        
        // Step 3: Encrypt compressed data using AES-GCM
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for GCM
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            compressedBuffer
        );
        
        // Step 4: Combine IV and Encrypted payload into single ArrayBuffer
        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);
        
        return combined.buffer;
    } catch (e) {
        console.error('[OfflineSecurity - encrypt] Error during encryption:', e);
        throw new Error('Mã hóa dữ liệu ngoại tuyến thất bại.');
    }
}

/**
 * Decrypts and decompresses data
 * @param {ArrayBuffer} combinedBuffer - Combined buffer [IV (12 bytes) + EncryptedBytes]
 * @param {string} sessionToken - The active session token
 * @returns {Promise<object>} Parsed JSON object
 */
export async function decryptAndDecompress(combinedBuffer, sessionToken) {
    try {
        if (!combinedBuffer || combinedBuffer.byteLength < 13) {
            throw new Error('Dữ liệu đệm không hợp lệ hoặc quá ngắn.');
        }
        
        // Step 1: Split IV and encrypted payload
        const iv = new Uint8Array(combinedBuffer, 0, 12);
        const encryptedBytes = new Uint8Array(combinedBuffer, 12);
        
        // Step 2: Derive encryption key
        const cryptoKey = await deriveKey(sessionToken);
        
        // Step 3: Decrypt using AES-GCM
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            encryptedBytes
        );
        
        // Step 4: Decompress gzip bytes back to JSON string
        const text = await decompress(decryptedBuffer);
        return JSON.parse(text);
    } catch (e) {
        console.error('[OfflineSecurity - decrypt] Error during decryption:', e);
        throw new Error('Giải mã dữ liệu ngoại tuyến thất bại. Có thể phiên đăng nhập đã hết hạn.');
    }
}
