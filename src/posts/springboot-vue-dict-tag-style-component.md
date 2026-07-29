---
title: Spring Boot + Vue 字典 Tag 样式封装：从字典项配置到表格和下拉统一显示
date: 2026-07-30
category: Vue
tag:
  - Vue
  - Element Plus
  - Spring Boot
  - 字典组件
  - 后台系统
isOriginal: true
excerpt: 记录在 yin-yang 后台系统中给字典项增加 Tag 样式配置，并封装 DictTag、DictSelect、DictTableColumn，让字典颜色从后端配置一路贯通到表格、表单和下拉选项。
---

# Spring Boot + Vue 字典 Tag 样式封装：从字典项配置到表格和下拉统一显示

## 背景

后台系统里，字典项通常不只是一个 `label/value`。例如用户状态、审批状态、日志等级、菜单类型这些字段，在列表中用普通文本展示可读性很弱，用 `Tag` 展示会清晰很多。

这次改造的目标是：

- 在字典项设置中配置“表格/表单样式”。
- 支持选择预设 Tag 类型，例如蓝色、绿色、黄色、红色、灰色。
- 支持自定义颜色。
- 字典项列表里直接显示最终 Tag 效果。
- 封装的字典下拉 `DictSelect` 中显示同样的 Tag。
- 封装一个表格列组件 `DictTableColumn`，业务表格可以直接按字典类型渲染 Tag。
- 后端 `/system/sys-dict-data/all` 返回的字典 option 携带样式字段。

项目结构如下：

```text
D:\WorkSpace\yin-yang
├── yin   # Spring Boot 多模块后端
└── yang  # Vue 3 + Element Plus 前端
```

## 设计思想

这次封装的核心不是“在某个页面里写几个 el-tag”，而是把字典项的展示能力做成一条完整链路：

```text
数据库 sys_dict_data.list_class
        ↓
后端 OptionDTO.listClass
        ↓
前端 dict store 缓存 option.listClass
        ↓
DictTag 统一解析样式
        ↓
DictSelect / DictTableColumn / 字典项列表复用
```

### 1. 样式配置仍复用 `listClass`

项目原来的字典数据表已经有字段：

```sql
list_class VARCHAR(64) DEFAULT NULL COMMENT '表格/表单样式'
```

因此不需要新增表字段，只需要明确它的存储规则：

```text
空字符串        默认 Tag 样式
primary         蓝色
success         绿色
warning         黄色
danger          红色
info            灰色
#4f46ff         自定义颜色
```

这样既兼容 Element Plus 原生 Tag 类型，也能扩展自定义颜色。

### 2. 展示逻辑集中在 `DictTag`

页面不应该到处重复写：

```vue
<el-tag :type="xxx" :style="xxx">{{ label }}</el-tag>
```

如果每个页面都自己解析颜色，后面调整样式会很痛苦。所以新增 `DictTag`：

- 可以直接传入 `label + listClass`。
- 也可以传入 `dictType + value`，组件自动从字典缓存里找到 label 和 listClass。
- 统一支持预设类型和自定义十六进制颜色。

### 3. 业务页面只关心字典语义

业务表格中最好写成这样：

```vue
<DictTableColumn dict-type="sys_status" prop="status" label="状态" />
```

而不是在每个表格里重复查字典、匹配 label、匹配颜色。

## 后端改造

### OptionDTO 增加 listClass

后端字典下拉接口 `/system/sys-dict-data/all` 返回的是 `OptionDTO`。原来只包含 `label/value/disabled`，前端拿不到样式，所以补一个字段：

```java
package com.yinyang.yin.system.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OptionDTO {

    /**
     * 显示文本
     */
    private String label;

    /**
     * 实际值
     */
    private String value;

    /**
     * 是否禁用
     */
    private Boolean disabled;

    /**
     * 字典 Tag 样式
     */
    private String listClass;
}
```

### MapStruct 自动映射

