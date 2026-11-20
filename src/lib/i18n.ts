import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { createElement } from 'react';
export type UiScript = 'sc' | 'tc';
export const UI_SCRIPT_KEY = 'fanjin-ui-script-v1';
export const READING_SCRIPT_EVENT = 'fanjin-reading-script-changed';
type DisplayMaps = { sc: Record<string, string>; tc: Record<string, string> };
const emptyMaps: DisplayMaps = { sc: {}, tc: {} };
const taiwanTerms: Record<string, string> = {
  '数据': '資料', '本机': '本機', '用户': '使用者', '默认': '預設', '设置': '設定', '加载': '載入',
  '导入': '匯入', '导出': '匯出', '备份': '備份', '浏览器': '瀏覽器', '账号': '帳號', '账户': '帳戶',
  '登录': '登入', '注册': '註冊', '服务器': '伺服器', '文件': '檔案', '文件夹': '資料夾',
  '缓存': '快取', '链接': '連結', '点击': '點選', '搜索': '搜尋', '查找': '尋找', '筛选': '篩選',
  '书签': '書籤', '书架': '書架', '经藏': '經藏', '摘录': '摘錄', '日课': '日課', '阅读': '閱讀',
  '笔记': '筆記', '繁体': '繁體', '简体': '簡體', '原文': '原文', '恢复': '還原', '刷新': '重新整理',
  '重试': '重試', '保存': '儲存', '下载': '下載', '上传': '上傳', '清除': '清除', '取消': '取消',
  '创建': '建立', '重置': '重設', '选项': '選項', '反馈': '回饋', '提交': '送出', '内存': '記憶體',
  '字节': '位元組', '网络': '網路', '删除': '刪除', '软件': '軟體', '清静': '清靜',
  '恢复计划': '恢復計畫', '计划已恢复': '計畫已恢復',
};
const fallbackTc: Record<string, string> = Object.fromEntries(Array.from('书经录读签页节章体设载资据备还云无为与个时见学圣观处盘隐私护网开关图数输选题确实静归录过旧').map((char, index) => [char, Array.from('書經錄讀籤頁節章體設載資據備還雲無為與個時見學聖觀處盤隱私護網開關圖數輸選題確實靜歸錄過舊')[index]]));
export function preferredUiScript(): UiScript {
  try { const stored = localStorage.getItem(UI_SCRIPT_KEY); if (stored === 'sc' || stored === 'tc') return stored; } catch { /* Continue with browser language. */ }
  return (typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []).some((language) => /^zh(?:-|_)(?:TW|HK|MO|Hant)(?:-|_|$)/i.test(language)) ? 'tc' : 'sc';
}
export function convertPublicText(text: string, script: UiScript, maps: DisplayMaps = emptyMaps): string {
  const table = script === 'tc' ? maps.tc : maps.sc;
  return Array.from(text, (char) => table[char] ?? (script === 'tc' ? fallbackTc[char] : undefined) ?? char).join('');
}
export function translateInterface(text: string, script: UiScript, maps: DisplayMaps = emptyMaps): string {
  if (script === 'sc') return convertPublicText(text, script, maps);
  let result = text;
  const replacements = Object.entries(taiwanTerms).sort(([a], [b]) => b.length - a.length);
  const placeholders: string[] = [];
  for (const [from, to] of replacements) {
    if (!result.includes(from)) continue;
    const marker = `__FANJIN_UI_TERM_${placeholders.length}__`;
    placeholders.push(to); result = result.split(from).join(marker);
  }
  result = convertPublicText(result, script, maps);
  return result.replace(/__FANJIN_UI_TERM_(\d+)__/g, (_, index: string) => placeholders[Number(index)]);
}
type ContextValue = { script: UiScript; setScript: (script: UiScript) => void; t: (text: string | undefined | null) => string; displayText: (text: string | undefined | null, target?: UiScript) => string };
const I18nContext = createContext<ContextValue | null>(null);
export function I18nProvider({ children }: PropsWithChildren) {
  const [script, updateScript] = useState<UiScript>(preferredUiScript);
  const [maps, setMaps] = useState<DisplayMaps>(emptyMaps);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(import.meta.env.BASE_URL + 'content/display-maps.json', { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error('Display maps unavailable'); return response.json(); }).then((value: DisplayMaps) => { if (value.sc && value.tc && !controller.signal.aborted) setMaps(value); }).catch(() => { /* Core controls remain translated using the embedded vocabulary. */ });
    return () => controller.abort();
  }, []);
  useEffect(() => { document.documentElement.lang = script === 'tc' ? 'zh-Hant-TW' : 'zh-Hans-CN'; }, [script]);
  const setScript = useCallback((value: UiScript) => {
    updateScript(value);
    try { localStorage.setItem(UI_SCRIPT_KEY, value); const reading = JSON.parse(localStorage.getItem('fanjin-reading-preferences-v1') || '{}'); localStorage.setItem('fanjin-reading-preferences-v1', JSON.stringify({ ...reading, script: value })); } catch { /* The current tab still changes language when storage is unavailable. */ }
    window.dispatchEvent(new CustomEvent(READING_SCRIPT_EVENT, { detail: value }));
  }, []);
  const t = useCallback((text: string | undefined | null) => translateInterface(text || '', script, maps), [script, maps]);
  const displayText = useCallback((text: string | undefined | null, target: UiScript = script) => convertPublicText(text || '', target, maps), [script, maps]);
  const value = useMemo(() => ({ script, setScript, t, displayText }), [script, setScript, t, displayText]);
  return createElement(I18nContext.Provider, { value }, children);
}
export function useI18n() { const value = useContext(I18nContext); if (!value) throw new Error('useI18n requires I18nProvider'); return value; }
