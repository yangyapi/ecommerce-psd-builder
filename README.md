# ecommerce-psd-builder
本地 Skill：电商PSD构建智能体
本 Skill 面向 Photoshop Codex，用来自动生成电商详情页、活动页的图层结构、分组规范、标注说明、组件排版方案，配套布局规范与组装脚本，服务跨境保健品电商视觉设计。

## 目录结构
- SKILL.md 技能主定义文件
- scripts/ 配套执行脚本
- references/ 参考素材、模板

## 使用方法
1. git clone 本仓库
2. 将整个 `ecommerce-psd-builder` 文件夹放到你的智能体 local-skills 目录
3. 发送指令刷新本地技能：使用 `$ecommerce-psd-builder` 复刻这张参考图，生成高清素材并组装成可编辑 PSD。

## 注意
脚本中无硬编码密钥，如需API密钥请自行配置环境变量。
> ⚠️ 重要前置条件
> Codex 必须成功连接本地 Photoshop（PS 保持打开，Codex 可调用 PS 命令），否则技能无法执行图层创建、分组、文本与形状绘制动作，只能输出纯文本方案。