`SysDictData` 实体里已经有 `listClass`，`OptionDTO` 也新增了同名字段，所以 MapStruct 会自动映射。

原来的转换器保留即可：

```java
@Mapping(source = "dictValue", target = "value")
@Mapping(source = "dictLabel", target = "label")
@Mapping(source = "status", target = "disabled", qualifiedByName = "statusToDisabled")
public abstract OptionDTO toOptionDTO(SysDictData entity);
```

这一步完成后，前端拿到的数据结构会变成：

```json
{
  "sys_status": [
    {
      "label": "正常",
      "value": "1",
      "disabled": false,
      "listClass": "success"
    },
    {
      "label": "停用",
      "value": "0",
      "disabled": false,
      "listClass": "danger"
    }
  ]
}
```

## 前端类型和缓存

### 扩展 DictOption

字典 store 中的 option 类型增加 `listClass`：

```ts
export interface DictOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  listClass?: string;
}
```

### 增加 getOption 和 reloadAllDicts

`DictTag` 需要通过 `dictType + value` 找到完整 option，因此 store 增加 `getOption`：

```ts
function getOption(
  dictType: string,
  value: string | number | boolean | null | undefined,
): DictOption | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return getOptions(dictType).find(
    (option) => String(option.value) === String(value),
  );
}
```

字典项保存、删除、导入后还需要刷新缓存，否则下拉组件会继续使用旧样式：

```ts
async function loadAllDicts(force = false) {
  if (loaded.value && !force) return;

  const data = await getAllDictOptions();
  dictMap.value = data;
  loaded.value = true;
}

function reloadAllDicts() {
  return loadAllDicts(true);
}
```

## Tag 样式解析工具

新增文件：

```text
yang/src/components/dict/dict-tag.ts
```

它负责把 `listClass` 解析成 Element Plus 的 `type` 或内联颜色。

```ts
import type { CSSProperties } from "vue";

export type DictTagPreset = "" | "primary" | "success" | "warning" | "danger" | "info";

const presetTypes = new Set(["primary", "success", "warning", "danger", "info"]);
const hexColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeTagStyle(listClass?: string | null) {
  return (listClass || "").trim();
}

export function isCustomTagColor(listClass?: string | null) {
  return hexColorPattern.test(normalizeTagStyle(listClass));
}

export function getDictTagType(listClass?: string | null): DictTagPreset | undefined {
  const style = normalizeTagStyle(listClass);
  return presetTypes.has(style) ? (style as DictTagPreset) : undefined;
}

export function getDictTagStyle(listClass?: string | null): CSSProperties | undefined {
  const style = normalizeTagStyle(listClass);
  if (!hexColorPattern.test(style)) return undefined;

  const rgb = hexToRgb(style);
  if (!rgb) return undefined;

  return {
    color: style,
    borderColor: rgba(rgb, 0.32),
    backgroundColor: rgba(rgb, 0.12),
  };
}
```

这里没有把自定义颜色直接做成纯色背景，而是用浅背景加深色文字：

```text
文字颜色：自定义色
边框颜色：自定义色 32% 透明度
背景颜色：自定义色 12% 透明度
```

这样在亮色和暗色模式下都更稳，不会出现大面积高饱和色块。

## 封装 DictTag

新增文件：

```text
yang/src/components/dict/DictTag.vue
```

模板部分只包一层 `el-tag`：

```vue
<template>
  <el-tag
    class="dict-tag"
    :type="tagType"
    :size="size"
    :effect="effect"
    :style="tagStyle"
    :closable="closable"
    disable-transitions
    @close="$emit('close', $event)"
  >
    <span class="dict-tag__text">
      <slot>{{ displayLabel }}</slot>
    </span>
  </el-tag>
</template>
```

脚本部分做三件事：

