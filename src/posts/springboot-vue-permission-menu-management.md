---
title: Spring Boot + Vue 后台权限管理与菜单管理实战
date: 2026-07-21
category: Java
tag:
  - Spring Boot
  - Vue
  - 权限管理
  - 菜单管理
  - RBAC
isOriginal: true
excerpt: 基于 yin 后端和 yang 前端项目，完整整理 RBAC 权限模型、菜单树、按钮权限、后端方法级鉴权、前端动态路由、侧边栏渲染、v-permission 指令，以及从 Vue views 目录扫描菜单并同步到后端的实现方式。
---

# Spring Boot + Vue 后台权限管理与菜单管理实战

## 背景

后台管理系统通常会同时遇到两个问题：

1. 用户登录后只能看到自己有权限访问的菜单。
2. 页面里的新增、编辑、删除、导入、导出等按钮也要按权限显示，并且后端接口必须真正拦截无权限访问。

这次改造基于两个项目：

```text
D:\WorkSpace\MySpace\codex\spring
├── yin   # Spring Boot 后端
└── yang  # Vue 前端
```

已有表结构中已经具备 RBAC 的基础关系，因此改造重点不是重新设计一套复杂权限中心，而是在现有表上补齐菜单树、按钮权限、动态路由、方法级鉴权和前端菜单扫描能力。

## 表结构与模型

本次权限设计围绕五张核心表展开：

```text
sys_user             用户表
sys_authority        角色/权限身份表
sys_user_authority   用户-角色关系表
sys_menu             菜单与按钮权限表
sys_authority_menu   角色-菜单/按钮权限关系表
```

关系可以理解为：

```text
用户 -> 角色 -> 菜单/按钮权限
```

也就是用户不直接绑定菜单，而是通过角色拿到菜单和按钮权限。这样做的好处是：

- 一个用户可以有多个角色。
- 一个角色可以分配多个菜单和按钮权限。
- 菜单结构变化时，只需要维护角色和菜单的关系。
- 后端接口可以复用同一套权限编码做强校验。

## 菜单类型设计

`sys_menu` 同时承载目录、菜单和按钮权限，通过 `type` 字段区分：

```text
1 目录
2 菜单
3 按钮
```

推荐字段含义如下：

| 字段 | 说明 |
| --- | --- |
| `id` | 菜单主键 |
| `parentId` | 父级菜单 ID，根节点为 `0` |
| `name` | 菜单名称 |
| `path` | 前端路由路径 |
| `component` | Vue 组件路径 |
| `permission` | 权限编码，例如 `sys:user:create` |
| `type` | `1` 目录、`2` 菜单、`3` 按钮 |
| `icon` | 菜单图标 |
| `sort` | 排序 |
| `visible` | 是否显示到侧边栏 |
| `status` | 是否启用 |

目录和菜单主要控制前端路由与侧边栏，按钮权限主要控制页面操作和后端接口。

## 权限编码约定

权限编码建议使用稳定的三段式命名：

```text
业务域:资源:动作
```

本次项目中的系统管理权限可以这样设计：

```text
sys:user:query
sys:user:create
sys:user:update
sys:user:delete
sys:user:import
sys:user:export

sys:role:query
sys:role:create
sys:role:update
sys:role:delete

sys:menu:query
sys:menu:create
sys:menu:update
sys:menu:delete
sys:menu:sync

sys:dict:query
sys:dict:create
sys:dict:update
sys:dict:delete

sys:config:query
sys:config:create
sys:config:update
sys:config:delete
```

这个编码会同时被三处使用：

1. 存入 `sys_menu.permission`。
2. 前端 `v-permission` 判断按钮是否显示。
3. 后端 `@PreAuthorize` 判断接口是否允许访问。

因此权限编码一旦确定，尽量保持稳定，不要频繁改名。

## 后端实现

### 登录返回权限信息

登录成功后，前端不能只拿 token。为了渲染菜单和按钮，后端需要返回：

```java
private List<String> roles;
private List<String> permissions;
private List<SysMenuDTO> menus;
```

`AuthController` 在登录和 `/me` 接口中组装这些信息：

```java
loginDTO.setRoles(authorityService.getUserRoleCodes(user.getId()));
loginDTO.setPermissions(sysMenuService.listCurrentUserPermissions(user.getId(), roles));
loginDTO.setMenus(sysMenuService.listCurrentUserMenus(user.getId(), roles));
```

前端拿到的数据结构大致是：

