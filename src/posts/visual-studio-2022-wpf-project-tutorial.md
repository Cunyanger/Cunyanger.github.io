---
title: Visual Studio 2022 创建 WPF 项目详细教程：从安装环境到第一个 C# 桌面程序
date: 2026-08-02
category: C#
tag:
  - C#
  - WPF
  - Visual Studio 2022
  - .NET 8
  - XAML
isOriginal: true
excerpt: 面向第一次接触 C# 桌面开发的读者，详细讲解如何在 Visual Studio 2022 中安装 WPF 环境、创建 .NET 8 项目、认识解决方案和项目文件、编写 XAML 与 C# 事件代码，并完成生成、调试和常见问题排查。
---

# Visual Studio 2022 创建 WPF 项目详细教程：从安装环境到第一个 C# 桌面程序

WPF 是 Windows 平台常用的桌面界面技术。本教程从一台只安装了 Windows 的电脑开始，逐步完成以下目标：

1. 安装 Visual Studio 2022 和 WPF 所需组件。
2. 创建一个基于 `.NET 8` 的 WPF 项目。
3. 认识解决方案、项目、XAML、C#、SDK 和运行时等基本概念。
4. 使用 WPF 布局和控件完成一个简单的任务记录程序。
5. 使用 C# 处理按钮点击事件。
6. 学会生成、运行、断点调试和定位常见错误。

本文默认使用 Windows 10 或 Windows 11、Visual Studio 2022 和 `.NET 8`。`.NET 8` 是长期支持版本，适合学习和维护周期较长的桌面项目。

## 一、先理解 C#、.NET、WPF 和 Visual Studio 的关系

创建项目之前，先把几个经常一起出现的名词分清楚。

| 名词 | 它是什么 | 在本教程中的用途 |
| --- | --- | --- |
| C# | 一门编程语言 | 编写按钮点击、数据处理、文件读写等程序逻辑 |
| .NET | 应用开发和运行平台 | 提供编译器、运行时和大量基础类库 |
| WPF | .NET 上的 Windows 桌面 UI 框架 | 创建窗口、按钮、文本框、列表等界面 |
| XAML | 描述界面的标记语言 | 声明窗口布局、控件和样式 |
| Visual Studio 2022 | 集成开发环境，也叫 IDE | 创建项目、编辑代码、设计界面、编译和调试程序 |
| Windows SDK | Windows 开发工具和系统 API 集合 | 让项目能够调用和面向 Windows 平台生成程序 |

它们之间可以简单理解为：

```text
Visual Studio 2022
  └── 使用 .NET SDK 创建和编译项目
        ├── 使用 C# 编写程序逻辑
        └── 使用 WPF + XAML 编写 Windows 界面
```

### 1. 什么是 C#

C# 读作“C Sharp”，是一门强类型、面向对象的编程语言。

“强类型”表示变量有明确的数据类型。例如：

```csharp
string taskName = "学习 WPF";
int taskCount = 1;
bool isCompleted = false;
```

- `string` 表示文本。
- `int` 表示整数。
- `bool` 表示真或假。

类型可以帮助编译器提前发现错误。例如，不能直接把字符串赋给整数变量：

```csharp
int taskCount = "一个任务"; // 编译错误
```

“面向对象”表示程序通常由类和对象组成。在 WPF 中，一个窗口、一个按钮、一条任务数据都可以用对象表示。

### 2. 什么是 .NET

.NET 不是一门语言，而是一套开发平台，主要包括：

- **SDK**：Software Development Kit，软件开发工具包。用于创建、编译、测试和发布项目。
- **Runtime**：运行时。用于运行已经编译好的 .NET 程序。
- **类库**：提供字符串、集合、文件、网络、JSON 等常用能力。
- **CLR**：Common Language Runtime，公共语言运行时。负责加载和执行 .NET 程序，并提供垃圾回收、异常处理等机制。

只安装 Runtime 可以运行程序，但不能完整开发和编译项目。开发电脑需要安装 SDK。

### 3. 什么是 WPF

WPF 的全称是 Windows Presentation Foundation，是微软提供的 Windows 桌面 UI 框架。

WPF 主要负责：

- 创建窗口和对话框。
- 布置按钮、输入框、表格、列表等控件。
- 处理鼠标、键盘等用户输入。
- 使用数据绑定连接界面与 C# 数据。
- 使用样式、模板、动画和资源统一界面外观。

WPF 只能直接运行在 Windows 上。如果目标是跨 Windows、macOS 和移动端运行，需要考虑 .NET MAUI、Avalonia 等其他技术。

### 4. 什么是 XAML

XAML 的全称是 Extensible Application Markup Language。它是一种基于 XML 的声明式语言。

下面的 XAML 声明了一个按钮：

