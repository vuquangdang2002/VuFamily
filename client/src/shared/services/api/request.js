import { API_BASE_URL, ConfigAPI } from '../../../config.js';
import { AuthHelper } from '../AuthHelper.js';

export function getApiBase() {
    if (!window.Capacitor && window.location.hostname === 'localhost' && window.location.port) {
        return '/api';
    }
    const remoteUrl = ConfigAPI.getString('api_base_url', API_BASE_URL);
    return remoteUrl || API_BASE_URL;
}

export async function request(url, options = {}) {
    let headers = { 'Content-Type': 'application/json', ...options.headers };
    try {
        const token = AuthHelper.getToken();
        if (token) headers['x-auth-token'] = token;
    } catch (e) {
        // Ignore token errors for unauthenticated requests
    }

    const baseUrl = getApiBase();
    const res = await fetch(`${baseUrl}${url}`, {
        ...options,
        headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi server');
    return data;
}

export const mapToCamelCase = (m) => ({
    ...m,
    id: String(m.id),
    birthDate: m.birth_date,
    birthTime: m.birth_time,
    deathDate: m.death_date,
    deathDateLunar: m.death_date_lunar,
    birthPlace: m.birth_place,
    deathPlace: m.death_place,
    birthOrder: m.birth_order,
    childType: m.child_type,
    parentId: m.parent_id ? String(m.parent_id) : null,
    spouseId: m.spouse_id ? String(m.spouse_id) : null,
});
