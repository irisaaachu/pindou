# 阿里云版 uniCloud 接入指南

Milestone 5 已在代码库中准备官方 uni-id 资产和拼豆身份代码，但不包含任何账号密钥，也不代表已经连接或部署到真实服务空间。

## 一、按顺序关联和部署

1. 拉取带有 `milestone-05-wechat-identity-profile` 标签的代码。
2. 保持真实 `uni-id/config.json` 尚未创建，在项目根目录运行 `npm run check`。这是代码库安全门，会校验真实配置不存在且已忽略。
3. 登录 HBuilderX，将 `uniCloud-aliyun` 关联到你的阿里云版 uniCloud 服务空间。
4. 在 HBuilderX 中仅在本地为 `src/manifest.json` 设置 DCloud AppID 和微信小程序 AppID。
5. 复制 `uniCloud-aliyun/config/uni-id.config.example.json` 的结构，在本地创建已忽略的 `uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json`，再填入你自己的 DCloud AppID、微信 AppID 和 AppSecret。同时为 `tokenSecret` 生成足够长度的强随机密钥；安全保存该值，并在后续部署中保持不变，绝不提交到 Git。
6. 先上传 `uniCloud-aliyun/database` 中的 DB Schema。
7. 按以下清单逐一上传全部 common 模块：官方 `uni-id-common`、`uni-config-center`、`uni-open-bridge-common`、`uni-captcha`、`uni-cloud-s2s`，以及拼豆自有 `pindou-cloud-common`。官方的第六个资产 `uni-id-co` 是云对象而不是 common 模块，在下一步上传。
8. common 模块全部成功后，再上传 `uni-id-co` 和 `pindou-profile`。
9. 在 HBuilderX 中确认上述每项都显示上传成功，之后才在微信开发者工具中测试登录。

HBuilderX 只用于账号关联和云端上传；日常业务代码仍可在当前开发环境中编写。

## 二、密钥与账号边界

真实 `config.json` 已被 `.gitignore` 排除，不得强制加入 Git，也不得把 AppSecret 发到 issue、聊天或截图中。

创建真实配置后，不要再用 `npm run check` 或 `npm run check:cloud` 判断部署状态：仓库安全门为防止密钥进入开发快照，设计上要求该文件不存在，因此会因本地配置存在而失败。它只检查路径是否存在，绝不读取或输出真实配置内容；真实配置也绝不得提交。

真实 AppID/AppSecret 录入、服务空间关联和登录后上传，都必须由你在本地 HBuilderX 完成。GitHub 中有代码不等于云端已部署。

## 三、校验与上传

1. 仓库安全校验已在创建真实配置前完成。
2. 真实部署以 HBuilderX 或 uniCloud 控制台中每个 DB Schema、common 模块和云对象显示“上传成功”为验收依据。

GitHub 中出现这些文件，只能证明云基础层已准备；在用户登录 DCloud、关联服务空间并完成上传之前，小程序不会自动获得云服务。

## 四、Milestone 6：拼豆图纸图库部署

在已经关联好的阿里云版 uniCloud 服务空间中，严格按以下顺序更新：

1. 保留本机已忽略的真实 `uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json`，不要删除、覆盖或加入 Git。
2. 上传本次变更的两个 DB Schema：`pindou-gallery-categories.schema.json` 和 `pindou-gallery-patterns.schema.json`。
3. 上传云对象 `pindou-gallery`。
4. 在项目根目录本地运行 `npm run build:gallery-import`，生成确定性的图库导入文件。
5. 通过 uniCloud 控制台或 HBuilderX 支持的数据导入流程，把 `generated/gallery-import/categories-import.json` 导入 `pindou-gallery-categories`，再把 `generated/gallery-import/patterns-import.json` 导入 `pindou-gallery-patterns`。这两个文件的扩展名是 `.json`，但内容是 JSONL：每一行恰好一个对象；uniCloud 接受这种 `.json` 文件，JSON 数组会被拒绝。导入文件为每个 `content_id + version` 生成稳定的 `_id`：首次导入使用“新增”；重复部署时相同内容可以跳过已存在的 `_id`。如果同一 `_id` 的内容不同，必须停止导入并提升 `version`，不得覆盖已发布版本。数据库的 `_id` 唯一约束会阻止重复或冲突记录被静默新增。
6. 在云端数据库中确认 Milestone 6 恰好有 8 个分类、0 个正式图纸。0 个正式图纸是本阶段的预期结果，不是部署失败。
7. 在 HBuilderX 中连接云端云函数环境并运行微信小程序，确认未登录用户可以直接看到图库空状态，且浏览过程不会弹出登录授权。

Milestone 7 将补充预览图、图纸载荷资源以及 24 条正式图纸记录；在此之前不要用临时或无来源记录填充正式图库。