```xml
<Button Content="保存" Width="100" Height="36" />
```

这里：

- `Button` 是控件类型。
- `Content` 是按钮显示的内容。
- `Width` 和 `Height` 是宽度和高度属性。

“声明式”表示我们描述“界面应该是什么样”，WPF 负责创建相应的对象。与之对应，C# 更常用于描述“点击之后应该做什么”。

### 5. 什么是 IDE

IDE 的全称是 Integrated Development Environment，即集成开发环境。

Visual Studio 把开发需要的功能集中在一起：

- 代码编辑器。
- XAML 设计器。
- 编译和生成工具。
- 调试器。
- 解决方案资源管理器。
- NuGet 包管理器。
- Git 工具。

不用 IDE 也能通过命令行开发 .NET 项目，但 Visual Studio 对刚开始学习 WPF 的人更直观。

## 二、安装 Visual Studio 2022 和 WPF 开发环境

### 第 1 步：下载 Visual Studio 2022

打开 Visual Studio 官方下载页面，选择 Visual Studio 2022。

个人学习通常选择 **Community（社区版）**。社区版在符合许可条件时可以免费用于个人学习、开源项目和部分团队场景。

常见版本含义：

- **Community**：社区版，适合个人学习。
- **Professional**：专业版，面向专业开发团队。
- **Enterprise**：企业版，提供更完整的测试、诊断和架构工具。

它们都可以创建普通 WPF 项目，本教程不依赖企业版功能。

下载并运行引导程序后，会打开 **Visual Studio Installer**。

### 第 2 步：选择“.NET 桌面开发”工作负载

在“工作负载”页面勾选：

```text
.NET 桌面开发
```

“工作负载”是 Visual Studio 把某类开发需要的组件打成的一组安装选项。选择 `.NET 桌面开发` 后，安装器会加入 C# 编译工具、WPF 模板、Windows Forms 模板、.NET SDK 和调试工具等组件。

建议同时检查右侧“安装详细信息”或“单个组件”页面，确保包含：

- `.NET 8 SDK`。
- `.NET 桌面运行时`。
- `Windows 10 SDK` 或 `Windows 11 SDK`。
- C# 和 Visual Basic 编译工具。

这里不需要选择 ASP.NET、Node.js、Python 或 C++ 工作负载，除非其他项目也需要它们。

### 第 3 步：开始安装

选择安装位置后单击“安装”。安装时间取决于网络速度和已选组件数量。

几个安装位置的含义：

- **Visual Studio IDE**：Visual Studio 主程序安装位置。
- **下载缓存**：安装包临时存放位置。
- **共享组件、工具和 SDK**：多个 Visual Studio 实例可能共同使用的组件。

不熟悉这些设置时保持默认即可。不要随意删除共享 SDK 目录，否则可能造成项目模板存在但无法编译。

### 第 4 步：验证工作负载

安装完成后启动 Visual Studio 2022。如果已经安装过 Visual Studio，但创建项目时搜索不到 WPF，可以：

1. 关闭 Visual Studio。
2. 打开 `Visual Studio Installer`。
3. 找到 Visual Studio 2022。
4. 单击“修改”。
5. 勾选“.NET 桌面开发”。
6. 单击“修改”完成补充安装。

也可以打开 PowerShell 验证 .NET SDK：

```powershell
dotnet --list-sdks
```

正常输出会包含类似内容：

```text
8.0.xxx [C:\Program Files\dotnet\sdk]
```

如果命令只有 Runtime 信息而没有 SDK，说明开发工具未完整安装，或者系统 `PATH` 指向了另一套没有 SDK 的 `dotnet.exe`。

## 三、在 Visual Studio 2022 中创建 WPF 项目

### 第 1 步：进入“创建新项目”页面

启动 Visual Studio 2022 后，在启动窗口单击：

```text
创建新项目
```

如果已经打开了其他项目，可以使用菜单：

```text
文件 → 新建 → 项目
```

这里的“项目”是一个可编译的软件单元。它包含源代码、资源、依赖和生成设置。

### 第 2 步：搜索 WPF 模板

在模板搜索框输入：

```text
WPF
```

建议同时设置筛选条件：

- 语言：`C#`
- 平台：`Windows`
- 项目类型：`桌面`

选择名称类似下面的模板：

```text
WPF 应用
```

请确认模板描述使用的是现代 `.NET`，而不是旧版 `.NET Framework`。

常见的两个模板区别如下：

| 模板 | 目标平台 | 适用场景 |
| --- | --- | --- |
| WPF 应用 | .NET 8、.NET 9 等现代 .NET | 新项目优先选择 |
| WPF 应用 (.NET Framework) | .NET Framework 4.x | 维护旧系统或依赖旧组件时使用 |

