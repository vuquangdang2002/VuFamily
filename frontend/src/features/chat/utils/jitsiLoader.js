export const JITSI_DOMAINS = [
    'jitsi.riot.im',
    'framatalk.org',
    'meet.komun.org',
    'call.nixnet.services',
    'meet.systemli.org'
];

let currentDomainIndex = 0;
let jitsiLoadingPromise = null;

export const loadJitsiApi = () => {
    if (window.JitsiMeetExternalAPI) {
        return Promise.resolve(JITSI_DOMAINS[currentDomainIndex]);
    }

    if (jitsiLoadingPromise) return jitsiLoadingPromise;

    jitsiLoadingPromise = new Promise((resolve, reject) => {
        const tryNextDomain = () => {
            if (currentDomainIndex >= JITSI_DOMAINS.length) {
                jitsiLoadingPromise = null;
                reject(new Error('Tất cả các máy chủ Jitsi đều không phản hồi.'));
                return;
            }

            const domain = JITSI_DOMAINS[currentDomainIndex];
            const script = document.createElement('script');
            script.src = `https://${domain}/external_api.js`;
            script.async = true;

            script.onload = () => {
                console.log(`[JitsiLoader] Tải API thành công từ ${domain}`);
                resolve(domain);
            };

            script.onerror = () => {
                console.warn(`[JitsiLoader] Lỗi tải API từ ${domain}. Đang thử server khác...`);
                script.remove();
                currentDomainIndex++;
                tryNextDomain();
            };

            document.body.appendChild(script);
        };

        tryNextDomain();
    });

    return jitsiLoadingPromise;
};
