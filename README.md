# Bili_monkey 🐒

BiliAutoClicker 的油猴客户端，独立仓库，分离HTML模板。

## 文件说明

| 文件 | 说明 |
|------|------|
| `biliauto-tampermonkey-client.user.js` | 油猴脚本主文件，通过 `GM_getResourceText` + 镜像raw链接加载外部模板 |
| `template.html` | 独立的UI模板文件（样式+HTML结构），托管在GitHub并走镜像加速 |

## 国内镜像加速

所有资源引用均通过 `gh-proxy.com` 镜像加速，确保国内用户能快速加载。

## 使用方式

1. 安装油猴扩展（Tampermonkey）
2. 点击脚本安装链接（从release或raw链接获取）
3. 访问 B站奖励兑换页面即可使用