1. 如果传了 `dictType + value`，就从字典 store 中找 option。
2. 如果直接传了 `label + listClass`，就直接渲染。
3. 根据 `listClass` 计算 Element Plus Tag 类型或自定义颜色。

```ts
const dictOption = computed(() => {
  if (!props.dictType || props.value === null || props.value === undefined) {
    return undefined;
  }

  return dictStore.getOption(props.dictType, props.value);
});

const resolvedListClass = computed(() => props.listClass ?? dictOption.value?.listClass ?? "");

const displayLabel = computed(() => {
  if (props.label !== null && props.label !== undefined && props.label !== "") {
    return String(props.label);
  }

  if (dictOption.value?.label) {
    return dictOption.value.label;
  }

  if (props.value !== null && props.value !== undefined) {
    return String(props.value);
  }

  return "";
});

const tagType = computed(() => getDictTagType(resolvedListClass.value));
const tagStyle = computed(() => getDictTagStyle(resolvedListClass.value));
```

使用方式有两种。

直接传 label 和样式：

```vue
<DictTag label="正常" list-class="success" />
```

通过字典类型和值自动查找：

```vue
<DictTag dict-type="sys_status" :value="row.status" />
```

## 封装 DictTableColumn

新增文件：

```text
yang/src/components/dict/DictTableColumn.vue
```

它的目标是让业务表格最少代码接入字典 Tag：

```vue
<template>
  <el-table-column
    :prop="prop"
    :label="label"
    :width="width"
    :min-width="minWidth"
    :fixed="fixed"
    v-bind="$attrs"
  >
    <template #default="{ row }">
      <DictTag :dict-type="dictType" :value="getRowValue(row)" />
    </template>
  </el-table-column>
</template>
```

为了支持 `user.status` 这种嵌套字段，取值函数按点号逐级读取：

```ts
function getRowValue(row: Record<string, unknown>) {
  return props.prop.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object") {
      return (value as Record<string, unknown>)[key];
    }

    return undefined;
  }, row);
}
```

业务中可以这样使用：

```vue
<DictTableColumn
  dict-type="sys_status"
  prop="status"
  label="状态"
  width="100"
/>
```

## 改造 DictSelect

原来的 `DictSelect` 只显示普通文本：

```vue
<el-option
  v-for="item in options"
  :key="item[valueKey]"
  :label="item[labelKey]"
  :value="item[valueKey]"
  :disabled="item.disabled"
/>
```

改造后，展开的下拉选项显示为 `DictTag`：

```vue
<el-option
  v-for="item in options"
  :key="item[valueKey]"
  :label="item[labelKey]"
  :value="item[valueKey]"
  :disabled="item.disabled"
>
  <DictTag
    v-if="showTag"
    :label="item[labelKey]"
    :list-class="item.listClass"
  />
  <span v-else>{{ item[labelKey] }}</span>
</el-option>
```

单选场景下，Element Plus 支持 `#label` 插槽，用来控制选中后的展示：

```vue
<template v-if="showTag && !multiple" #label="{ label, value }">
  <DictTag
    :label="label"
    :list-class="getOptionByValue(value)?.listClass"
  />
</template>
```

多选场景下，使用 `#tag` 插槽接管已选标签：

```vue
<template v-if="showTag && multiple" #tag="{ data, deleteTag, selectDisabled }">
  <div
    v-for="item in data"
    :key="String(item.value)"
    class="dict-select__selected-item"
  >
    <DictTag
      :label="item.currentLabel"
      :list-class="getOptionByValue(item.value)?.listClass"
      :closable="!selectDisabled && !item.isDisabled"
      @close="deleteTag($event, item)"
    />
  </div>
</template>
```

为了兼容不想显示 Tag 的场景，组件增加一个开关：

```ts
interface Props {
  modelValue?: string | number | Array<string | number>;
  dictType: string;
  placeholder?: string;
  clearable?: boolean;
  filterable?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  collapseTags?: boolean;
  showTag?: boolean;
  labelKey?: string;
  valueKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showTag: true,
});
```

