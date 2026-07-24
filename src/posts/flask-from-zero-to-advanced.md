---
title: Flask 从入门到进阶：理解轻量级 Python Web 框架
date: 2026-07-20
category: Python
tag:
  - Flask
  - Python
  - Web
  - API
  - 后端
isOriginal: true
excerpt: 从 Flask 的定位、路由、请求响应、模板、蓝图、应用工厂、数据库、认证、扩展和部署，系统掌握轻量级 Python Web 开发。
---

# Flask 从入门到进阶：理解轻量级 Python Web 框架

你提到的 `flash`，在 Python Web 框架语境下通常应是 Flask。Flask 是一个轻量级 Web 框架，它没有强制项目结构，也不内置 ORM、表单、认证等复杂能力，而是提供核心 Web 能力和扩展机制。

Flask 的特点是简单、灵活、容易理解，非常适合学习 Web 框架原理、小型应用、内部工具和传统服务端页面。

## Flask 和 FastAPI 的区别

Flask 更像一个轻量 Web 内核：

- 路由
- 请求对象
- 响应对象
- 模板渲染
- Cookie 和 Session
- 扩展机制

FastAPI 更偏现代 API 框架：

- 类型注解
- 自动参数校验
- OpenAPI 文档
- Pydantic 模型
- 异步支持

如果你要快速写一个 API 服务，FastAPI 很合适。如果你想理解 Web 应用基础，或者做页面渲染、小后台、内部系统，Flask 仍然非常值得学。

## 安装与最小应用

安装：

```bash
pip install flask
```

创建 `app.py`：

```python
from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    return "Hello Flask"
```

启动：

```bash
flask --app app run --debug
```

访问：

```text
http://127.0.0.1:5000
```

## 路由

定义 GET 接口：

```python
@app.route("/users")
def list_users():
    return {"items": []}
```

路径参数：

```python
@app.route("/users/<int:user_id>")
def get_user(user_id):
    return {"id": user_id}
```

指定请求方法：

```python
@app.route("/users", methods=["POST"])
def create_user():
    return {"ok": True}, 201
```

Flask 的路由非常直观，但参数校验需要你自己做或借助扩展。

## 请求和响应

读取查询参数：

```python
from flask import request

@app.route("/search")
def search():
    keyword = request.args.get("q", "")
    return {"keyword": keyword}
```

读取 JSON：

```python
@app.route("/users", methods=["POST"])
def create_user():
    data = request.get_json()
    username = data.get("username")
    return {"username": username}, 201
```

返回 JSON：

```python
from flask import jsonify

@app.route("/status")
def status():
    return jsonify({"status": "ok"})
```

## 模板渲染

Flask 常用于服务端渲染 HTML。

目录：

```text
templates/
  index.html
```

视图：

```python
from flask import render_template

@app.route("/")
def index():
    return render_template("index.html", title="首页")
```

模板：

```html
<!doctype html>
<html>
  <head>
    <title>{{ title }}</title>
  </head>
  <body>
    <h1>{{ title }}</h1>
  </body>
</html>
```

Flask 默认使用 Jinja2 模板引擎。

## 蓝图 Blueprint

项目变大后，不要把所有路由写在一个文件。使用 Blueprint 拆分模块。

目录：

```text
app/
  __init__.py
  user.py
  order.py
```

`user.py`：

```python
from flask import Blueprint

bp = Blueprint("user", __name__, url_prefix="/users")

@bp.route("/<int:user_id>")
def get_user(user_id):
    return {"id": user_id}
```

注册：

```python
from flask import Flask
from . import user

def create_app():
    app = Flask(__name__)
    app.register_blueprint(user.bp)
    return app
```

Blueprint 类似模块化路由。

## 应用工厂

生产项目推荐应用工厂模式。

```python
from flask import Flask

def create_app(config_object=None):
    app = Flask(__name__)

    if config_object:
        app.config.from_object(config_object)

    register_blueprints(app)
    register_extensions(app)
    register_error_handlers(app)

    return app
```

好处：

- 支持不同环境配置。
- 方便测试。
- 避免全局初始化混乱。
- 扩展注册更清晰。

启动：

```bash
flask --app "app:create_app()" run --debug
```

## 配置管理

Flask 配置可以来自对象、文件或环境变量。

```python
class Config:
    SECRET_KEY = "dev"
    SQLALCHEMY_DATABASE_URI = "sqlite:///app.db"

class ProductionConfig(Config):
    DEBUG = False
```

加载：

```python
app.config.from_object(ProductionConfig)
```

敏感配置不要写死在代码里，应该使用环境变量或密钥管理服务。

