# 布局及批量参数约定

母版规格优先，坐标以左上角为原点，x向右、y向下。所有值以设计画布实际像素为单位，PS文档以72 PPI建立（此时点与像素数值相同）；按倍数输出时同步缩放坐标、字号、圆角和描边。图层数组按底到顶排列，组数组也按底到顶排列。

## 最小布局对象

```json
{
  "name": "sku-001",
  "width": 1200,
  "height": 1600,
  "output": "E:/design/sku-001.psd",
  "groups": [
    {"name": "01 背景", "layers": [
      {"type":"image", "name":"背景", "path":"E:/assets/bg.png", "x":0, "y":0, "width":1200, "height":1600, "fit":"stretch"}
    ]},
    {"name": "02 商品", "layers": [
      {"type":"image", "name":"产品", "path":"E:/assets/product.png", "x":510, "y":620, "width":550, "height":800, "fit":"contain"}
    ]},
    {"name": "03 信息", "layers": [
      {"type":"shape", "shape":"rounded-rectangle", "name":"卖点底板", "x":70, "y":780, "width":360, "height":84, "radius":42, "color":"167AC0", "gradient":{"top":"64B8E8","bottom":"1763A8"}},
      {"type":"text", "name":"卖点文案", "text":"用户提供卖点", "x":105, "y":840, "size":44, "font":"MicrosoftYaHei-Bold", "color":"FFFFFF"}
    ]}
  ]
}
```

`image` 支持 `contain`（保持比例、在区域内居中）和 `stretch`（只用于允许精确铺满的底图）。透明PNG的透明边距可能影响智能对象的实际视觉范围；必须预览并校准，必要时先裁除透明边距。`text` 的 y 为基线坐标，`font` 使用已安装字体的PostScript名称，可选 `horizontalScale`（百分比）与 `gradient`。`shape` 支持 `rectangle`、`rounded-rectangle` 和 `ellipse`，颜色使用不带#的六位RGB十六进制。原生形状轮廓必须与母版吻合；复杂不规则形状用真实路径或已有PSD组件，不强行转为圆角矩形。只在有明确用户授意时将原形状近似化。

## 批量任务字段示例

| sku | output | product | background | title | selling_points | price | template |
|---|---|---|---|---|---|---|---|
| SKU001 | SKU001.psd | product001.png | bg001.png | 原文案 | 原卖点列表 | 原价格 | master.psd |

固定层名、图像区域、边界、字号范围和组件样式存于定稿模板；每行仅替换明确变量。输出目录必须存在，输出名称唯一且不得覆盖原设计。首件对照预览、文字溢出检查、图层类型及素材路径验证通过后再跑整批。
