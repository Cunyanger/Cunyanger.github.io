---
# 这是文章的标题
title: Maven环境部署
# 你可以自定义封面图片
cover:
# 这是页面的图标
icon: mdi:image-multiple-outline
# 这是侧边栏的顺序
order: 0
# 一个页面可以有多个分类
category:
  - 使用指南
# 一个页面可以有多个标签
tag:
  - Maven
# 此页面会在文章列表置顶
sticky: false
# 此页面会出现在星标文章中
star: false
---

# 安装部署

## Linux中安装安装 Maven

maven是使用java语言编写的，所以我们要运行maven，需要先安装jdk。

### 安装jdk

### 下载jdk

本次我们安装jdk1.8，可以到oracle官网上去下载jdk-8u181-linux-x64.tar.gz，将其放在/opt/jdk目录中，如下：

```sh
[root@ady01 jdk]# cd /opt/jdk/
[root@ady01 jdk]# ll
total 181300
-rw-r--r-- 1 root root 185646832 Nov  1 13:30 jdk-8u181-linux-x64.tar.gz
```

### 解压jdk

```sh
[root@ady01 jdk]# tar -zvxf jdk-8u181-linux-x64.tar.gz
[root@ady01 jdk]# ll
total 181304
drwxr-xr-x 7   10  143      4096 Jul  7  2018 jdk1.8.0_181
-rw-r--r-- 1 root root 185646832 Nov  1 13:30 jdk-8u181-linux-x64.tar.gz
```

### 配置环境变量

在`/etc/profile`文件末尾追加下面几行

```
export JAVA_HOME=/opt/jdk/jdk1.8.0_181
export PATH=$JAVA_HOME/bin:$PATH
export CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar
```



> 这个地方扩展个知识点：
> 有个知识点我们说一下，系统运行java或者其他外部命令的时候，系统是如何找到这些命令的？
> linux中会去PATH对应的所有目录中寻找这个命令，找到了就可以直接运行，如果没有设置PATH，我们需要知道命令的完整路径才可以运行，所以使用PATH更方便一些。
>
> window中，也有个系统变量PATH，这个PATH的值是由很多目录的地址组成的，当我们执行一个命令的之后，系统会去PATH对应的所有目录中寻找我们运行的命令，找到了就可以直接运行，比如你们想快速启动其他的一些软件，可以将这些软件的设置到PATH变量中，可以在cmd命令中快速启动了。

运行下面命令使环境变量生效

```sh
[root@ady01 jdk1.8.0_181]# source /etc/profile
```

### 验证jdk是否正常

查看jdk版本

```sh
[root@ady01 jdk]# java -version
java version "1.8.0_181"
Java(TM) SE Runtime Environment (build 1.8.0_181-b13)
Java HotSpot(TM) 64-Bit Server VM (build 25.181-b13, mixed mode)
```

新建`/opt/jdk/HelloWorld.java`，内容如下：

```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("hello maven！");
    }
}
```

运行下面的命令：

```sh
[root@ady01 jdk]# cd /opt/jdk/
[root@ady01 jdk]# javac HelloWorld.java 
[root@ady01 jdk]# java HelloWorld
hello maven！
```
输出hello maven表示正常，jdk安装成功！

## Windows安装Maven

<https://maven.apache.org/download.cgi>