```json
{
  "token": "...",
  "roles": ["ROLE_ADMIN"],
  "permissions": ["sys:user:query", "sys:user:create"],
  "menus": [
    {
      "id": 1000,
      "name": "系统管理",
      "type": 1,
      "path": "/system",
      "children": []
    }
  ]
}
```

### 查询当前用户菜单

普通用户通过角色关系查询菜单：

```sql
select distinct m.*
from sys_menu m
join sys_authority_menu am on am.menu_id = m.id
join sys_user_authority ua on ua.authority_id = am.authority_id
where ua.user_id = #{userId}
  and m.status = 1
order by m.sort asc, m.id asc
```

管理员角色使用 bypass 策略，直接读取全部启用菜单：

```java
private boolean isAdmin(List<String> roles) {
    return roles != null && roles.contains("ROLE_ADMIN");
}
```

这样可以减少初始化阶段的权限配置成本，也避免管理员误删自身菜单后无法进入系统管理页面。

### 构建菜单树

数据库保存的是扁平结构，接口返回给前端前要构造成树：

```java
public List<SysMenuDTO> listCurrentUserMenus(Long userId, List<String> roles) {
    List<SysMenu> menus = isAdmin(roles)
            ? listEnabledMenus()
            : sysMenuMapper.selectByUserId(userId);
    return buildTree(menus);
}
```

树构建时按 `parentId` 归类，再从 `parentId = 0` 的节点开始挂载子节点。按钮节点也可以保留在树中，但前端渲染侧边栏时只展示 `type = 1` 和 `type = 2`。

### 加载 Spring Security 权限

只在登录响应里返回权限是不够的。后端接口真正鉴权时，Spring Security 的 `Authentication` 里也必须有角色和按钮权限。

`CustomUserDetailsService` 加载用户时，把角色和按钮权限都放进 `GrantedAuthority`：

```java
List<GrantedAuthority> authorities = new ArrayList<>();
roles.forEach(role -> authorities.add(new SimpleGrantedAuthority(role)));
permissions.forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
```

JWT 过滤器解析 token 后，不再只信任 token 里的角色，而是重新加载用户详情：

```java
UserDetails userDetails = userDetailsService.loadUserByUsername(username);

UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );
```

这样角色和按钮权限的变化会在下一次请求重新加载时生效，不需要把所有权限长期塞进 token。

### 开启方法级鉴权

Spring Boot 3 + Spring Security 6 中使用：

```java
@EnableMethodSecurity
@Configuration
public class SecurityConfig {
}
```

开启后，Controller 方法可以直接使用 `@PreAuthorize`。

### 接口权限控制

系统用户接口示例：

```java
@GetMapping
@PreAuthorize("hasRole('ADMIN') or hasAuthority('sys:user:query')")
public ResponseEntity<PageDTO<UserDTO>> page(UserQuery query) {
    return ResponseEntity.ok(userService.page(query));
}

@PostMapping
@PreAuthorize("hasRole('ADMIN') or hasAuthority('sys:user:create')")
public ResponseEntity<UserDTO> create(@RequestBody UserDTO dto) {
    return ResponseEntity.ok(userService.create(dto));
}

@DeleteMapping("/{id}")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('sys:user:delete')")
public ResponseEntity<Void> delete(@PathVariable Long id) {
    userService.remove(id);
    return ResponseEntity.noContent().build();
}
```

菜单、角色、字典、配置等系统接口也按同样方式补齐：

```java
sys:menu:query
sys:menu:create
sys:menu:update
sys:menu:delete
sys:menu:sync

sys:role:query
sys:role:create
sys:role:update
sys:role:delete
```

前端隐藏按钮只能改善体验，真正的权限边界必须在这里。

### 403 统一返回

没有权限时，`AccessDeniedException` 应该返回明确的 403：

```java
@ExceptionHandler(AccessDeniedException.class)
public ResponseEntity<Result<Void>> handleAccessDenied(AccessDeniedException ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(Result.fail(403, "没有权限执行此操作"));
}
```

这样前端可以统一提示，也方便调试权限缺失问题。

### 角色保存菜单权限

角色授权页面使用树控件时，只提交全选节点会丢失半选父节点。比如勾选了“用户新增”按钮，但没有提交父级“用户管理”，动态菜单可能无法完整展示。

前端保存角色时应提交：

```ts
const checkedKeys = menuTreeRef.value.getCheckedKeys();
const halfCheckedKeys = menuTreeRef.value.getHalfCheckedKeys();
form.menuIds = [...checkedKeys, ...halfCheckedKeys];
```