二者都叫 WPF，但项目文件、依赖管理、部署方式和可使用的 API 不完全相同。本文选择现代 `.NET` 模板。

选择模板后单击“下一步”。

### 第 3 步：配置项目名称和保存位置

填写以下内容：

```text
项目名称：WpfTaskDemo
位置：D:\WorkSpace\CSharp
解决方案名称：WpfTaskDemo
```

各字段含义：

- **项目名称**：当前可执行程序项目的名称，也会影响默认命名空间和程序集名称。
- **位置**：代码在磁盘上的父目录。
- **解决方案名称**：Visual Studio 用来组织一个或多个项目的容器名称。
- **将解决方案和项目放在同一目录中**：决定是否额外创建一层解决方案目录。

推荐让解决方案目录与项目目录分开。以后加入测试项目、类库项目时，结构会更清楚：

```text
WpfTaskDemo/
├── WpfTaskDemo.sln
└── WpfTaskDemo/
    ├── WpfTaskDemo.csproj
    ├── App.xaml
    └── MainWindow.xaml
```

这里的两个同名目录并不是重复：外层属于解决方案，内层属于具体 WPF 项目。

### 第 4 步：选择目标框架

在“其他信息”页面选择：

```text
.NET 8.0（长期支持）
```

“目标框架”决定项目编译时可以使用哪些 .NET API，以及运行电脑需要什么版本的 .NET。

“长期支持”通常缩写为 LTS，即 Long Term Support。LTS 版本有较长的官方支持周期，适合教程、企业项目和需要稳定维护的软件。

选择后单击“创建”。Visual Studio 会生成初始项目并打开主窗口。

## 四、认识 Visual Studio 的主要区域

项目打开后，界面一般包含以下区域。

### 1. 解决方案资源管理器

“解决方案资源管理器”显示解决方案、项目、文件和依赖关系。

如果没有显示，可以使用：

```text
视图 → 解决方案资源管理器
```

它不是 Windows 文件资源管理器，而是从开发角度显示项目结构。某些自动生成文件或排除在项目之外的文件，显示方式可能与磁盘目录不同。

### 2. 代码编辑器

双击 `.cs` 或 `.xaml` 文件后，中间区域会显示代码编辑器。

编辑器提供：

- 语法高亮。
- 自动补全，也叫 IntelliSense。
- 错误提示。
- 代码导航。
- 重命名和格式化等重构能力。

### 3. XAML 设计器

打开 `MainWindow.xaml` 时，Visual Studio 可以显示设计预览和 XAML 源码。

设计器适合观察界面大致效果，但实际布局仍应理解 XAML。复杂项目通常以直接编写 XAML 为主，因为源码更容易维护、比较和复用。

### 4. 工具箱

“工具箱”列出 Button、TextBox、Grid 等控件，可以拖到设计器中。

打开方式：

```text
视图 → 工具箱
```

拖拽适合认识控件，正式开发仍建议理解生成的 XAML，避免产生难以维护的固定坐标和多余属性。

### 5. 属性窗口

属性窗口用于查看和修改当前选中控件的属性，例如名称、宽度、边距、字体和颜色。

打开方式：

```text
视图 → 属性窗口
```

WPF 属性通常也能直接写在 XAML 中。属性窗口改动最终会反映到 XAML。

### 6. 错误列表和输出窗口

- **错误列表**：汇总编译错误、警告和部分代码分析信息。
- **输出窗口**：显示更完整的生成、调试和工具日志。

出现错误时不要只看“生成失败”四个字，应该先看第一条具体错误以及对应的文件和行号。

## 五、认识 WPF 项目的初始文件

### 1. 解决方案文件 `.sln`

`WpfTaskDemo.sln` 是解决方案文件。它记录解决方案中有哪些项目、生成配置和项目之间的关系。

“解决方案”本身通常不包含业务代码。一个解决方案可以包含：

```text
WpfTaskDemo.sln
├── WpfTaskDemo              WPF 主程序
├── WpfTaskDemo.Core         业务类库
└── WpfTaskDemo.Tests        自动化测试项目
```

### 2. 项目文件 `.csproj`

`WpfTaskDemo.csproj` 是项目配置文件。双击项目名称或右键选择“编辑项目文件”可以查看它。

典型内容如下：

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UseWPF>true</UseWPF>
  </PropertyGroup>