[apache-maven安装包下载-开源镜像站-阿里云](https://mirrors.aliyun.com/apache/maven/?spm=a2c6h.25603864.0.0.4c993b952we6eM)


![[_Annex/09c1d0922960207636654ed5d67f4c20_MD5.png]]

解压到创建的环境的文件夹

添加环境变量

![[_Annex/812d692845cb4ffe1911e5ebd478d55d_MD5.png]]

![[_Annex/0a58c5ee78a6d2be65c435968ba1c53c_MD5.png]]

#### 验证maven是否正常

`mvn -v` 输出 maven 的版本号信息

```shell
C:\Users\Think>mvn -v
Apache Maven 3.6.2 (40f52333136460af0dc0d7232c0dc0bcf0d9e117; 2019-08-27T23:06:16+08:00)
Maven home: D:\installsoft\maven\apache-maven-3.6.2\bin\..
Java version: 1.8.0_121, vendor: Oracle Corporation, runtime: D:\installsoft\Java\jdk1.8.0_121\jre
Default locale: zh_CN, platform encoding: GBK
OS name: "windows 10", version: "10.0", arch: "amd64", family: "windows"
```

## Maven配置

修改jar包的存放地址

![[_Annex/b267c694f419bc08cdfc3324a3cc8761_MD5.png]]

#### 启动文件设置

>  后面会用到 `~` 这个符号，先对这个符号做一下说明，这个符号表示当前用户的目录
>  window中默认在 `C:\Users\用户名`
>  linux root用户默认在/root目录，其他用户的~对应/home/用户名

`mvn` 运行的时候，会加载启动的配置文件 `settings.xml`，这个文件默认在 `MAVEN_HOME/conf` 目录
一般会拷贝一个放在 `~/.m2` 目录中，Maven的conf内的是全局范围的配置文件，整个机器上所有用户都会受到该配置的影响，而.m2是用户范围级别的，只有当前用户才会受到该配置的影响。推荐使用用户级别，以免影响到其他用户的使用。还有这样使用方便日后maven版本升级，一般情况下maven整个安装目录我们都不要去动，升级的时候只需要替换一下安装文件就可以了

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.2.0 https://maven.apache.org/xsd/settings-1.2.0.xsd">
  <!-- 本地仓库位置（可选，建议明确） -->
  <localRepository>F:\Environment\Maven\.m2\repository</localRepository>

  <!-- pluginGroups
  | This is a list of additional group identifiers that will be searched when resolving plugins by their prefix, i.e.
  | when invoking a command line like "mvn prefix:goal". Maven will automatically add the group identifiers
  | "org.apache.maven.plugins" and "org.codehaus.mojo" if these are not already contained in the list.
  |-->
  <pluginGroups>
    <!-- pluginGroup
     | Specifies a further group identifier to use for plugin lookup.
    <pluginGroup>com.your.plugins</pluginGroup>
    -->
  </pluginGroups>

  <!-- TODO Since when can proxies be selected as depicted? -->
  <!-- proxies
   | This is a list of proxies which can be used on this machine to connect to the network.
   | Unless otherwise specified (by system property or command-line switch), the first proxy
   | specification in this list marked as active will be used.
   |-->
  <proxies>
    <!-- proxy
     | Specification for one proxy, to be used in connecting to the network.
     |
    <proxy>
      <id>optional</id>
      <active>true</active>
      <protocol>http</protocol>
      <username>proxyuser</username>
      <password>proxypass</password>
      <host>proxy.host.net</host>
      <port>80</port>
      <nonProxyHosts>local.net|some.host.com</nonProxyHosts>
    </proxy>
    -->
  </proxies>

  <!-- servers
   | This is a list of authentication profiles, keyed by the server-id used within the system.
   | Authentication profiles can be used whenever maven must make a connection to a remote server.
   |-->
  <servers>
    <!-- server
     | Specifies the authentication information to use when connecting to a particular server, identified by
     | a unique name within the system (referred to by the 'id' attribute below).
     |
     | NOTE: You should either specify username/password OR privateKey/passphrase, since these pairings are
     |       used together.
     |
    <server>
      <id>deploymentRepo</id>
      <username>repouser</username>
      <password>repopwd</password>
    </server>
    -->

    <!-- Another sample, using keys to authenticate.
    <server>
      <id>siteServer</id>
      <privateKey>/path/to/private/key</privateKey>
      <passphrase>optional; leave empty if not used.</passphrase>
    </server>
    -->
  </servers>
  <mirrors>
   <mirror>
			<id>aliyunmaven</id>
             <mirrorOf>central</mirrorOf>
             <name>aliyun central maven</name>
             <url>https://maven.aliyun.com/repository/central</url>
		 </mirror>
  </mirrors>

  <profiles>
         <!-- java版本 --> 
     <profile>
           <id>jdk-17</id>
           <activation>
               <activeByDefault>true</activeByDefault>
               <jdk>17</jdk>
           </activation>
 
           <properties>
               <maven.compiler.source>17</maven.compiler.source>
               <maven.compiler.target>17</maven.compiler.target>
               <maven.compiler.compilerVersion>17</maven.compiler.compilerVersion>
           </properties>
     </profile>
     
  </profiles>

  <!-- activeProfiles
   | List of profiles that are active for all builds.
   |
  <activeProfiles>
    <activeProfile>alwaysActiveProfile</activeProfile>
    <activeProfile>anotherAlwaysActiveProfile</activeProfile>
  </activeProfiles>
  -->
</settings>
```

#### 配置本地缓存目录

settings.xml中的 `localRepository` 标签，可以设置本地缓存目录，maven从远程仓库下载下来的插件以及以后所有我们用到的jar包都会放在这个目录中，如下：

```
<localRepository>C:/Users/Think/.m1/repository</localRepository>
```

#### 更改镜像地址

```xml
<repository>
    <id>alimaven</id>
    <name>aliyun maven</name>
    <url>http://maven.aliyun.com/nexus/content/groups/public/</url>
</repository>
```

编译项目

在项目文件夹中进入 cmd 使用 `mvn compile`

项目管理工具，是面向对象设计的，这个项目就是对象叫POM（project object model）

项目构建：提供标准的跨平台的自动化项目构建方式

依赖管理：管理jar包

统一开发结构：提供标准的项目结构

仓库：储存资源存放jar包，中央仓库在云端 maven团队中

公司的是私服，也是存放版权jar包的

先从本地仓库取本地没有从公司私服拿，私服没有的从中央仓库拿

私服和中央仓库都成为远程仓库

坐标：定位仓库中文件位置的

Groupid(组织id)：定义当前maven项目隶属阻止名称域名反写如 com.itxxx

artifactid（项目id）：项目名称如 order-service、goods-service

Version （版本号）：定当前项目版本号

Packaging

[Mvnrepository.com](http://Mvnrepository.com)

仓库配置

user、itcast .m2文件夹

cmd+mvn

d：maven/repository

项目结构

src同级中要有pom.xml

项目构建

![[_Annex/5878ff950f54266c6922cdf6a5b80710_MD5.png]]

## toolchains.xml

```
mvn org.apache.maven.plugins:maven-toolchains-plugin:3.2.0:display-discovered-jdk-toolchains
```
## Maven的运行原理

运行下面命令，看一下效果

```sh
C:\Users\Think>mvn help:system
[INFO] Scanning for projects...
Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-antrun-plugin/1.3/maven-antrun-plugin-1.3.pom
Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-antrun-plugin/1.3/maven-antrun-plugin-1.3.pom (4.7 kB at 4.0 kB/s)
Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-plugins/12/maven-plugins-12.pom
Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-plugins/12/maven-plugins-12.pom (12 kB at 21 kB/s)
Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/maven-parent/9/maven-parent-9.pom
Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/maven-parent/9/maven-parent-9.pom (33 kB at 44 kB/s)
Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-antrun-plugin/1.3/maven-antrun-plugin-1.3.jar
Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-antrun-plugin/1.3/maven-antrun-plugin-1.3.jar (24 kB at 12 kB/s)
Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-assembly-plugin/2.2-beta-5/maven-assembly-plugin-2.2-beta-5.pom
Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-assembly-plugin/2.2-beta-5/maven-assembly-plugin-2.2-beta-5.pom (15 kB at 13 kB/s)
Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-plugins/16/maven-plugins-16.pom
Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-plugins/16/maven-plugins-16.pom (13 kB at 33 kB/s)
Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-assembly-plugin/2.2-beta-5/maven-assembly-plugin-2.2-beta-5.jar
Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-assembly-plugin/2.2-beta-5/maven-assembly-plugin-2.2-beta-5.jar (209 kB at 29 kB/s)
Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-dependency-plugin/2.8/maven-dependency-plugin-2.8.pom
Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-dependency-plugin/2.8/maven-dependency-plugin-2.8.pom (11 kB at 14 kB/s)
Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-dependency-plugin/2.8/maven-dependency-plugin-2.8.jar
Progress (1): 153 kB
```

上面运行`mvn help:system`命令之后，好像从`https://repo.maven.apache.org`站点中在下载很多东西，最后又输出了系统所有环境变量的信息。

`mvn help:system`命令的运行过程：

1. 运行`mvn help:system`之后
2. 系统会去环境变量PATH对应的所有目录中寻找mvn命令，然后在`D:\installsoft\maven\apache-maven-3.6.2\bin`中找到了可执行的`mvn`文件
3. 运行mvn文件，也就是执行mvn命令
4. 通常一些软件启动的时候，会有一个启动配置文件，maven也有，mvn命令启动的时候会去`~/.m2`目录寻找配置文件`settings.xml`，这个文件是mvn命令启动配置文件，可以对maven进行一些启动设置（如本地插件缓存放在什么位置等等），若`~/.m2`目录中找不到`settings.xml`文件，那么会去`M2_HOME/conf`目录找这个配置文件，然后运行maven程序
5. mvn命令后面跟了一个参数：`help:sytem`，这个是什么意思呢？这个表示运行`help`插件，然后给help插件发送`system`命令
6. maven查看本地缓存目录（默认为`~/.m2`目录）寻找是否有help插件，如果本地没有继续下面的步骤
7. maven会去默认的一个站点（apache为maven提供的一个网站[repo.maven.apache.org]，这个叫中央仓库）下载help插件到`~/.m2`目录
8. 运行help插件，然后给help插件发送`system`指令，help插件收到`system`指令之后，输出了本地环境变量的信息，如果系统找不到指定的插件或者给插件发送无法识别的命令，都会报错

上面这个过程大家再感受一下，maven中所有的命令都是以插件的形式提供的，所以maven扩展也是相当容易的。

##### mvn 插件名称:help

上面这种会输出插件的帮助文档，来感受一个：

```sh
C:\Users\Think>mvn clean:help
[INFO] Scanning for projects...
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] Building Maven Stub Project (No POM) 1
[INFO] ------------------------------------------------------------------------
[INFO]
[INFO] --- maven-clean-plugin:2.5:help (default-cli) @ standalone-pom ---
[INFO] org.apache.maven.plugins:maven-clean-plugin:2.5

Maven Clean Plugin
  The Maven Clean Plugin is a plugin that removes files generated at build-time
  in a project's directory.

This plugin has 2 goals:

clean:clean
  Goal which cleans the build.
  This attempts to clean a project's working directory of the files that were
  generated at build-time. By default, it discovers and deletes the directories
  configured in project.build.directory, project.build.outputDirectory,
  project.build.testOutputDirectory, and project.reporting.outputDirectory.

  Files outside the default may also be included in the deletion by configuring
  the filesets tag.

clean:help
  Display help information on maven-clean-plugin.
  Call
    mvn clean:help -Ddetail=true -Dgoal=<goal-name>
  to display parameter details.


[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time: 0.372 s
[INFO] Finished at: 2019-11-01T17:59:04+08:00
[INFO] Final Memory: 15M/487M
[INFO] ------------------------------------------------------------------------
```