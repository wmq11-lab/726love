const AMAP_SCRIPT_ID = 'amap-js-sdk';

function isAmapReady(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof window !== 'undefined' && !!(window as any).AMap;
}

/** 无安全密钥时用 1.4 栅格瓦片，兼容性更好；有安全密钥时用 2.0 矢量瓦片 */
export function getAmapVersion(): string {
  return getAmapSecurityCode() ? '2.0' : '1.4.15';
}

/** 注入高德安全密钥（2.0 Key 必须） */
export function setAmapSecurityConfig(securityJsCode: string) {
  if (typeof window === 'undefined' || !securityJsCode) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)._AMapSecurityConfig = { securityJsCode };
}

function clearAmapGlobal() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).AMap;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any)._AMapSecurityConfig;
}

/** 动态加载高德地图 JS API */
export function loadAmapScript(key: string, securityJsCode?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('仅可在浏览器加载地图'));
      return;
    }

    const version = securityJsCode ? '2.0' : '1.4.15';
    if (securityJsCode) setAmapSecurityConfig(securityJsCode);

    const expectedSrc = `https://webapi.amap.com/maps?v=${version}&key=${key}`;
    const existing = document.getElementById(AMAP_SCRIPT_ID) as HTMLScriptElement | null;

    // 版本不匹配时（例如之前加载了 2.0 但没配安全密钥），强制重载
    if (existing && existing.src !== expectedSrc) {
      existing.remove();
      clearAmapGlobal();
    }

    if (isAmapReady()) {
      resolve();
      return;
    }

    if (existing) {
      const onLoad = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('高德地图加载失败')); };
      const cleanup = () => {
        existing.removeEventListener('load', onLoad);
        existing.removeEventListener('error', onError);
        clearInterval(poll);
        clearTimeout(timeout);
      };
      existing.addEventListener('load', onLoad);
      existing.addEventListener('error', onError);
      const poll = setInterval(() => {
        if (isAmapReady()) { cleanup(); resolve(); }
      }, 100);
      const timeout = setTimeout(() => {
        cleanup();
        if (isAmapReady()) resolve();
        else reject(new Error('高德地图加载超时，请检查 Key 与安全密钥配置'));
      }, 15000);
      return;
    }

    const script = document.createElement('script');
    script.id = AMAP_SCRIPT_ID;
    script.src = expectedSrc;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('高德地图加载失败，请检查 Key 与域名白名单'));
    document.head.appendChild(script);
  });
}

export function getAmapKey(): string {
  return process.env.NEXT_PUBLIC_AMAP_KEY || '';
}

export function getAmapSecurityCode(): string {
  return process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || '';
}

export function isAmapCompatMode(): boolean {
  return !getAmapSecurityCode();
}