后端保存时先删除旧关系，再插入新关系：

```java
authorityMenuMapper.deleteByAuthorityId(authorityId);
authorityMenuMapper.batchInsert(authorityId, menuIds);
```

删除角色时也要先删除 `sys_authority_menu` 中的关系，避免外键或脏数据问题。

### 菜单扫描同步接口

为了减少手工维护菜单，本次在菜单管理中新增了扫描同步接口：

```java
@PostMapping("/scan/sync")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('sys:menu:sync')")
public ResponseEntity<List<SysMenuDTO>> syncScannedMenus(@RequestBody List<SysMenuDTO> menus) {
    return ResponseEntity.ok(sysMenuService.syncScannedMenus(menus));
}
```

同步逻辑的关键点：

- 前端传入扫描出的目录、菜单、按钮树。
- 后端按 `path + permission + type` 等稳定信息做匹配。
- 已存在的菜单执行更新。
- 不存在的菜单执行新增。
- 补齐默认字段，例如 `visible`、`status`、`sort`、`parentId`。
- 同步完成后返回最新菜单树。

菜单删除要谨慎。当前实现中删除菜单前会检查是否存在子菜单，避免误删父节点导致树结构断裂。

## 前端实现

### 用户状态

登录用户信息扩展为：

```ts
export interface LoginUserInfo {
  token?: string;
  username?: string;
  nickname?: string;
  roles?: string[];
  permissions?: string[];
  menus?: SysMenuDTO[];
}
```

Pinia 中提供常用 getter：

```ts
menus: (state) => state.userInfo?.menus || [],
permissions: (state) => state.userInfo?.permissions || [],
roles: (state) => state.userInfo?.roles || [],
isAdmin: (state) => state.userInfo?.roles?.includes("ROLE_ADMIN") || false,
```

按钮判断统一走：

```ts
hasPermission(permission: string | string[]) {
  if (this.isAdmin) {
    return true;
  }
  const required = Array.isArray(permission) ? permission : [permission];
  return required.some((item) => this.permissions.includes(item));
}
```

### 动态路由

后端返回菜单树后，前端根据菜单生成路由：

```ts
const modules = import.meta.glob("/src/views/**/*.vue");

function resolveComponent(component?: string) {
  if (!component) {
    return modules["/src/views/dashboard/index.vue"];
  }
  return modules[`/src/views/${component}.vue`]
      || modules[`/src/views/${component}/index.vue`]
      || modules["/src/views/dashboard/index.vue"];
}
```

只把 `type = 1` 和 `type = 2` 的节点转换成路由，按钮节点只作为权限使用：

```ts
function buildMenuRoutes(menus: SysMenuDTO[]): RouteRecordRaw[] {
  return menus
    .filter((menu) => menu.type !== 3)
    .map((menu) => ({
      path: menu.path,
      name: menu.name,
      component: resolveComponent(menu.component),
      meta: {
        title: menu.name,
        icon: menu.icon,
        permission: menu.permission,
      },
      children: buildMenuRoutes(menu.children || []),
    }));
}
```

注册路由时使用：

```ts
router.addRoute(route);
```

为了避免每次跳转重复注册，用户状态中增加 `routesLoaded` 标记。

### 路由守卫

路由守卫负责三件事：

1. 没有 token 时跳转登录页。
2. 有 token 但没有用户信息时调用 `/me`。
3. 用户信息加载完成后注册后端菜单路由。

示例流程：

```ts
router.beforeEach(async (to) => {
  if (!token && to.path !== "/login") {
    return "/login";
  }

  if (token && !userStore.userInfo) {
    await userStore.getUserInfo();
  }

  if (!userStore.routesLoaded) {
    registerMenuRoutes(router, userStore.menus);
    userStore.setRoutesLoaded(true);
    return to.fullPath;
  }

  const permission = to.meta.permission;
  if (permission && !userStore.hasPermission(permission as string)) {
    return "/403";
  }
});
```

这里的前端路由权限仍然是体验层保护，真正的安全控制仍然依赖后端 `@PreAuthorize`。

### 侧边栏菜单

侧边栏不再写死静态路由，而是读取后端菜单树：

```ts
const menus = computed(() => filterMenuRoutes(userStore.menus));

function filterMenuRoutes(menus: SysMenuDTO[]) {
  return menus
    .filter((menu) => menu.type !== 3 && menu.visible !== false)
    .map((menu) => ({
      ...menu,
      children: filterMenuRoutes(menu.children || []),
    }));
}
```

