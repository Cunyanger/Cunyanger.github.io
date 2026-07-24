---
title: Spring Boot + Vue 后台动态路由与角色权限控制完整教程
date: 2026-07-22
category:
  - Java
  - Vue
tag:
  - Spring Security
  - Vue Router
  - RBAC
  - Element Plus
---

# Spring Boot + Vue 后台动态路由与角色权限控制完整教程

本文基于 `yin` 后端和 `yang` 前端项目，整理一套后台管理系统常用的 RBAC 权限方案。目标是让菜单、动态路由、按钮权限、接口权限和角色分配保持同一套数据来源，避免出现“页面能看到但接口 403”或“分配了权限但菜单不显示”的问题。

## 一、整体目标

后台权限通常要解决四件事：

1. 用户登录后拿到 token、用户信息、角色、权限和菜单树。
2. 前端根据菜单树动态注册 Vue Router 路由。
3. 前端根据权限标识控制按钮、操作列、页面访问。
4. 后端用 Spring Security 对接口做最终鉴权。

前端判断只负责交互体验，后端鉴权才是安全边界。任何新增、修改、删除、导入、导出接口都必须由后端校验。

## 二、核心数据表设计

### 1. 用户表 `sys_user`

用户表保存账号基础信息和密码 hash。

关键字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 用户主键 |
| `login` | 登录名 |
| `password_hash` | BCrypt 密码 hash |
| `nickname` | 显示名称 |
| `activated` | 是否启用 |
| `lang_key` | 语言标识 |

设计要点：

- 密码只存 hash，不存明文。
- 用户启停状态应在登录或用户详情加载时参与校验。
- 用户和角色是多对多关系，不把角色字段直接塞进用户表。

### 2. 角色表 `sys_authority`

角色表保存角色身份。

关键字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 角色主键 |
| `name` | 角色标识，例如 `ROLE_ADMIN` |
| `remark` | 备注 |

设计要点：

- Spring Security 的 `hasRole('ADMIN')` 实际匹配 `ROLE_ADMIN`。
- 普通角色也建议使用 `ROLE_` 前缀，例如 `ROLE_MANAGER`。
- 接口权限不要混进角色名里，接口权限放到菜单表的 `perms` 字段。

### 3. 用户角色关系表 `sys_user_authority`

保存用户和角色的多对多关系。

关键字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 关系主键 |
| `user_id` | 用户 ID |
| `role_id` | 角色 ID，对应 `sys_authority.id` |

实现要点：

- 当前项目实体 `UserAuthority.id` 使用 `IdType.ASSIGN_ID`，由 MyBatis-Plus 生成主键。
- 如果数据库字段不是自增，就不要使用 `IdType.AUTO`，否则插入时 SQL 不带 `id`，会报 `Field 'id' doesn't have a default value`。

### 4. 菜单权限表 `sys_menu`

菜单表同时描述目录、页面和按钮权限。

关键字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 菜单主键 |
| `parent_id` | 父菜单 ID，根节点为 `0` |
| `name` | 菜单名称 |
| `path` | 路由路径片段 |
| `component` | 前端组件路径 |
| `perms` | 权限标识，例如 `sys:config:query` |
| `type` | `1` 目录，`2` 页面，`3` 按钮 |
| `order_num` | 排序 |
| `visible` | 是否显示 |
| `status` | 是否启用 |

示例：

| 类型 | 名称 | path | component | perms |
| --- | --- | --- | --- | --- |
| 目录 | 系统管理 | `/system` | 空 | 空 |
| 页面 | 参数管理 | `config` | `system/sys-config/index` | `sys:config:query` |
| 按钮 | 参数新增 | 空 | 空 | `sys:config:create` |

设计要点：

- 页面节点必须有 `component`，否则前端无法渲染页面。
- 页面节点的 `perms` 通常使用查询权限，例如 `sys:config:query`。
- 按钮节点 `type=3` 不注册路由，只用于按钮显示和接口鉴权。
- 权限命名必须和后端 `@PreAuthorize` 完全一致。

### 5. 角色菜单关系表 `sys_authority_menu`

保存角色拥有的菜单、页面和按钮权限。

关键字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 关系主键 |
| `authority_id` | 角色 ID |
| `menu_id` | 菜单 ID，可指向目录、页面或按钮 |

设计要点：

- 角色分配权限时保存菜单 ID，而不是保存权限字符串。
- 登录时通过菜单 ID 查出 `sys_menu.perms`，再生成用户权限集合。
- 需要给菜单关系表加唯一约束，避免同一个角色重复关联同一个菜单。

## 三、后端认证与授权流程

### 1. 登录接口

登录入口是 `AuthController.login`。

流程：

