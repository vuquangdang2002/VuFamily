// api.js - Facade layer combining and re-exporting modular API features and local simulation API
import { memberApi } from './api/memberApi';
import { requestApi } from './api/requestApi';
import { newsfeedApi } from './api/newsfeedApi';
import { authApi } from './api/authApi';
import { chatApi } from './api/chatApi';
import { dbApi } from './api/dbApi';
import { financeApi } from './api/financeApi';
import { eventApi } from './api/eventApi';

export const api = {
    ...memberApi,
    ...requestApi,
    ...newsfeedApi,
    ...authApi,
    ...chatApi,
    ...dbApi,
    ...financeApi,
    ...eventApi,
};

export { getApiBase, mapToCamelCase } from './api/request';
export { formatDate, getLunarDateString, localApi } from './localApi';
