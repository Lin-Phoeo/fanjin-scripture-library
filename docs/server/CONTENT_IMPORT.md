 > 历史服务器版本参考。当前公开版本使用 GitHub Pages 与本机 IndexedDB，参见 [现行文档](../README.md)。

# 经典内容导入

一部经典以一个 JSON 文件导入，内含有序段落。脚本与后台使用同一套字段校验和保存流程，默认进入待审核。格式预检和内容来源核验是两件事，预检通过不代表可以发布。

## 三层内容

| 层次 | 字段 | 要求 |
| --- | --- | --- |
| 原文 | `originalText`；可选 `contentTc/contentSc` | 原文必填；繁体底本与人工校对简体分别保存 |
| 古注 | `classicalCommentary/commentarySource` | 有古注必须同时提供作者、作品与卷章出处；未核对则留空 |
| 现代导读 | `modernGuide` | 清楚区分现代说明与古代原文；允许空缺 |

旧字段 `plainText/commentaryText` 仅为历史兼容。不要把未核验的旧说明自动复制到古注层，也不要为填满页面编造引文。自动繁简转换不能代替底本校勘。音频可选，填写无凭据的 HTTPS 地址；音频许可需要单独核对。

## 示例格式

下面是**待整理模板**，刻意保持 `sourceVerified:false`，不能直接发布。示例说明文本必须替换为实际内容和可核对来源。`null` 表示尚无对应材料。

```json
{
  "slug": "my-classic",
  "title": "待整理经典",
  "categorySlug": "banruo",
  "dynasty": "待核对时代",
  "translator": "待核对作者或译者",
  "school": "佛家",
  "tags": ["入门"],
  "role": "个人精读",
  "overlay": "",
  "summary": "简要说明整理范围",
  "edition": "",
  "sourceName": "",
  "sourceUrl": "",
  "license": "",
  "licenseUrl": "",
  "sourceVerified": false,
  "isExcerpt": true,
  "passages": [
    {
      "slug": "chapter-01",
      "title": "第一章",
      "originalText": "待录入已核对的原文",
      "contentTc": null,
      "contentSc": null,
      "classicalCommentary": null,
      "commentarySource": null,
      "modernGuide": null,
      "audioUrl": ""
    }
  ]
}
```

`slug` 和段落 slug 仅支持小写字母、数字与连字符，每段标识在本书内唯一。顺序按 `passages` 数组保存，1–2000 段。已有经典标识不可改；更新时必须保留已有私人记录所引用的段落标识。`isExcerpt` 默认 true，只有逐章核对为全本后才改成 false。

分类以 `GET /api/categories` 的实际结果为准，不能只凭学派名猜测 `categorySlug`。初始历史分类为 `banruo/zushi/fahua`；新增资料应选择适用的实际分类，不能为了通过校验错误归类。

## 执行流程

```sh
# 只解析和校验格式，不打开数据库
npm run import:scripture -- path/to/book.json --dry-run

# 真实写入指定库，进入待审核
npm run import:scripture -- path/to/book.json

# 仅用于已完成来源核验的材料；仍执行发布条件校验
npm run import:scripture -- path/to/book.json --published
```

命令读取 `.env`，数据库由 `FANJIN_DB_PATH` 决定。正式导入前确认目标路径并备份。相同经典 slug 会更新现有经典，不会复制为另一部；修改公共内容会重新进入审核。预检可以使用 `--published` 查看意图，但不会执行数据库发布核验，不能据此认定许可字段齐全。

## 发布条件

发布前填写并核对：

1. `edition`：具体底本版本或整理依据。
2. `sourceName/sourceUrl`：实际来源及可访问链接。
3. `license/licenseUrl`：该数字文本、整理或译注的许可说明与依据链接。
4. `sourceVerified:true`：管理员已核对上述事实。

古代作品年代久远，不自动意味着某一现代录入、标点、译文、注释、录音或网站数据库可以不受限制再发布。不同内容层有不同来源时，应在来源说明和古注出处中分别注明。古注或导读没有足够证据就留空；可先发布来源明确的原文部分。

仓库旧 [scripture-template.json](../../data/import-templates/scripture-template.json) 和其他历史样例用于理解旧数据，缺少现行来源元数据，不能未经整理直接作为生产发布资料。以本页三层格式与当前后端校验为准。
