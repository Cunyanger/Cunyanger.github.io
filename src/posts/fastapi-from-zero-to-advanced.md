---
title: FastAPI 从入门到进阶：构建高性能 Python API 服务
date: 2026-07-20
category: Python
tag:
  - FastAPI
  - Python
  - API
  - Pydantic
  - 后端
isOriginal: true
excerpt: 从 FastAPI 的定位、安装、路由、参数校验、Pydantic、依赖注入、数据库、认证、异步和部署，系统掌握现代 Python API 开发。
---

# FastAPI 从入门到进阶：构建高性能 Python API 服务

FastAPI 是一个现代 Python Web 框架，适合构建 API 服务。它基于类型注解、Pydantic 数据校验和 ASGI 生态，具备自动生成 OpenAPI 文档、请求参数校验、依赖注入和异步支持等能力。

如果你的目标是开发 REST API、AI 服务接口、后台管理接口或微服务，FastAPI 是非常适合入门和生产使用的选择。

## FastAPI 解决什么问题

传统 Python Web 开发中，经常需要手写：

- 请求参数解析。
- 参数类型转换。
- 必填校验。
- JSON 序列化。
- API 文档。
- 错误响应。

FastAPI 利用 Python 类型注解自动完成大量工作。

例如：

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/users/{user_id}")
def get_user(user_id: int, active: bool = True):
    return {"user_id": user_id, "active": active}
```

这里 `user_id` 会自动转成整数，`active` 会自动解析成布尔值。如果参数不合法，FastAPI 会返回标准错误响应。

## 安装和启动

安装：

```bash
pip install "fastapi[standard]"
```

最小应用：

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello FastAPI"}
```

启动：

```bash
fastapi dev main.py
```

或使用 Uvicorn：

```bash
uvicorn main:app --reload
```

访问：

```text
http://127.0.0.1:8000
http://127.0.0.1:8000/docs
```

`/docs` 是自动生成的交互式 API 文档。

## 路由和请求方法

常见 HTTP 方法：

```python
@app.get("/users")
def list_users():
    return []

@app.post("/users")
def create_user():
    return {"ok": True}

@app.put("/users/{user_id}")
def update_user(user_id: int):
    return {"user_id": user_id}

@app.delete("/users/{user_id}")
def delete_user(user_id: int):
    return {"deleted": user_id}
```

FastAPI 用装饰器绑定路径和方法。路径参数、查询参数和请求体可以通过函数参数区分。

## Pydantic 请求体模型

FastAPI 使用 Pydantic 定义请求体和响应模型。

```python
from pydantic import BaseModel, EmailStr, Field

class UserCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    age: int | None = Field(default=None, ge=0, le=150)

@app.post("/users")
def create_user(request: UserCreateRequest):
    return {
        "username": request.username,
        "email": request.email,
        "age": request.age,
    }
```

优点：

- 自动解析 JSON。
- 自动校验字段。
- 自动生成 OpenAPI schema。
- 自动生成文档示例。

## 响应模型

不要把数据库对象直接返回给前端。定义响应模型：

```python
class UserResponse(BaseModel):
    id: int
    username: str
    email: str

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int):
    return {
        "id": user_id,
        "username": "alice",
        "email": "alice@example.com",
        "password_hash": "secret"
    }
```

`response_model` 会过滤掉未声明字段，例如 `password_hash` 不会返回。

## 依赖注入

FastAPI 的 `Depends` 可以抽取公共逻辑。

例如分页参数：

```python
from fastapi import Depends
from pydantic import BaseModel, Field

class PageQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)

def get_page_query(page: int = 1, size: int = 20) -> PageQuery:
    return PageQuery(page=page, size=size)

@app.get("/users")
def list_users(page: PageQuery = Depends(get_page_query)):
    return {"page": page.page, "size": page.size}
```

常见依赖：

- 数据库会话
- 当前登录用户
- 权限校验
- 分页参数
- 配置对象
- 外部客户端

## APIRouter 组织项目

项目变大后，不要把所有接口写在 `main.py`。

推荐结构：

```text
app/
  main.py
  api/
    users.py
    orders.py
  schemas/
    user.py
    order.py
  services/
    user_service.py
  repositories/
    user_repository.py
  core/
    config.py
    security.py
```