1. 根据用户名调用 `CustomUserDetailsService.loadUserByUsername`。
2. 使用 `PasswordEncoder.matches` 校验密码。
3. 提取 `ROLE_` 开头的角色。
4. 生成 JWT token。
5. 查询当前用户菜单树和权限列表。
6. 返回 `LoginDTO`。

`LoginDTO` 关键字段：

| 字段 | 说明 |
| --- | --- |
| `token` | JWT |
| `roles` | 当前用户角色 |
| `permissions` | 当前用户权限字符串集合 |
| `menus` | 当前用户可见菜单树 |

注意：`UserDetails.getAuthorities()` 中会同时包含角色和按钮权限，因此返回给前端的 `roles` 必须过滤 `ROLE_` 前缀，不能把 `sys:config:query` 这类权限混进角色数组。

### 2. JWT 过滤器

`JwtAuthenticationFilter` 的职责：

1. 读取 `Authorization: Bearer <token>`。
2. 校验 token。
3. 根据 token 中的用户名重新加载用户权限。
4. 构造 `UsernamePasswordAuthenticationToken`。
5. 写入 `SecurityContextHolder`。

项目使用 JWT 时，Security 配置应设置为无状态：

```java
session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
```

否则浏览器可能复用旧 session，导致角色权限刚分配后仍然使用旧的 `SecurityContext`。

### 3. 加载用户权限

`CustomUserDetailsService` 负责把数据库中的角色和权限转换为 Spring Security 的 `GrantedAuthority`。

加载逻辑：

1. 查询 `sys_user`。
2. 查询 `sys_user_authority` 得到角色 ID。
3. 查询 `sys_authority` 得到角色名。
4. 把角色名加入 `SimpleGrantedAuthority`。
5. 通过 `SysMenuService.getCurrentUserPermissions` 查询菜单权限。
6. 把权限字符串也加入 `SimpleGrantedAuthority`。

这样后端接口才能使用：

```java
@PreAuthorize("hasRole('ADMIN') or hasAuthority('sys:config:query')")
```

### 4. 接口鉴权

每个业务接口按操作类型声明权限。

示例：

```java
@GetMapping("/page")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('sys:config:query')")
public ResponseEntity<IPage<SysConfigDTO>> page(Page<SysConfig> pageRequest, SysConfigQuery query) {
    return ResponseEntity.ok(sysConfigService.page(pageRequest, query));
}

@PostMapping
@PreAuthorize("hasRole('ADMIN') or hasAuthority('sys:config:create')")
public ResponseEntity<SysConfigDTO> create(@Validated @RequestBody SysConfigDTO dto) {
    return ResponseEntity.ok(sysConfigService.create(dto));
}
```

权限命名建议：

| 操作 | 权限 |
| --- | --- |
| 查询 | `模块:资源:query` |
| 新增 | `模块:资源:create` |
| 修改 | `模块:资源:update` |
| 删除 | `模块:资源:delete` |
| 导入 | `模块:资源:import` |
| 导出 | `模块:资源:export` |

本项目系统模块使用 `sys:*`，例如：

- `sys:user:query`
- `sys:role:update`
- `sys:config:export`
- `sys:menu:sync`

## 四、后端菜单树生成

### 1. 管理员菜单

管理员拥有全部启用菜单：

```java
sysMenuMapper.selectList(
    Wrappers.<SysMenu>lambdaQuery()
        .eq(SysMenu::getStatus, (byte) 1)
        .orderByAsc(SysMenu::getOrderNum)
        .orderByAsc(SysMenu::getId)
)
```

### 2. 普通用户菜单

普通用户菜单通过用户角色关系查询。

关键点：不能只返回用户直接拥有的菜单 ID，还要补齐父级菜单。否则只分配了按钮或页面权限时，前端可能只看到父级，或者页面无法挂到完整树上。

当前实现使用递归 CTE：

```sql
WITH RECURSIVE user_menus AS (
    SELECT DISTINCT m.*
    FROM sys_menu m
    INNER JOIN sys_authority_menu am ON am.menu_id = m.id
    INNER JOIN sys_user_authority ua ON ua.role_id = am.authority_id
    WHERE ua.user_id = #{userId}
      AND m.status = 1
    UNION
    SELECT parent.*
    FROM sys_menu parent
    INNER JOIN user_menus child ON child.parent_id = parent.id
    WHERE parent.status = 1
)
SELECT DISTINCT *
FROM user_menus
ORDER BY order_num ASC, id ASC
```

查询结果再由 `buildTree` 按 `parentId` 组装为树。

### 3. 权限兼容映射

前端扫描菜单时如果生成过旧权限，例如：

- `system:sys-config:query`
- `system:sys-menu:update`

而后端接口要求：

- `sys:config:query`
- `sys:menu:update`

就会出现“分配了权限但接口 403”。项目通过 `PERMISSION_PREFIX_ALIASES` 做兼容扩展：

```java
"system:sys-config" -> "sys:config"
"system:sys-menu" -> "sys:menu"
"system:auth" -> "sys:role"
```

