# 阿里云版 uniCloud 接入指南

Milestone 4 只准备可部署的云端源码和安全规则，不包含任何账号密钥，也不代表已经连接或部署到真实服务空间。

## 一、准备 DCloud 账号与服务空间

1. 注册并登录 DCloud 账号，按平台要求完成实名认证。
2. 在 DCloud uniCloud 控制台创建一个阿里云版开发服务空间。MVP 阶段使用一个开发空间即可。
3. 在 HBuilderX 登录同一个 DCloud 账号，将项目中的 `uniCloud-aliyun` 目录关联到该服务空间。

HBuilderX 只用于账号关联和云端上传；日常业务代码仍可在当前开发环境中编写。

## 二、本地配置 uni-id

Milestone 5 安装官方 `uni-config-center/uni-id` 模块后：

1. 参照 `uniCloud-aliyun/config/uni-id.config.example.json` 中的字段。
2. 在本地创建 `uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json`。
3. 将占位值替换为真实的 DCloud AppID、微信小程序 AppID 和 AppSecret。

真实 `config.json` 已被 `.gitignore` 排除，不得强制加入 Git，也不得把 AppSecret 发到 issue、聊天或截图中。

## 三、校验与上传

1. 上传前在项目根目录运行 `npm run check:cloud`。
2. 在 HBuilderX 中按 uniCloud 官方流程上传 `uniCloud-aliyun/database` 下的 DB Schema。
3. 按需上传 `uniCloud-aliyun/cloudfunctions/common/pindou-cloud-common` 公共模块。Milestone 5 引入官方 uni-id 模块后，再一起上传身份相关云代码。
4. 以 HBuilderX 或 uniCloud 控制台显示“上传成功”为真实部署验收依据。

GitHub 中出现这些文件，只能证明云基础层已准备；在用户登录 DCloud、关联服务空间并完成上传之前，小程序不会自动获得云服务。
