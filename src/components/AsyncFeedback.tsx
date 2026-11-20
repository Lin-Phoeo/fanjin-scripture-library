export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  if (!message) return null;
  return <div className="feedback-text" role="alert"><p>{message}</p>{retry ? <button className="classic-inline-button" type="button" onClick={retry}>重新加载</button> : null}</div>;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '暂时无法完成请求，请稍后重试。';
}