## 数据库

Flask 常搭配 SQLAlchemy：

```bash
pip install flask-sqlalchemy
```

初始化：

```python
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    db.init_app(app)
    return app
```

模型：

```python
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
```

实际项目还要配合 Flask-Migrate 管理数据库迁移。

## 表单和校验

Flask 本身不强制校验方案。

常见选择：

- WTForms
- Marshmallow
- Pydantic
- 手写校验

API 项目可以用 Pydantic：

```python
from pydantic import BaseModel, ValidationError

class UserCreateRequest(BaseModel):
    username: str
    age: int | None = None

@app.route("/users", methods=["POST"])
def create_user():
    try:
        payload = UserCreateRequest.model_validate(request.get_json())
    except ValidationError as e:
        return {"errors": e.errors()}, 400
    return payload.model_dump(), 201
```

这也是 FastAPI 比 Flask 省事的地方：FastAPI 把这套校验集成进框架了。

## Session、Cookie 和 flash 消息

Flask 支持 Session：

```python
from flask import session

app.secret_key = "dev-secret"

@app.route("/login")
def login():
    session["user_id"] = 1
    return "logged in"
```

Flask 里还有一个 `flash` 功能，用于在页面跳转后显示一次性消息：

```python
from flask import flash, redirect, url_for

@app.route("/save")
def save():
    flash("保存成功")
    return redirect(url_for("index"))
```

模板中读取：

```html
{% with messages = get_flashed_messages() %}
  {% if messages %}
    {% for message in messages %}
      <p>{{ message }}</p>
    {% endfor %}
  {% endif %}
{% endwith %}
```

这可能也是 `flash` 和 `Flask` 容易混淆的地方。

## 认证

Flask 不内置认证系统。常见选择：

- Flask-Login
- JWT
- OAuth
- 自研 Session 登录

简单登录状态：

```python
from functools import wraps
from flask import session, redirect, url_for

def login_required(view):
    @wraps(view)
    def wrapped_view(**kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return view(**kwargs)
    return wrapped_view
```

使用：

```python
@app.route("/profile")
@login_required
def profile():
    return "profile"
```

生产中要考虑密码哈希、CSRF、防暴力破解、Session 过期和权限模型。

## 错误处理

```python
@app.errorhandler(404)
def not_found(error):
    return {"message": "资源不存在"}, 404

@app.errorhandler(500)
def server_error(error):
    return {"message": "服务器错误"}, 500
```

业务异常：

```python
class BizError(Exception):
    def __init__(self, message):
        self.message = message

@app.errorhandler(BizError)
def handle_biz_error(error):
    return {"message": error.message}, 400
```

## 部署

开发服务器不能用于生产。

常见生产部署：

```text
Client -> Nginx -> Gunicorn -> Flask
```

启动：

```bash
gunicorn "app:create_app()" -w 4 -b 0.0.0.0:8000
```

生产关注：

- 关闭 debug。
- 使用环境变量配置。
- 配置日志。
- 设置超时。
- 配置反向代理。
- 使用 HTTPS。
- 数据库连接池。
- 健康检查。

## 推荐项目结构

```text
app/
  __init__.py
  config.py
  extensions.py
  blueprints/
    user.py
    order.py
  models/
    user.py
  services/
    user_service.py
  templates/
  static/
tests/
```

不要让路由函数直接承担全部业务逻辑。保持：

```text
route -> service -> model/repository
```

## 学习路线

1. 路由和请求响应。
2. 模板渲染。
3. Blueprint。
4. 应用工厂。
5. 配置管理。
6. SQLAlchemy。
7. 表单和校验。
8. Session 和认证。
9. 错误处理。
10. Gunicorn 和 Nginx 部署。

## 参考资料

- [Flask 官方文档](https://flask.palletsprojects.com/)
- [Flask Quickstart](https://flask.palletsprojects.com/en/stable/quickstart/)
- [Flask Blueprints](https://flask.palletsprojects.com/en/stable/blueprints/)
- [Flask Application Factories](https://flask.palletsprojects.com/en/stable/patterns/appfactories/)
- [Flask Deployment Options](https://flask.palletsprojects.com/en/stable/deploying/)

## 总结

Flask 的价值在于轻量和灵活。它适合帮助你理解 Web 框架本质，也适合构建小型应用、内部工具和传统服务端页面。

与 FastAPI 相比，Flask 对结构和校验没有强约束，因此初学时更容易上手，项目变大后更考验工程规范。掌握 Blueprint、应用工厂、配置管理、数据库、认证和部署后，Flask 仍然可以支撑稳定的生产应用。