</Project>
```

逐项解释：

- `Project`：项目配置的根节点。
- `Sdk="Microsoft.NET.Sdk"`：使用 .NET SDK 的标准项目系统。
- `PropertyGroup`：一组项目属性。
- `OutputType=WinExe`：生成 Windows 图形应用，不在启动时附带控制台窗口。
- `TargetFramework=net8.0-windows`：面向 .NET 8 和 Windows。
- `Nullable=enable`：启用可空引用类型检查，帮助发现潜在空引用问题。
- `ImplicitUsings=enable`：自动引入一部分常用命名空间。
- `UseWPF=true`：启用 WPF 构建功能和相关引用。

“程序集”是 .NET 编译输出的基本单元，通常是 `.exe` 或 `.dll`。项目名称默认也会成为程序集名称。

### 3. `App.xaml`

`App.xaml` 定义整个应用级别的入口资源和启动窗口：

```xml
<Application x:Class="WpfTaskDemo.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             StartupUri="MainWindow.xaml">
    <Application.Resources>
    </Application.Resources>
</Application>
```

- `Application`：代表整个 WPF 应用。
- `x:Class`：把 XAML 与指定的 C# 类连接起来。
- `xmlns`：XML 命名空间，告诉解析器标签属于哪个技术体系。
- `StartupUri`：应用启动后首先打开的窗口。
- `Application.Resources`：应用范围内可以复用的颜色、样式、模板等资源。

### 4. `App.xaml.cs`

展开 `App.xaml` 可以看到 `App.xaml.cs`：

```csharp
using System.Windows;

namespace WpfTaskDemo;

public partial class App : Application
{
}
```

这里出现了几个重要 C# 名词：

- `using`：引入命名空间，使代码可以直接使用其中的类型。
- `namespace`：命名空间，用于组织类型并避免同名冲突。
- `public`：访问修饰符，表示其他代码可以访问这个类。
- `class`：类，是定义数据和行为的代码模板。
- `partial`：分部类，表示一个类的代码可以分散在多个文件中。
- `App : Application`：`App` 继承 WPF 的 `Application` 类。

XAML 编译时会生成另一个 `App` 分部类，因此这里必须使用 `partial` 与生成代码合并。

### 5. `MainWindow.xaml`

该文件描述主窗口的外观和控件结构。

```xml
<Window x:Class="WpfTaskDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="MainWindow"
        Height="450"
        Width="800">
    <Grid>
    </Grid>
</Window>
```

- `Window`：顶层窗口。
- `Title`：窗口标题栏文字。
- `Height`、`Width`：初始高度和宽度。
- `Grid`：网格布局容器，用行和列组织子控件。

### 6. `MainWindow.xaml.cs`

这是主窗口的代码隐藏文件，也叫 Code-behind：

```csharp
using System.Windows;

namespace WpfTaskDemo;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }
}
```

- `MainWindow : Window`：主窗口类继承 WPF 的 `Window`。
- `MainWindow()`：构造函数，创建窗口对象时执行。
- `InitializeComponent()`：加载并初始化 XAML 中声明的控件。

不要删除 `InitializeComponent()`。删除后虽然 C# 类仍存在，但 XAML 控件不会正常加载。

### 7. `bin` 和 `obj` 目录

第一次生成项目后会出现：

- `obj`：存放中间生成文件和缓存。
- `bin`：存放最终编译结果，例如 `.exe`、`.dll` 和配置文件。

这两个目录通常不提交到 Git。遇到疑似缓存问题时可以关闭正在运行的程序，再执行“清理解决方案”或删除这两个目录后重新生成。

## 六、第一次运行空白 WPF 项目

在修改代码前先运行默认项目，验证安装环境是否正确。

### 第 1 步：生成解决方案

使用菜单：

```text
生成 → 生成解决方案
```

快捷键是：

```text
Ctrl + Shift + B
```

“生成”也叫 Build，主要过程包括：

1. 读取 `.csproj` 配置。
2. 还原项目依赖。
3. 编译 XAML。
4. 编译 C#。
5. 把结果写入 `bin` 目录。

成功时输出窗口会显示 `0 个错误`。

### 第 2 步：启动调试

按 `F5` 或单击工具栏中的绿色启动按钮。

`F5` 表示“启动并附加调试器”。调试器可以暂停程序、观察变量和分析异常。

如果只想运行而不附加调试器，使用：

```text
Ctrl + F5
```

正常情况下会出现一个标题为 `MainWindow` 的空窗口。这说明项目创建、XAML 编译、C# 编译和 .NET 运行环境都正常。

## 七、编写第一个可交互的 WPF 界面

下面实现一个简单的任务记录界面：输入任务内容，单击按钮后将任务加入列表。

### 第 1 步：设计窗口布局

打开 `MainWindow.xaml`，把原内容替换为：

```xml
<Window x:Class="WpfTaskDemo.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="WPF 任务记录"
        Width="720"
        Height="480"
        MinWidth="560"
        MinHeight="360"
        WindowStartupLocation="CenterScreen">
    <Grid Margin="24">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto" />
            <RowDefinition Height="Auto" />
            <RowDefinition Height="*" />
            <RowDefinition Height="Auto" />
        </Grid.RowDefinitions>

        <TextBlock Grid.Row="0"
                   Text="今天要完成什么？"
                   FontSize="24"
                   FontWeight="SemiBold"
                   Margin="0,0,0,16" />

        <Grid Grid.Row="1" Margin="0,0,0,16">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*" />
                <ColumnDefinition Width="Auto" />
            </Grid.ColumnDefinitions>

            <TextBox x:Name="TaskInput"
                     Grid.Column="0"
                     Height="38"
                     Padding="10,6"
                     VerticalContentAlignment="Center"
                     ToolTip="输入任务内容" />

            <Button Grid.Column="1"
                    Content="添加任务"
                    Width="100"
                    Height="38"
                    Margin="12,0,0,0"
                    IsDefault="True"
                    Click="AddTaskButton_Click" />
        </Grid>

        <ListBox x:Name="TaskList"
                 Grid.Row="2"
                 FontSize="16"
                 Padding="8" />

        <TextBlock x:Name="StatusText"
                   Grid.Row="3"
                   Text="当前没有任务"
                   Foreground="DimGray"
                   Margin="0,12,0,0" />
    </Grid>