如果某些页面仍想用普通文本下拉，可以这样写：

```vue
<DictSelect v-model="form.status" dict-type="sys_status" :show-tag="false" />
```

## 字典项设置页面

### 列表显示预览

字典项列表中，`dictLabel` 列直接展示最终效果：

```vue
<el-table-column prop="dictLabel" :label="fieldLabel('dictLabel')" width="140">
  <template #default="{ row }">
    <DictTag :label="row.dictLabel" :list-class="row.listClass" />
  </template>
</el-table-column>
```

`listClass` 列展示样式名称，同时也用对应样式包起来：

```vue
<el-table-column prop="listClass" :label="fieldLabel('listClass')" width="140">
  <template #default="{ row }">
    <DictTag
      :label="getTagStyleLabel(row.listClass)"
      :list-class="row.listClass"
    />
  </template>
</el-table-column>
```

样式名称转换函数：

```ts
const getTagStyleLabel = (listClass?: string | null) => {
  const value = (listClass || "").trim();
  if (!value) return t(`${i18nKey}.tagStyles.default`);
  if (["primary", "success", "warning", "danger", "info"].includes(value)) {
    return t(`${i18nKey}.tagStyles.${value}`);
  }

  return value;
};
```

### 表单中选择样式

原来的表单是一个普通输入框：

```vue
<el-input v-model="form.listClass" />
```

改成预设选择、自定义颜色和实时预览：

```vue
<div class="tag-style-field">
  <el-select v-model="tagStyleValue">
    <el-option
      v-for="item in tagStyleOptions"
      :key="item.value"
      :label="item.label"
      :value="item.value"
    >
      <DictTag :label="item.label" :list-class="item.listClass" />
    </el-option>
  </el-select>
  <el-color-picker
    v-if="isCustomStyle"
    v-model="form.listClass"
    class="tag-style-field__picker"
  />
  <DictTag
    class="tag-style-field__preview"
    :label="form.dictLabel || fieldLabel('dictLabel')"
    :list-class="form.listClass"
  />
</div>
```

预设选项：

```ts
const tagStyleOptions = computed(() => [
  {
    value: "",
    listClass: "",
    label: t(`${i18nKey}.tagStyles.default`),
  },
  {
    value: "primary",
    listClass: "primary",
    label: t(`${i18nKey}.tagStyles.primary`),
  },
  {
    value: "success",
    listClass: "success",
    label: t(`${i18nKey}.tagStyles.success`),
  },
  {
    value: "warning",
    listClass: "warning",
    label: t(`${i18nKey}.tagStyles.warning`),
  },
  {
    value: "danger",
    listClass: "danger",
    label: t(`${i18nKey}.tagStyles.danger`),
  },
  {
    value: "info",
    listClass: "info",
    label: t(`${i18nKey}.tagStyles.info`),
  },
  {
    value: "custom",
    listClass: isCustomTagColor(form.listClass) ? form.listClass : "#4f46ff",
    label: t(`${i18nKey}.tagStyles.custom`),
  },
]);
```

`tagStyleValue` 是一个 computed 代理。这样表单真正提交的字段仍然是 `form.listClass`：

```ts
const tagStyleValue = computed({
  get() {
    const value = (form.listClass || "").trim();
    return presetStyleValues.has(value) ? value : "custom";
  },
  set(value: string) {
    form.listClass = value === "custom" ? "#4f46ff" : value;
  },
});

const isCustomStyle = computed(() => tagStyleValue.value === "custom");
```

### 保存后刷新字典缓存

字典项变更后，不只是当前列表要刷新，全局字典缓存也要刷新：

```ts
const handleDataChanged = async () => {
  await Promise.all([loadData(), dictStore.reloadAllDicts()]);
};
```

新增、编辑、删除、导入成功后都走这个函数。

## 国际化文案

中文：