路由模块：

```python
from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{user_id}")
def get_user(user_id: int):
    return {"user_id": user_id}
```

主应用：

```python
from fastapi import FastAPI
from app.api import users

app = FastAPI()
app.include_router(users.router)
```

## 异步与同步

FastAPI 支持同步和异步函数。

同步：

```python
@app.get("/sync")
def sync_api():
    return {"mode": "sync"}
```

异步：

```python
@app.get("/async")
async def async_api():
    return {"mode": "async"}
```

什么时候用 async？

- 调用异步数据库驱动。
- 调用异步 HTTP 客户端。
- I/O 密集任务。

不要为了 async 而 async。如果内部使用同步数据库驱动，盲目加 `async` 不会自动提升性能。

## 数据库访问

常见选择：

- SQLAlchemy
- SQLModel
- Tortoise ORM
- 原生 asyncpg

示例依赖注入数据库会话：

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    return user_service.get_user(db, user_id)
```

建议分层：

```text
router -> service -> repository -> database
```

不要在路由函数里写复杂 SQL 和业务逻辑。

## 异常处理

FastAPI 内置 `HTTPException`：

```python
from fastapi import HTTPException

@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = find_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user
```

自定义异常：

```python
class BizException(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
```

全局处理：

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(BizException)
async def biz_exception_handler(request: Request, exc: BizException):
    return JSONResponse(
        status_code=400,
        content={"code": exc.code, "message": exc.message},
    )
```

## 认证和权限

常见认证方式：

- Session Cookie
- JWT
- OAuth2
- API Key

JWT 思路：

1. 用户登录，服务器签发 token。
2. 前端请求时带 `Authorization: Bearer token`。
3. 后端解析 token。
4. 注入当前用户。
5. 检查权限。

依赖示例：

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user = verify_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="未登录")
    return user
```

接口使用：

```python
@app.get("/me")
def me(current_user=Depends(get_current_user)):
    return current_user
```

## 后台任务

简单后台任务可以用 `BackgroundTasks`：

```python
from fastapi import BackgroundTasks

def send_email(email: str):
    pass

@app.post("/register")
def register(email: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(send_email, email)
    return {"ok": True}
```

复杂异步任务建议使用 Celery、RQ、Dramatiq 或消息队列，不要把长任务直接放在请求线程中。

## 部署

开发环境：

```bash
uvicorn main:app --reload
```

生产环境常见：

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

也可以配合 Gunicorn：

```bash
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4
```

前面通常放 Nginx：

```text
Client -> Nginx -> Uvicorn/Gunicorn -> FastAPI
```

生产要关注：

- 日志
- 超时
- CORS
- 限流
- 环境变量
- 健康检查
- Docker 镜像
- 数据库连接池
- 监控告警

## FastAPI 与 Flask 怎么选

FastAPI 更适合：

- API 服务
- 类型校验强
- 自动文档
- 异步 I/O
- 微服务
- AI 服务接口

Flask 更适合：

- 小型 Web 应用
- 简单后台
- 更自由的扩展组合
- 已有 Flask 生态项目

如果是新 API 项目，FastAPI 通常更省心。如果是传统 Web 页面和简单服务，Flask 仍然很轻量。

## 学习路线

1. 路由和参数。
2. Pydantic 模型。
3. APIRouter 项目拆分。
4. Depends 依赖注入。
5. 数据库和事务。
6. 认证和权限。
7. 异常处理和统一响应。
8. 异步 I/O。
9. 测试和部署。
10. 与 AI 模型、向量数据库、任务队列集成。

## 参考资料

- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [FastAPI Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Pydantic 官方文档](https://docs.pydantic.dev/)
- [Uvicorn 官方文档](https://www.uvicorn.org/)

## 总结

FastAPI 的核心优势是类型注解、Pydantic 校验、自动文档、依赖注入和 ASGI 异步生态。

入门阶段掌握路由、请求体和响应模型。进阶阶段掌握项目结构、数据库、异常、认证、测试和部署。真正生产化时，要把 FastAPI 当作后端服务框架，而不是只写几个接口函数。
