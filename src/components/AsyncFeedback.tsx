import { useI18n } from '../lib/i18n';
export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  const { t } = useI18n();

  if (!message) return null;
  return <div className="feedback-text" role="alert"><p>{t(message)}</p>{retry ? <button className="classic-inline-button" type="button" onClick={retry}>{t("重新加载")}</button> : null}</div>;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '暂时无法完成请求，请稍后重试。';
}