```ts
tagStyles: {
  default: "默认",
  primary: "蓝色",
  success: "绿色",
  warning: "黄色",
  danger: "红色",
  info: "灰色",
  custom: "自定义",
},
```

英文：

```ts
tagStyles: {
  default: "Default",
  primary: "Blue",
  success: "Green",
  warning: "Yellow",
  danger: "Red",
  info: "Gray",
  custom: "Custom",
},
```

## 暗色模式适配

Element Plus 默认浅色 Tag 在暗色模式下会显得过亮。可以在全局样式里压暗背景色和边框色：

```css
:root[data-theme="dark"] .el-tag,
:root[data-theme="dark"] .el-tag.el-tag--primary {
  --el-tag-bg-color: rgba(79, 70, 255, 0.14);
  --el-tag-border-color: rgba(79, 70, 255, 0.26);
}

:root[data-theme="dark"] .el-tag.el-tag--success {
  --el-tag-bg-color: rgba(64, 201, 121, 0.14);
  --el-tag-border-color: rgba(64, 201, 121, 0.26);
}

:root[data-theme="dark"] .el-tag.el-tag--warning {
  --el-tag-bg-color: rgba(230, 162, 60, 0.14);
  --el-tag-border-color: rgba(230, 162, 60, 0.26);
}

:root[data-theme="dark"] .el-tag.el-tag--danger,
:root[data-theme="dark"] .el-tag.el-tag--error {
  --el-tag-bg-color: rgba(255, 104, 104, 0.14);
  --el-tag-border-color: rgba(255, 104, 104, 0.26);
}

:root[data-theme="dark"] .el-tag.el-tag--info {
  --el-tag-bg-color: rgba(161, 168, 187, 0.12);
  --el-tag-border-color: rgba(161, 168, 187, 0.22);
}
```

自定义颜色本身已经使用半透明背景，因此暗色模式下也比较稳定。

## 最终使用方式

### 字典下拉

```vue
<DictSelect
  v-model="form.status"
  dict-type="sys_status"
/>
```

默认会显示 Tag。如果想回到普通文本：

```vue
<DictSelect
  v-model="form.status"
  dict-type="sys_status"
  :show-tag="false"
/>
```

### 表格列

```vue
<DictTableColumn
  dict-type="sys_status"
  prop="status"
  label="状态"
  width="100"
/>
```

### 手动渲染

```vue
<DictTag dict-type="sys_status" :value="row.status" />
```

或者：

```vue
<DictTag label="正常" list-class="success" />
```

## 验证

前端构建：

```powershell
cd D:\WorkSpace\yin-yang\yang
pnpm run build
```

后端编译：

```powershell
cd D:\WorkSpace\yin-yang\yin
.\mvnw.cmd -pl yin-admin -am compile
```

两边通过后，需要重点验证几个场景：

- 字典项新增时选择预设颜色，列表中能看到对应 Tag。
- 字典项选择自定义颜色，列表和下拉中颜色一致。
- 修改字典项样式后，保存完成能刷新字典缓存。
- `DictSelect` 单选选中后仍显示 Tag。
- `DictSelect` 多选时已选项支持关闭删除。
- `DictTableColumn` 在业务表格中能根据 `dictType + value` 自动显示 label 和样式。
- 暗色模式下 Tag 背景不刺眼。

## 小结

这次封装的关键点是把“字典展示样式”变成字典数据本身的一部分，而不是散落在各个页面里的判断逻辑。

后端只负责把 `listClass` 带到 option。前端只保留一个样式解析入口 `DictTag`。业务页面通过 `DictSelect` 和 `DictTableColumn` 使用字典时，不需要关心颜色如何解析、label 如何匹配、暗色模式如何处理。

这种做法后续扩展也比较自然。例如要增加 `plain/dark` 效果、增加图标、增加点状状态标识，都可以继续集中在 `DictTag` 和 `dict-tag.ts` 里处理。
