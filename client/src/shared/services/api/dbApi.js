import { request, getApiBase } from './request';
import { AuthHelper } from '../AuthHelper.js';

export const dbApi = {
    exportDatabase: (format, isEncrypted, tables) => 
        request(`/database/export?format=${format}&isEncrypted=${isEncrypted}&tables=${tables}`),
    importDatabase: (formData) => {
        return fetch(`${getApiBase()}/database/import`, {
            method: 'POST', 
            body: formData, 
            headers: { 'x-auth-token': AuthHelper.getToken() }
        }).then(res => res.json());
    },
};