</Window>
```

### 第 2 步：理解布局容器

WPF 不建议依靠固定坐标摆放控件，而是通过布局容器计算位置。

本例使用 `Grid`。它类似表格，可以定义行和列：

```xml
<Grid.RowDefinitions>
    <RowDefinition Height="Auto" />
    <RowDefinition Height="*" />
</Grid.RowDefinitions>
```

高度含义：

- `Auto`：根据内容需要自动决定大小。
- `*`：占用分配完固定和自动空间后的剩余空间。
- `2*`：按比例获得两份剩余空间。
- `100`：固定为 100 个设备无关单位。

`Grid.Row="2"` 属于“附加属性”。`Row` 不是 `TextBox` 自己定义的属性，而是 `Grid` 提供给子控件使用的位置信息。

常见布局容器：

| 容器 | 布局方式 | 适合场景 |
| --- | --- | --- |
| `Grid` | 行列网格 | 表单、主界面、复杂响应式布局 |
| `StackPanel` | 横向或纵向依次排列 | 一组按钮、简单表单项 |
| `DockPanel` | 停靠到上、下、左、右 | 工具栏、状态栏和内容区 |
| `WrapPanel` | 空间不足时自动换行 | 标签、缩略图、按钮集合 |
| `Canvas` | 使用绝对坐标 | 绘图或确实需要精确坐标的场景 |

### 第 3 步：理解控件和常用属性

本例用到四种控件：

- `TextBlock`：显示只读文本。
- `TextBox`：接收用户输入。
- `Button`：触发命令或事件。
- `ListBox`：显示并选择一组项目。

常见属性含义：

- `x:Name`：给控件一个名称，使 C# 代码能够访问它。
- `Margin`：控件外侧与其他元素的距离。
- `Padding`：控件边框与内部内容之间的距离。
- `HorizontalAlignment`：水平方向对齐方式。
- `VerticalAlignment`：垂直方向对齐方式。
- `FontSize`：字体大小。
- `FontWeight`：字体粗细。
- `Foreground`：前景色，文本控件中通常就是文字颜色。
- `Background`：背景色。
- `MinWidth`、`MinHeight`：允许缩放到的最小尺寸。
- `ToolTip`：鼠标悬停时显示的提示。

WPF 使用设备无关单位。通常 1 个单位等于 1/96 英寸，系统会结合 DPI 缩放显示，因此它不等同于一个固定物理像素。

### 第 4 步：理解事件

按钮中有一行：

```xml
Click="AddTaskButton_Click"
```

`Click` 是按钮的点击事件，`AddTaskButton_Click` 是 C# 中处理该事件的方法名称。

“事件”表示某件事情发生了。例如：

- 用户单击按钮。
- 文本发生改变。
- 窗口加载完成。
- 鼠标进入控件。
- 键盘按键被按下。

WPF 中很多输入事件属于路由事件。路由事件可以沿界面元素树向上或向下传递，让父容器有机会统一处理子控件事件。

## 八、使用 C# 处理按钮点击

打开 `MainWindow.xaml.cs`，修改为：

```csharp
using System.Windows;

namespace WpfTaskDemo;

public partial class MainWindow : Window
{
    private int _taskCount;

    public MainWindow()
    {
        InitializeComponent();
        TaskInput.Focus();
    }