递归组件 `SidebarMenuItem.vue` 负责渲染多级菜单。这样菜单顺序、名称、图标、隐藏状态都能由后端控制。

### 按钮权限指令

前端新增 `v-permission` 指令：

```ts
app.directive("permission", {
  mounted(el, binding) {
    const userStore = useUserStore();
    if (!userStore.hasPermission(binding.value)) {
      el.parentNode?.removeChild(el);
    }
  },
});
```

页面按钮使用方式：

```vue
<el-button
  v-permission="'sys:user:create'"
  type="primary"
  @click="handleAdd"
>
  新增
</el-button>

<el-button
  v-permission="'sys:user:delete'"
  type="danger"
  @click="handleDelete(row)"
>
  删除
</el-button>
```

管理员因为有 `ROLE_ADMIN`，`hasPermission` 会直接返回 `true`。

## 前端菜单扫描

### 为什么要扫描

后台管理系统的菜单通常和前端目录强相关。例如：

```text
src/views/system/sys-user/index.vue
src/views/system/sys-role/index.vue
src/views/system/sys-menu/index.vue
src/views/system/sys-dict/index.vue
src/views/system/sys-config/index.vue
```

如果每个菜单都手工录入，很容易出现路径、组件、权限编码不一致。扫描功能的目标是：

- 从 `src/views` 目录自动发现页面。
- 按目录生成 `type = 1` 的目录节点。
- 按 `index.vue` 页面生成 `type = 2` 的菜单节点。
- 根据页面源码中的常见方法名推断按钮权限。
- 扫描结果先预览，再由管理员确认同步。

### 使用 import.meta.glob 扫描页面

Vite 支持在构建时扫描文件：

```ts
const viewModules = import.meta.glob("/src/views/**/*.vue", {
  query: "?raw",
  import: "default",
  eager: true,
});
```

这里使用 `?raw` 是为了拿到 Vue 文件源码，方便判断页面里是否存在 `handleAdd`、`handleEdit`、`handleDelete`、`exportExcel` 等方法。

### 目录转菜单

扫描器会把路径拆成层级：

```text
/src/views/system/sys-user/index.vue
```

转换为：

```text
系统管理(type=1)
└── 用户管理(type=2)
    ├── 查询(type=3, permission=sys:user:query)
    ├── 新增(type=3, permission=sys:user:create)
    ├── 编辑(type=3, permission=sys:user:update)
    └── 删除(type=3, permission=sys:user:delete)
```

组件路径保存为：

```text
system/sys-user/index
```

路由路径保存为：

```text
/system/sys-user
```

### 按钮权限推断

扫描器根据源码中的常见函数名推断按钮：

| 页面源码特征 | 推断权限 |
| --- | --- |
| `handleQuery`、`loadData`、`fetchList` | `query` |
| `handleAdd`、`openCreate` | `create` |
| `handleEdit`、`handleUpdate` | `update` |
| `handleDelete`、`remove` | `delete` |
| `uploadExcel`、`handleImport` | `import` |
| `exportExcel`、`handleExport` | `export` |

推断出的权限编码会结合模块名生成，例如用户管理页面生成：

```text
sys:user:create
sys:user:update
sys:user:delete
```

这类扫描是启发式能力，不能完全替代人工确认。同步前必须在预览弹窗里检查菜单名称、路径、组件和按钮权限是否符合预期。

### 菜单管理页面同步

菜单管理页新增“扫描前端菜单”按钮：

```vue
<el-button
  v-permission="'sys:menu:sync'"
  type="primary"
  @click="handleScanMenus"
>
  扫描前端菜单
</el-button>
```

点击后执行：

```ts
const scannedMenus = scanFrontendMenus();
scanData.value = scannedMenus;
scanDialogVisible.value = true;
```

管理员在预览弹窗确认后调用：

```ts
await syncScannedMenus(scanData.value);
```

后端同步完成后刷新菜单树。

## 初始化数据

为了让系统第一次启动后可用，`init.sql` 中需要准备系统管理菜单和按钮权限，并给管理员角色授权。

核心菜单包括：

```text
系统管理
├── 用户管理
├── 角色管理
├── 菜单管理
├── 字典管理
└── 参数配置
```

每个页面下增加对应按钮权限，例如：

```text
sys:user:query
sys:user:create
sys:user:update
sys:user:delete
sys:user:import
sys:user:export
```

管理员角色授权可以使用：

```sql
insert into sys_authority_menu (id, authority_id, menu_id)
select id + 100000, 1, id from sys_menu;
```