加载用户权限时同时保留旧权限和新权限，保证历史数据可用。

## 五、前端登录态与动态路由

### 1. 用户 Store

`useUserStore` 保存：

| 字段 | 说明 |
| --- | --- |
| `token` | JWT |
| `userInfo` | 当前用户信息 |
| `routesLoaded` | 动态路由是否已注册 |

常用 getter：

| getter | 说明 |
| --- | --- |
| `menus` | 后端返回的菜单树 |
| `permissions` | 权限字符串数组 |
| `roles` | 角色数组 |
| `isAdmin` | 是否包含 `ROLE_ADMIN` |

按钮和路由权限统一调用：

```ts
hasPermission(permission?: string | string[]) {
  if (!permission) return true;
  if (this.isAdmin) return true;
  const required = Array.isArray(permission) ? permission : [permission];
  return required.some((item) => this.permissions.includes(item));
}
```

### 2. 路由守卫

`router.beforeEach` 的核心步骤：

1. 没 token，跳转登录页。
2. 没用户信息或动态路由未加载，调用 `/auth/me`。
3. 根据 `userStore.menus` 注册动态路由。
4. 校验目标路由的 `meta.permission`。
5. 加载字典数据。
6. 放行。

动态权限变更后，前端要重新拉 `/auth/me`，否则 localStorage 中可能还是旧菜单和旧权限。

### 3. 动态路由注册

`registerMenuRoutes(router, menus)` 把后端菜单树转换为 Vue Router 记录。

转换规则：

| 菜单类型 | 前端处理 |
| --- | --- |
| `type=1` 目录 | 使用 Layout，递归挂 children |
| `type=2` 页面 | 使用 `component` 解析真实页面组件 |
| `type=3` 按钮 | 不注册路由 |

组件解析逻辑：

```ts
const viewModules = import.meta.glob("/src/views/**/*.vue");
```

后端 `component = system/sys-config/index` 时，前端会尝试匹配：

```text
/src/views/system/sys-config/index.vue
/src/views/system/sys-config/index/index.vue
```

如果找不到组件，当前项目回退到 dashboard。生产系统建议改成显式错误页或在菜单保存时校验组件路径。

### 4. 路由 meta 权限

动态路由会把菜单 `perms` 写入：

```ts
meta: {
  title: menu.name,
  icon: menu.icon,
  permission: menu.perms,
}
```

路由守卫用 `meta.permission` 做页面访问控制。按钮权限则由指令控制。

## 六、按钮权限指令

项目通过 `v-permission` 控制按钮显示。

示例：

```vue
<AppButton v-permission="'sys:config:create'" action="add" @click="handleAdd">
  新增
</AppButton>
```

指令逻辑：

1. 读取绑定值。
2. 调用 `userStore.hasPermission`。
3. 没权限则移除 DOM。

注意：

- 前端按钮隐藏不是安全边界。
- 后端接口仍必须使用 `@PreAuthorize`。
- 按钮权限标识必须和接口权限一致。

## 七、角色权限分配

角色表单使用 `el-tree` 展示菜单权限树。

关键参数：

| 参数 | 说明 |
| --- | --- |
| `node-key="id"` | 使用菜单 ID 作为唯一 key |
| `show-checkbox` | 显示复选框 |
| `default-expand-all` | 默认展开 |
| `default-checked-keys` | 回显已分配权限 |

保存时需要同时提交全选节点和半选父节点：

```ts
form.permissionIds = [
  ...treeRef.value.getCheckedKeys(),
  ...treeRef.value.getHalfCheckedKeys(),
];
```

这样分配某个页面的按钮权限时，父级目录也会保存，后端菜单树更完整。

后端保存角色权限的步骤：

1. 校验角色存在。
2. 更新角色基础信息。
3. 删除旧的 `sys_authority_menu` 关系。
4. 插入新的菜单关系。
5. 事务提交。

事务很重要。否则删除旧关系后插入失败，会导致角色权限被清空。

## 八、用户角色分配

用户表单保存用户和角色关系。

保存步骤：

1. 新增或更新用户基础信息。
2. 删除该用户旧的 `sys_user_authority` 关系。
3. 将前端提交的 `authorityIds` 转为角色 ID。
4. 去重后插入新的用户角色关系。

注意：

- 关系表主键策略要和数据库一致。
- 如果数据库 `id` 不是自增，实体必须使用 `IdType.ASSIGN_ID`。
- 删除旧关系和插入新关系必须在同一个事务里。

## 九、菜单扫描与同步

前端菜单扫描器用于从 `src/views` 目录推导菜单结构。

扫描规则：

1. 只扫描 `index.vue` 页面。
2. 跳过登录页、仪表盘、账号页和字典数据内嵌页。
3. 根据路径推导路由和组件。
4. 根据页面源码中出现的函数推导操作权限。

