// Logs all VITE_ properties from import.meta.env
export function logAllEnvProperties() {
	const env = (import.meta as any)?.env || {};
	const viteKeys = Object.keys(env).filter((k) => k.startsWith("VITE_"));
	const viteProps: Record<string, any> = {};
	viteKeys.forEach((key) => {
		viteProps[key] = env[key];
	});
	console.log("All VITE_ env properties:", viteProps);
}
export function getApiBaseUrl(): string {
    const env: any = (import.meta as any)?.env || {};
    // Log available VITE_* keys once for diagnostics
    if (!(getApiBaseUrl as any)._logged) {
        try {
            const keys = Object.keys(env).filter((k) => k.startsWith("VITE_"));
            console.log("Vite env keys:", keys);
        } catch {}
        (getApiBaseUrl as any)._logged = true;
    }
    const directUrl = env?.VITE_API_URL as string | undefined;
    let baseUrl = directUrl && directUrl.trim() ? directUrl.trim().replace(/\/?$/, "") : "";
    if (!baseUrl) {
        baseUrl = "http://localhost:5000";
        console.warn("VITE_API_URL not set, using fallback:", baseUrl);
    }
    console.log("API Base URL from env or fallback:", baseUrl);
    return baseUrl;
}

export function getAssetBaseUrl(): string {
	const env: any = (import.meta as any)?.env || {};
	const assetEnv = env?.VITE_ASSET_URL as string | undefined;
	const base = assetEnv && assetEnv.trim() ? assetEnv.trim() : getApiBaseUrl();
	return (base || "").replace(/\/?$/, "");
}

export function apiUrl(pathOrUrl: string): string {
	if (!pathOrUrl) return getApiBaseUrl();
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
	const base = getApiBaseUrl();
	if (!base) return pathOrUrl; // same-origin during dev if not provided
	const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
	return `${base}${path}`;
}

export function assetUrl(pathOrUrl: string): string {
	if (!pathOrUrl) return "";
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
	const base = getAssetBaseUrl();
	if (!base) return pathOrUrl;
	const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
	return `${base}${path}`;
}