如果你的主键策略不是手工 ID，需要改成项目实际的 ID 生成方式。

## 使用流程

完整使用步骤如下：

1. 执行或更新 `yin-admin/src/main/resources/sql/init.sql`，确保 `sys_menu` 和 `sys_authority_menu` 初始化完成。
2. 启动后端 `yin`，确认登录接口能返回 `roles`、`permissions`、`menus`。
3. 启动前端 `yang`，使用管理员账号登录。
4. 进入“系统管理 -> 菜单管理”。
5. 点击“扫描前端菜单”，检查预览中的目录、菜单、按钮权限。
6. 确认无误后点击同步，把扫描结果写入后端。
7. 进入“角色管理”，给普通角色分配菜单和按钮权限。
8. 给测试用户绑定普通角色。
9. 使用测试用户登录，验证侧边栏、按钮和接口权限是否都符合预期。

验证时至少覆盖三类场景：

- 未分配菜单时，侧边栏不显示对应菜单。
- 分配菜单但未分配按钮时，页面可进入，但新增、删除等按钮不显示。
- 直接调用未授权接口时，后端返回 403。

## 常见问题

### 前端隐藏按钮是否等于安全

不等于。`v-permission` 只是减少用户看到无权限按钮的困惑，无法阻止用户手工构造 HTTP 请求。

真正的权限控制必须依赖后端：

```java
@PreAuthorize("hasRole('ADMIN') or hasAuthority('sys:user:delete')")
```

### 为什么管理员要 bypass

管理员通常承担系统初始化和权限修复职责。如果管理员也完全依赖菜单授权，一旦角色菜单关系被误删，就可能无法进入菜单管理页面修复数据。

因此管理员保留：

```java
hasRole('ADMIN')
```

作为兜底权限。

### 为什么角色保存要提交半选节点

菜单树中，父节点经常只是目录，不直接被勾选为叶子节点。如果只保存全选节点，父目录关系可能丢失，导致前端构建菜单树时缺少上级目录。

因此保存角色菜单时要合并：

```ts
checkedKeys + halfCheckedKeys
```

### 扫描菜单是否可以自动删除数据库菜单

不建议默认自动删除。扫描结果来自当前前端目录，可能因为临时分支、页面重命名或扫描规则不完善导致缺失。自动删除会影响线上角色权限。

更稳妥的方式是：

- 扫描同步只新增和更新。
- 删除菜单由管理员在菜单管理页面手工操作。
- 删除前检查是否存在子菜单或角色绑定。

## 本次改造涉及的关键文件

后端：

```text
yin-admin/src/main/java/com/yinyang/yin/controller/system/AuthController.java
yin-admin/src/main/java/com/yinyang/yin/controller/system/SysMenuController.java
yin-admin/src/main/java/com/yinyang/yin/config/SecurityConfig.java
yin-admin/src/main/java/com/yinyang/yin/security/CustomUserDetailsService.java
yin-admin/src/main/java/com/yinyang/yin/security/JwtAuthenticationFilter.java
yin-system/src/main/java/com/yinyang/yin/service/system/SysMenuService.java
yin-system/src/main/java/com/yinyang/yin/mapper/system/SysMenuMapper.java
yin-system/src/main/resources/mapper/system/SysMenuMapper.xml
yin-admin/src/main/resources/sql/init.sql
```

前端：

```text
yang/src/router/permission.ts
yang/src/router/guard.ts
yang/src/store/user.ts
yang/src/layout/Sidebar.vue
yang/src/layout/SidebarMenuItem.vue
yang/src/directives/permission.ts
yang/src/utils/menuScanner.ts
yang/src/views/system/sys-menu/index.vue
yang/src/views/system/auth/components/AuthForm.vue
```

## 总结

这次权限管理改造的核心是把一套 RBAC 数据真正贯穿到前后端：

- 后端通过 `sys_user -> sys_authority -> sys_menu` 查询角色、菜单和按钮权限。
- Spring Security 使用角色和按钮权限构建 `GrantedAuthority`。
- Controller 使用 `@PreAuthorize` 做接口级强校验。
- 前端根据后端菜单树动态注册路由并渲染侧边栏。
- 页面按钮通过 `v-permission` 做体验层隐藏。
- 菜单扫描器根据 Vue `views` 目录生成菜单和按钮权限，降低手工维护成本。

最终效果是：菜单展示、按钮显示、接口访问都使用同一套权限编码，权限问题更容易定位，也更适合继续扩展到审计日志、数据权限和租户隔离。