常见操作推导：

| 函数/模式 | 操作 |
| --- | --- |
| `loadData`、`handleQuery` | `query` |
| `handleAdd`、`create` | `create` |
| `handleEdit`、`update` | `update` |
| `handleDelete`、`delete` | `delete` |
| `uploadExcel`、`importExcel` | `import` |
| `exportExcel` | `export` |

为了和后端接口保持一致，扫描器使用别名映射：

```ts
const pageAliases = {
  "system/user": { path: "user", permissionPrefix: "sys:user" },
  "system/auth": { path: "role", permissionPrefix: "sys:role" },
  "system/sys-dict-type": { path: "dict", permissionPrefix: "sys:dict" },
  "system/sys-config": { path: "config", permissionPrefix: "sys:config" },
  "system/sys-menu": { path: "menu", permissionPrefix: "sys:menu" },
};
```

设计原则：

- 前端路径不一定等于权限前缀。
- 权限前缀必须服从后端接口。
- 同步菜单前最好先确认不会产生重复页面。

## 十、校验逻辑清单

### 1. 登录校验

- 用户名不能为空。
- 密码不能为空。
- 用户存在。
- 密码 hash 匹配。
- 用户启用状态有效。

### 2. 路由校验

- 没 token 跳转登录页。
- 没注册动态路由时先拉用户信息。
- 目标路由有 `meta.permission` 时校验权限。
- 无权限跳转安全页，例如 dashboard。

### 3. 按钮校验

- 前端用 `v-permission` 隐藏按钮。
- 后端用 `@PreAuthorize` 拦截接口。
- 导入、导出也必须有独立权限。

### 4. 菜单校验

- 目录可以没有组件。
- 页面必须有组件。
- 按钮不能注册路由。
- `path` 在同级下应唯一。
- `perms` 应和后端接口一致。

### 5. 角色保存校验

- 角色名唯一。
- 角色 ID 存在。
- 菜单 ID 必须存在。
- 保存关系时去重。
- 删除旧关系和插入新关系使用事务。

## 十一、常见问题

### 1. 分配权限后接口仍然 403

排查顺序：

1. 浏览器 Network 看 403 的具体接口。
2. 找到后端接口 `@PreAuthorize` 要求的权限。
3. 查看 `/auth/me` 返回的 `permissions` 是否包含该权限。
4. 检查 `sys_authority_menu` 是否关联了正确菜单 ID。
5. 检查菜单 `perms` 是否和接口一致。
6. 重启后端并重新登录，排除旧 session 或旧 token。

### 2. 只显示父级菜单，不显示页面

通常是普通用户菜单查询只返回了直接分配的权限，没有补齐父级。解决方式是递归查询祖先菜单，或者保存角色权限时把半选父节点也保存。

### 3. 按钮不显示但接口可访问

说明前端 `permissions` 缺少按钮权限，但后端 `SecurityContext` 里可能有。检查 `/auth/me` 返回值和 `CustomUserDetailsService` 加载逻辑是否一致。

### 4. 页面能打开但接口报错

页面路由权限和接口权限不是同一个权限标识。页面通常用 `query` 权限，新增、修改、删除接口必须分别分配 `create/update/delete`。

### 5. 菜单同步后生成了错误权限

前端路径和后端权限前缀不同。例如 `system/sys-config` 页面对应的接口权限是 `sys:config:*`，不是 `system:sys-config:*`。需要在扫描器里做别名映射。

## 十二、推荐新增一个页面的步骤

以新增“公告管理”为例：

1. 前端新增页面：`src/views/system/notice/index.vue`。
2. 前端新增 API：`src/api/system/notice.ts`。
3. 后端新增 Controller：`/system/notice`。
4. 后端接口权限：
   - `sys:notice:query`
   - `sys:notice:create`
   - `sys:notice:update`
   - `sys:notice:delete`
   - `sys:notice:import`
   - `sys:notice:export`
5. 菜单表新增页面节点：
   - `path = notice`
   - `component = system/notice/index`
   - `perms = sys:notice:query`
6. 菜单表新增按钮节点。
7. 角色分配公告管理权限。
8. 重新登录测试：
   - 菜单显示。
   - 页面能打开。
   - 查询接口成功。
   - 无新增权限时新增按钮隐藏。
   - 直接调用新增接口返回 403。

## 十三、实现原则总结

1. 菜单决定路由，权限决定动作。
2. 前端控制体验，后端控制安全。
3. 权限字符串必须统一命名。
4. 角色保存菜单 ID，登录时再解析权限字符串。
5. JWT 项目应使用无状态 session。
6. 普通用户菜单必须补齐父级目录。
7. 动态路由注册前必须重新拉取当前用户菜单。
8. 菜单扫描只能辅助生成，不能替代权限命名规范。