    private void AddTaskButton_Click(object sender, RoutedEventArgs e)
    {
        string taskName = TaskInput.Text.Trim();

        if (string.IsNullOrWhiteSpace(taskName))
        {
            MessageBox.Show(
                "请输入任务内容。",
                "提示",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
            TaskInput.Focus();
            return;
        }

        _taskCount++;
        TaskList.Items.Add($"{_taskCount}. {taskName}");
        StatusText.Text = $"当前共有 {_taskCount} 个任务";

        TaskInput.Clear();
        TaskInput.Focus();
    }
}
```

### 1. 字段是什么

```csharp
private int _taskCount;
```

这是一个字段，用于保存窗口对象当前拥有的任务数量。

- `private` 表示只能在当前类内部访问。
- `int` 表示整数类型。
- `_taskCount` 是字段名。
- 没有显式赋值时，实例整数段默认值为 `0`。

字段通常以下划线开头只是常见命名约定，并不是 C# 语法要求。

### 2. 构造函数是什么

```csharp
public MainWindow()
{
    InitializeComponent();
    TaskInput.Focus();
}
```

构造函数在创建 `MainWindow` 对象时执行。它没有返回类型，名称必须与类名一致。

`TaskInput.Focus()` 让输入框在窗口打开后获得键盘焦点，用户可以直接输入。

### 3. 方法参数是什么

```csharp
private void AddTaskButton_Click(object sender, RoutedEventArgs e)
```

- `private`：仅当前类内部使用。
- `void`：该方法不返回结果。
- `sender`：触发事件的对象，本例通常是被单击的按钮。
- `e`：事件参数，包含与路由事件相关的信息。

参数是调用方法时传入的数据。WPF 事件系统会自动调用此方法并传入 `sender` 和 `e`。

### 4. 获取并整理输入

```csharp
string taskName = TaskInput.Text.Trim();
```

- `TaskInput` 来自 XAML 中的 `x:Name="TaskInput"`。
- `Text` 是输入框当前文本。
- `Trim()` 删除文本开头和结尾的空白。
- `taskName` 是局部变量，只在当前方法中使用。

### 5. 条件判断和提前返回

```csharp
if (string.IsNullOrWhiteSpace(taskName))
{
    // 显示提示
    return;
}
```

`if` 用于条件判断。`string.IsNullOrWhiteSpace` 会检查字符串是否为 `null`、空字符串或只包含空白。

`return` 会立即结束当前方法，防止无效任务继续加入列表。

### 6. 调用方法和传递参数

```csharp
MessageBox.Show(
    "请输入任务内容。",
    "提示",
    MessageBoxButton.OK,
    MessageBoxImage.Information);
```

`MessageBox.Show` 是一个方法调用。括号内是依次传入的参数：消息内容、标题、按钮类型和图标类型。

### 7. 字符串插值

```csharp
StatusText.Text = $"当前共有 {_taskCount} 个任务";
```

字符串前的 `$` 表示字符串插值。花括号中的 C# 表达式会转换为文本并嵌入字符串。

### 8. 清理输入框

```csharp
TaskInput.Clear();
TaskInput.Focus();
```

加入任务后清空输入，并把焦点重新放回输入框，减少重复操作。

## 九、运行并验证完整程序

保存所有文件后按 `F5`。

依次验证：

1. 窗口在屏幕中央打开。
2. 光标自动位于任务输入框。
3. 不输入内容直接单击按钮，会显示提示框。
4. 输入“学习 XAML”后单击“添加任务”，列表出现新项目。
5. 输入多个任务后，底部数量会更新。
6. 在输入框按 Enter。由于按钮设置了 `IsDefault="True"`，应当等同于单击按钮。
7. 缩放窗口，列表区域会自动使用剩余空间。

`IsDefault` 表示该按钮是窗口的默认按钮。当焦点所在控件没有自行处理 Enter 时，按 Enter 会触发默认按钮。

## 十、使用断点调试 C# 代码

调试不是等程序出错后才使用，而是理解代码执行过程的重要工具。

### 第 1 步：设置断点

打开 `MainWindow.xaml.cs`，在下面这一行左侧灰色边栏单击：

```csharp
string taskName = TaskInput.Text.Trim();
```

出现红点表示断点已设置。

“断点”告诉调试器：程序运行到这里时暂停，但不要退出。

### 第 2 步：启动并触发事件

按 `F5` 启动程序，输入一条任务后单击按钮。Visual Studio 会在断点处暂停。

此时可以：

- 把鼠标放在 `TaskInput.Text` 上查看值。
- 在“局部变量”窗口查看方法变量。
- 在“监视”窗口输入 `_taskCount` 持续观察。
- 查看“调用堆栈”理解方法如何被调用。

### 第 3 步：单步执行

常用调试快捷键：

| 快捷键 | 名称 | 含义 |
| --- | --- | --- |
| `F10` | 逐过程 | 执行当前行，不进入被调用方法内部 |
| `F11` | 逐语句 | 执行当前行，并进入可调试的方法内部 |
| `Shift + F11` | 跳出 | 执行完当前方法并返回调用位置 |
| `F5` | 继续 | 继续运行到下一个断点 |
| `Shift + F5` | 停止调试 | 终止当前调试会话 |

对初学者来说，先掌握断点、`F10` 和查看变量就能解决大量问题。

## 十一、理解编译错误、运行时错误和逻辑错误

### 1. 编译错误

编译器无法把源码转换成程序。例如：

```csharp
int count = "abc";
```

这类错误会阻止生成。错误列表一般会给出错误代码、文件和行号。

### 2. 运行时错误

代码成功编译，但运行期间发生异常。例如读取不存在的文件，或者访问一个为 `null` 的对象。

调试模式下，Visual Studio 通常会在发生异常的位置暂停。

### 3. 逻辑错误

程序可以运行，也不抛异常，但结果不符合需求。例如数量应该加一却写成了减一。

逻辑错误主要通过断点、测试和检查业务流程定位。

## 十二、XAML 与 C# 是怎样连接起来的

本例中有三处关键连接。

### 1. `x:Class` 连接窗口类

```xml
x:Class="WpfTaskDemo.MainWindow"
```

它必须与 C# 中的完整类型名称匹配：

```csharp
namespace WpfTaskDemo;
public partial class MainWindow : Window
```

命名空间或类名不一致时，XAML 会编译失败。

### 2. `x:Name` 生成可访问字段

```xml
<TextBox x:Name="TaskInput" />
```

XAML 编译器会生成相应成员，因此代码隐藏文件可以访问：

```csharp
TaskInput.Text
```

### 3. 事件名称连接处理方法

```xml
Click="AddTaskButton_Click"
```

它会连接到：

```csharp
private void AddTaskButton_Click(object sender, RoutedEventArgs e)
```

如果方法名写错、被删除或参数签名不兼容，就会出现编译错误。

## 十三、代码隐藏与 MVVM 的区别

本教程使用代码隐藏处理按钮事件，因为它最容易展示 XAML 与 C# 的关系。

当项目逐渐变大，WPF 通常采用 MVVM：

```text
View       界面，主要是 XAML
ViewModel  界面状态和交互逻辑
Model      业务数据
```

### 1. View

View 是用户看到的窗口或用户控件。例如 `MainWindow.xaml`。

### 2. ViewModel

ViewModel 为 View 提供数据和操作。它通常不直接操作具体按钮，而是暴露属性和命令。

### 3. Model

Model 表示业务数据。例如：

```csharp
public sealed class TodoItem
{
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
}
```

### 4. 数据绑定

数据绑定使用 `Binding` 把控件属性与 C# 对象属性连接起来：

```xml
<TextBox Text="{Binding TaskName, UpdateSourceTrigger=PropertyChanged}" />
```

- `TaskName`：ViewModel 的属性。
- `UpdateSourceTrigger=PropertyChanged`：用户每次修改文本时立即更新数据源。

MVVM 的优势是降低界面与逻辑的耦合，使代码更容易测试和维护。但第一次创建 WPF 项目时，应先理解控件、布局、事件和对象，再进入 MVVM。

## 十四、添加 NuGet 包是什么意思

NuGet 是 .NET 的包管理系统。第三方库可以通过 NuGet 加入项目，例如日志、依赖注入、数据库访问和 MVVM 工具包。

操作方式：

1. 右键项目。
2. 选择“管理 NuGet 程序包”。
3. 在“浏览”页面搜索包。
4. 选择版本并安装。

安装后，包引用会记录到 `.csproj`：

```xml
<ItemGroup>
  <PackageReference Include="CommunityToolkit.Mvvm" Version="某个版本" />
</ItemGroup>
```

初始示例不需要任何第三方 NuGet 包。不要为了“项目看起来完整”而提前加入大量依赖；应当在明确需要某个能力时再添加。

## 十五、Debug、Release、生成和发布的区别

### 1. Debug 配置

Debug 面向开发调试，包含更完整的调试信息，优化程度较低，便于断点和观察变量。

输出通常位于：

```text
bin\Debug\net8.0-windows\
```

### 2. Release 配置

Release 面向正式交付，编译器会进行更多优化。

输出通常位于：

```text
bin\Release\net8.0-windows\
```

### 3. 生成

生成把源码编译为当前电脑可以运行的项目输出，但不一定包含目标电脑所需的全部运行环境。

### 4. 发布

发布用于准备交付文件。右键项目选择“发布”，可以创建文件夹发布配置。

常见发布方式：

- **依赖框架**：文件较小，目标电脑需要安装对应 .NET Desktop Runtime。
- **独立部署**：把运行时一起发布，文件更大，目标电脑不需要预装对应 .NET。
- **单文件**：尽量合并为一个主文件，但某些依赖或资源仍可能产生额外文件。

学习阶段先掌握 Debug 运行，项目完成后再选择发布方式。

## 十六、常见问题排查

### 问题 1：创建项目时搜索不到 WPF

原因通常是没有安装 `.NET 桌面开发` 工作负载。

解决办法：打开 Visual Studio Installer，修改当前实例并补装该工作负载。

### 问题 2：选到了 `.NET Framework` 模板

检查 `.csproj`。现代 .NET 8 项目应包含：

```xml
<TargetFramework>net8.0-windows</TargetFramework>
<UseWPF>true</UseWPF>
```

如果看到类似 `net48` 或传统的大段 XML 项目配置，通常是 `.NET Framework` 项目。它并非不能用，但与本文目标不同。

### 问题 3：提示找不到 `dotnet` 或没有 SDK

在 PowerShell 执行：

```powershell
where.exe dotnet
dotnet --info
dotnet --list-sdks
```

重点检查：

- 是否安装 SDK，而不只是 Runtime。
- `PATH` 是否优先指向 `C:\Program Files\dotnet`。
- 是否意外命中 `C:\Program Files (x86)\dotnet` 中不完整的 x86 环境。

### 问题 4：`InitializeComponent` 不存在

检查：

1. `.csproj` 中是否有 `<UseWPF>true</UseWPF>`。
2. XAML 的 `x:Class` 是否与 C# 命名空间和类名一致。
3. 窗口 C# 类是否使用 `partial`。
4. XAML 是否存在未闭合标签等语法错误。
5. 清理后重新生成解决方案。

### 问题 5：XAML 找不到事件处理方法

例如 XAML 写了：

```xml
Click="AddTaskButton_Click"
```

代码隐藏文件必须存在名称和参数匹配的方法：

```csharp
private void AddTaskButton_Click(object sender, RoutedEventArgs e)
```

### 问题 6：窗口启动后是空白的

检查：

- 控件是否真的写在 `Window` 的布局容器中。
- `App.xaml` 的 `StartupUri` 是否指向正确窗口。
- 控件的 `Visibility` 是否被设置为 `Collapsed`。
- 前景色与背景色是否相同。
- 行或列是否被设置为零尺寸。

### 问题 7：修改代码后效果没有变化

先停止旧程序，再执行：

```text
生成 → 重新生成解决方案
```

仍有问题时检查“输出”窗口，确认运行的是当前项目。如果解决方案中有多个可执行项目，右键目标 WPF 项目并选择“设为启动项目”。

### 问题 8：中文显示乱码

C# 和 XAML 文件建议使用 UTF-8 编码。Visual Studio 新项目默认通常已经使用合适编码。

如果读取外部文本文件，还需要在文件读写代码中确认文件实际编码，而不是只调整界面字体。

## 十七、适合继续学习的顺序

完成本文后，建议按以下顺序继续：

1. C# 基础：变量、条件、循环、方法、类、集合、异常和异步编程。
2. WPF 布局：Grid、StackPanel、DockPanel 和响应式尺寸。
3. 常用控件：ListView、DataGrid、ComboBox、TabControl 和 Menu。
4. WPF 属性系统：依赖属性、附加属性和继承属性。
5. 数据绑定：Binding、DataContext、转换器和验证。
6. MVVM：View、ViewModel、Model、Command 和 `INotifyPropertyChanged`。
7. 资源与样式：ResourceDictionary、Style、ControlTemplate 和 DataTemplate。
8. 异步与线程：`async`、`await`、Dispatcher 和取消操作。
9. 数据持久化：JSON、SQLite 或其他数据库。
10. 日志、测试、打包和自动更新。

## 十八、最终项目结构回顾

完成教程后，核心结构如下：

```text
WpfTaskDemo/
├── WpfTaskDemo.sln                 解决方案入口
└── WpfTaskDemo/
    ├── WpfTaskDemo.csproj          项目和生成配置
    ├── App.xaml                    应用入口和全局资源
    ├── App.xaml.cs                 应用级 C# 逻辑
    ├── MainWindow.xaml             主窗口界面
    ├── MainWindow.xaml.cs          主窗口事件逻辑
    ├── bin/                        编译输出
    └── obj/                        中间生成文件
```

这个小项目虽然只有一个窗口，但已经包含了 WPF 开发最基本的完整链路：

```text
Visual Studio 创建项目
  → XAML 声明界面
  → C# 处理行为
  → .NET SDK 编译
  → CLR 运行程序
  → Visual Studio 调试代码
```

理解这条链路后，再学习数据绑定和 MVVM，就不会只记住零散写法，而能够判断一段代码属于界面、交互、业务数据还是项目配置。
