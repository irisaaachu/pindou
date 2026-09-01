# 阿里云版 uniCloud 接入指南

Milestone 5 已在代码库中准备官方 uni-id 资产和拼豆身份代码，但不包含任何账号密钥，也不代表已经连接或部署到真实服务空间。

## 一、按顺序关联和部署

1. 拉取带有 `milestone-05-wechat-identity-profile` 标签的代码。
2. 登录 HBuilderX，将 `uniCloud-aliyun` 关联到你的阿里云版 uniCloud 服务空间。
3. 在 HBuilderX 中仅在本地为 `src/manifest.json` 设置 DCloud AppID 和微信小程序 AppID。
4. 复制 `uniCloud-aliyun/config/uni-id.config.example.json` 的结构，在本地创建已忽略的 `uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json`，再填入你自己的 DCloud AppID、微信 AppID 和 AppSecret。
5. 先上传 `uniCloud-aliyun/database` 中的 DB Schema，再上传官方 common 模块，然后上传 `uni-id-co` 和 `pindou-profile`。
6. 在 HBuilderX 中确认上述每项都显示上传成功，之后才在微信开发者工具中测试登录。

HBuilderX 只用于账号关联和云端上传；日常业务代码仍可在当前开发环境中编写。

## 二、密钥与账号边界

真实 `config.json` 已被 `.gitignore` 排除，不得强制加入 Git，也不得把 AppSecret 发到 issue、聊天或截图中。

真实 AppID/AppSecret 录入、服务空间关联和登录后上传，都必须由你在本地 HBuilderX 完成。GitHub 中有代码不等于云端已部署。

## 三、校验与上传

1. 上传前在项目根目录运行 `npm run check:cloud`。
2. 确认校验只报告路径，不读取或输出本地真实配置内容。
3. 以 HBuilderX 或 uniCloud 控制台显示“上传成功”为真实部署验收依据。

GitHub 中出现这些文件，只能证明云基础层已准备；在用户登录 DCloud、关联服务空间并完成上传之前，小程序不会自动获得云服务。
