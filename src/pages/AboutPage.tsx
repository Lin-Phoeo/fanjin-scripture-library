import { useI18n } from '../lib/i18n';
import { Link } from 'react-router-dom';
export default function AboutPage() {
  const { t } = useI18n();
 return <main className="content-page prose-page"><h1>{t("梵烬 · 本机书斋")}</h1><p>{t("一个公益的东方经典阅读工作台，以佛道为本，兼读儒家诸子。直接读书、标记段落、写下心得、记录日课，无需注册。")}</p><h2>{t("数据由你带走")}</h2><p>{t("个人记录只保存在当前浏览器，没有云端账号或自动同步。完整 JSON 备份可导出后带到其他设备；请定期备份，清除浏览器数据后无法从网站找回。")}</p><h2>{t("原文、古注与导读分开")}</h2><p>{t("经文依登记底本展示。古代注疏须有出处，现代导读另列，不冒充古人注疏。不合并不同学派观点，也不自动生成解释填入经典。")}</p><h2>{t("版本与许可")}</h2><p>{t("每本书的详情列出底本、数字来源、篇幅和使用许可。公益阅读不代表全部来源都可任意转载，请以各版本声明为准。发现错字时，可以在阅读页生成带出处的勘误文本并自行提交到 GitHub。")}</p><div className="card-actions"><Link className="ink-button" to="/library">{t("打开经藏")}</Link><Link className="workbench-action" to="/profile">{t("备份本机书斋")}</Link></div></main>; }
