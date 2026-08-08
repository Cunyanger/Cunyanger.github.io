---
title: Kubernetes权威指南：从Docker到Kubernetes实践全接触（第5版）
date: 2026-08-08
article: false
icon: pen-to-square
bookCategory: 容器技术与云原生
bookAuthor: 龚正、吴治辉、闫健勇
bookColor: zinc
category:
  - 容器技术
  - 云原生
  - DevOps
bookCover: /assets/images/kubernetes-definitive-guide-5th-cover.png
cover:
tag:
  - Kubernetes
  - Docker
  - 云原生
isOriginal: true
excerpt: 深度精读龚正、吴治辉、闫健勇《Kubernetes权威指南》第5版，按原书12章与附录完整梳理声明式资源、调度控制、安全、网络、存储、API扩展、运维和排障，并以Kubernetes 1.36官方资料校正1.19时代配置。
---

# 《Kubernetes 权威指南》第 5 版深度阅读

> **文本与版本边界**：本文依据龚正、吴治辉、闫健勇所著《Kubernetes 权威指南：从 Docker 到 Kubernetes 实践全接触（第 5 版）》全文整理。电子工业出版社 2021 年 6 月出版，ISBN `978-7-121-40998-1`。版权页标注全书约 141 万字；正文共 12 章，明确覆盖 Kubernetes 1.0 ～ 1.19 的主要特性。
>
> **标注规则**：`【原书】`表示书中明确论述或案例，`【原书示例整理】`表示 PDF 中代码页为图片，本文依据紧邻正文对字段的逐项解释恢复为可读代码，`【纠正】`表示对错误或过时内容的校正，`【书外扩展】`表示为现代实践补充。历史内容不会被静默改写成作者观点。
>
> **核验基线（2026-08-08）**：原书仍以 Kubernetes 1.19 为事实主线；现代补充依据 Kubernetes 官方发布页、`stable.txt` 和文档核验。核验时最新稳定分支为 1.36，最新补丁版本为 1.36.3。本文不会用 1.36 的行为反向改写作者在 1.19 时代的叙述。

---

## 一、全书解决的核心问题

### 1.1 官方定义与全局摘要

版权页后的内容简介给出了全书最准确的技术定义：

> “Kubernetes 是由谷歌开源的容器集群管理系统，为容器化应用提供了资源调度、部署运行、服务发现、扩缩容等一整套功能。”

内容简介还用一句话概括其设计思想：

> “一切以服务（Service）为中心，一切围绕服务运转。”

第 1 章进一步把 Kubernetes 定义为源于 Google Borg 经验、基于容器技术的分布式架构方案，是容器云和云原生生态的基础平台。作者强调它对语言和框架没有侵入性：Java、Go、C++、Python 等应用都可以映射为 Service，通过标准网络协议交互。

通俗地说，Docker 解决了“如何把一个应用及其依赖装进标准箱子”，Kubernetes 继续解决“成千上万个箱子应该放到哪些机器、坏了怎么办、怎么被找到、怎么升级、怎么扩容、如何限制权限和资源”。它把大量人工运维动作变成资源对象和控制循环：用户声明“我要 3 个副本”，系统持续比较实际状态与期望状态，并自动补齐差异。

本书解决的问题可归纳为六层：

1. **应用建模**：用 Pod、Deployment、StatefulSet、Job 等表达不同工作负载。
2. **服务连接**：用 Service、DNS、Ingress 隔离易变的 Pod 地址。
3. **自动控制**：用 Scheduler 和 Controller 完成放置、副本维持、升级、恢复与扩缩容。
4. **基础设施抽象**：通过 CRI、CNI、CSI 分别解耦运行时、网络和存储。
5. **平台治理**：用认证、RBAC、准入、配额、网络策略和安全上下文建立多租户边界。
6. **持续运营**：用 Event、日志、指标、审计、Helm、备份和排障流程维持生产集群。

### 1.2 全书篇章框架

```mermaid
mindmap
  root((Kubernetes权威指南 第5版))
    入门与建群
      第1章 资源对象与Hello World
      第2章 kubeadm 高可用 CRI kubectl
    应用建模
      第3章 Pod 配置 调度 控制器 升级 扩缩容
      第4章 Service DNS Ingress
    控制与治理
      第5章 API Server Controller Scheduler kubelet kube-proxy
      第6章 认证 授权 准入 Secret Pod安全
    基础设施
      第7章 网络模型 CNI 网络方案 NetworkPolicy 双栈
      第8章 Volume PV PVC StorageClass CSI
    开发与运营
      第9章 REST 客户端 CRD API聚合
      第10章 资源 运维 监控 日志 审计 Dashboard Helm
      第11章 Event 日志 常见故障
      第12章 Windows GPU VPA 生态演进
    参数查阅
      附录A 控制面与节点组件启动参数
```

从资源生命周期看，全书不是 12 个孤立专题，而是一条连续链路：

```mermaid
flowchart LR
    A[构建镜像与声明资源] --> B[API认证授权与准入]
    B --> C[对象写入etcd]
    C --> D[控制器创建期望Pod]
    D --> E[Scheduler选择Node]
    E --> F[kubelet经CRI启动容器]
    F --> G[CNI接通网络 CSI挂载存储]
    G --> H[Service DNS Ingress接收流量]
    H --> I[探针 指标 日志 Event 审计]
    I --> J[扩缩容 升级 驱逐 修复]
    J --> C
```

### 1.3 与传统和同类平台的比较

> Docker Compose、Swarm、Nomad、OpenStack 和托管 Kubernetes 的横向信息属于书外比较，用于说明 Kubernetes 的技术边界。

| 维度           | Kubernetes                             | Docker Compose         | Docker Swarm       | HashiCorp Nomad                  | OpenStack/传统虚拟机编排     | 托管 Kubernetes                    |
| -------------- | -------------------------------------- | ---------------------- | ------------------ | -------------------------------- | ---------------------------- | ---------------------------------- |
| 管理对象       | Pod、Service、声明式 API 和可扩展资源  | 单机多容器应用         | Service/Task       | Job/Allocation，支持多类工作负载 | VM、网络、块存储等 IaaS 资源 | Kubernetes API，控制面由云厂商维护 |
| 调度与自愈     | 调度框架、控制循环、探针、驱逐、优先级 | 无集群调度             | 内置调度与副本恢复 | 调度简单直接、单二进制           | 以虚拟机生命周期为中心       | 与上游 Kubernetes 基本一致         |
| 服务发现与入口 | Service、CoreDNS、Ingress/Gateway      | Compose 网络 DNS       | Routing Mesh       | 原生服务注册较弱，常配 Consul    | 依赖独立 LB/DNS              | 常与云 LB、DNS、IAM 集成           |
| 存储抽象       | PV/PVC/StorageClass/CSI                | Volume                 | Volume 能力有限    | CSI                              | Cinder/Manila 等 VM 级存储   | 云盘 CSI 和托管存储集成            |
| 扩展性         | CRD、Controller、Operator、Admission   | 很少                   | 有限               | 插件和生态较轻                   | OpenStack API/驱动           | 可扩展，但受云服务边界影响         |
| 学习与运维成本 | 高，组件和对象关系复杂                 | 低                     | 较低               | 中等                             | 高，侧重 IaaS                | 降低控制面负担，但仍需治理工作负载 |
| 适用规模       | 从开发集群到大型多租户平台             | 本地开发、CI、小型单机 | 简单容器集群       | 追求简洁或混合工作负载           | 强隔离 VM 与完整私有云       | 希望减少 etcd/控制面运维的生产团队 |

Kubernetes 的突出优势是**声明式 API + 控制器模式 + 标准扩展接口**。它不是只把容器“跑起来”，而是把部署、网络、存储、安全和运营都变为可组合的资源模型。代价也来自同一套机制：对象多、控制链长、故障可能跨越 API、调度、节点、网络和存储。小型单机系统使用 Compose 往往更直接；需要轻量混合调度时 Nomad 可能更简洁；缺少控制面运维能力时，托管 Kubernetes 通常比自建更合理。

---

## 二、从前言到附录的章节总览

| 章节     | 章节主题                     | 本章的核心内容                                                                                                                         | 问题与解决路径                                                                                          |
| -------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 前言     | 从 Borg 经验到云原生基础设施 | 说明第 1 版始于 2016 年，第 5 版覆盖 1.19；给出入门、安装、原理、开发、网络存储和运维的路线                                            | 建议搭建真实环境动手验证，而不是只记资源定义                                                            |
| 第 1 章  | Kubernetes 入门              | Kubernetes 的定位；MySQL+Tomcat 示例；资源对象分类；Cluster、控制节点、Node、Pod、Label、Deployment、Service、ConfigMap、Secret、PV 等 | 用 Deployment 维持副本，用 Service 隔离 Pod IP 变化，从一个两层 Web 应用串起对象关系                    |
| 第 2 章  | 安装配置指南                 | 系统要求、kubeadm、二进制高可用控制面、私有镜像库、版本升级、CRI、kubectl                                                              | 测试环境用 kubeadm 快速建群；生产示例用 3 控制节点、etcd、HAProxy+Keepalived；CRI 解耦 kubelet 与运行时 |
| 第 3 章  | 深入掌握 Pod                 | Pod 定义、多容器、静态 Pod、共享 Volume、ConfigMap、Downward API、生命周期与探针；调度、Init Container、滚动升级、HPA、StatefulSet     | 依据应用形态选择 Deployment/DaemonSet/Job/StatefulSet；通过亲和、污点、优先级和拓扑分布表达调度约束     |
| 第 4 章  | 深入掌握 Service             | ClusterIP/NodePort/外部服务/Headless、EndpointSlice、CoreDNS、NodeLocal DNS、Pod DNS、Ingress 和 TLS                                   | Service 提供稳定入口并屏蔽后端变化；CoreDNS 完成名字发现；Ingress Controller 把七层规则落实到代理       |
| 第 5 章  | 核心组件运行机制             | API Server 的 REST、List-Watch、版本转换；Controller Manager；Scheduler Framework；kubelet、CRI、RuntimeClass；kube-proxy 三代模式     | 通过“期望状态—实际状态”控制循环解释自愈；通过事件监听让组件松耦合；IPVS 改善大规模 Service 转发         |
| 第 6 章  | 集群安全机制                 | 证书、Bearer Token、OIDC、认证代理；ABAC/Webhook/RBAC；Admission Control；ServiceAccount、Secret、PodSecurityPolicy、SecurityContext   | 请求依次经过认证、授权、准入；RBAC 实施最小权限；安全上下文限制容器特权、用户、能力与文件系统           |
| 第 7 章  | 网络原理                     | IP-per-Pod 模型；namespace、veth、bridge、Netfilter；Docker 网络；Pod/Service 数据路径；CNI；Flannel、OVS、Calico；NetworkPolicy；双栈 | CNI 插件实现扁平互通；kube-proxy 实现 Service 虚拟网络；NetworkPolicy 以标签表达东西向隔离              |
| 第 8 章  | 存储原理和应用               | Volume、PV/PVC 生命周期、访问模式和回收策略；StorageClass 动态供应；GlusterFS/Heketi 实战；CSI 架构与迁移                              | PV 把供应方细节与使用方申请分开；StorageClass 自动创建 PV；CSI 将存储驱动移出 Kubernetes 主仓库         |
| 第 9 章  | Kubernetes 开发指南          | REST 与 Kubernetes API；Fabric8 Java 客户端；API Group/Version；CRD、API Aggregation、Metrics Server                                   | 用客户端库而非拼接 HTTP 操作资源；简单扩展用 CRD+Controller，完整自定义 API 行为可用聚合 API Server     |
| 第 10 章 | Kubernetes 运维管理          | Node 隔离、Label、Namespace、Request/Limit/QoS/Quota、驱逐、PDB、Metrics Server、Prometheus/Grafana、EFK、审计、Dashboard、Helm        | 先划分租户和资源预算，再监控、审计和打包发布；主动维护用 PDB 保留可用副本，压力驱逐按 QoS 和优先级决策  |
| 第 11 章 | Trouble Shooting             | Event、容器日志、systemd 服务日志、常见失败和社区求助                                                                                  | 从对象状态和 Event 开始，向容器日志、节点组件日志逐层下钻，避免一开始就在所有节点盲查                   |
| 第 12 章 | 开发中的新功能               | Windows Worker、GPU Device Plugin、VPA、CNCF 生态和 SIG 开发模式                                                                       | 异构节点用 OS/架构标签和调度隔离；GPU 作为扩展资源；VPA 依据历史用量建议或调整 Request                  |
| 附录 A   | 核心服务配置详解             | 公共参数；kube-apiserver、kube-controller-manager、kube-scheduler、kubelet、kube-proxy 的启动参数                                        | 用组件 `--help` 与版本化配置 API 核对实际参数；不要把 1.19 参数表直接复制到现代集群                     |

---

## 三、按原书顺序走完 Kubernetes 生命周期

Kubernetes 的生命周期可以概括为“建模与建群 → 调度运行 → 服务接入 → 控制与治理 → 网络存储 → 平台扩展 → 持续运营 → 故障恢复”。以下阶段标题服从这条生命周期，但第 1 章到第 12 章、附录 A 的顺序完全保持原书顺序；跨章概念只做前后引用，不提前替代后续章节。

### 3.1 建模起点：从容器到 Pod、Deployment 与 Service【第 1 章】

#### 第 1 章路线

| 原书小节 | 入门阶段建立的认识 |
| -------- | ------------------ |
| 1.1 了解 Kubernetes | 从 Google Borg 经验、容器技术和分布式系统背景定义 Kubernetes 的定位。 |
| 1.2 为什么使用 Kubernetes | 归纳轻量、开放、可移植、自动调度与自愈等能力，并指出它围绕 Service 组织应用。 |
| 1.3 简单实例 | 按环境准备、MySQL、Tomcat、浏览器访问四步跑通两层 Web 应用，第一次看到 Deployment 与 Service 的配合。 |
| 1.4 概念和术语 | 先总览资源对象，再按集群类、应用类、存储类、安全类组织 Node、Pod、控制器、Service、配置、PV/PVC、ServiceAccount 等对象。 |

#### 为什么不能只管理容器

单个容器没有表达“这两个进程必须共用网络和存储”“永远保持三个副本”“这个地址应长期不变”的能力。Kubernetes 因此把容器包装为 Pod，把副本和升级交给 Controller，把稳定访问交给 Service。

原书第 1.3 节用 MySQL 与 Tomcat 留言板贯穿入门：MySQL Deployment 保持一个数据库 Pod，MySQL Service 暴露 3306；Tomcat Deployment 通过服务名访问数据库，Web Service 以 NodePort `30001` 暴露到集群外。

【原书示例整理，并更新为稳定 API】核心关系可以缩减为：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myweb
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myweb
  template:
    metadata:
      labels:
        app: myweb
    spec:
      containers:
        - name: tomcat
          image: kubeguide/tomcat-app:v1
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: myweb
spec:
  selector:
    app: myweb
  ports:
    - port: 8080
      targetPort: 8080
      nodePort: 30001
  type: NodePort
```

这里最重要的不是 YAML 语法，而是松耦合关系：Deployment 的 selector 匹配 Pod template 的 label，Service 再以相同 label 找到后端。Pod 名称和 IP 都可以变化，Service 的名字与 ClusterIP 提供稳定契约。

#### 基本术语

- **Container**：由镜像启动的隔离进程，不等同轻量虚拟机。
- **Pod**：Kubernetes 最小调度单元；同一 Pod 的容器共享网络命名空间，可通过 `localhost` 通信，并可共享 Volume。
- **Pause container**：持有 Pod 网络命名空间等基础资源的沙箱容器；业务容器加入该沙箱。
- **Label / Selector**：键值标签及其选择条件，是 Controller、Service 与 Pod 建立松耦合关联的基础。
- **Annotation**：供工具和控制器记录非筛选性元数据，不应承担 Label 的选择职责。
- **Deployment**：管理无状态 Pod 的声明式工作负载控制器，底层维护 ReplicaSet，支持滚动升级和回滚。
- **Service**：一组后端 Pod 的稳定网络入口和发现名称。
- **desired state / actual state**：用户声明的期望状态与集群观测到的实际状态；控制器持续让二者收敛。

#### 版本边界、局限和正确用法

原书仍大量讲解 ReplicationController（RC），但同时明确官方建议用 Deployment 管理 ReplicaSet，而非直接操作底层 RS。现代无状态应用应默认使用 Deployment。裸 Pod 缺少副本自愈和声明式升级，只适合短期实验；静态 Pod 由 kubelet 直接管理，适合控制面等节点级组件，不适合作为普通应用部署方式。

通俗理解：容器是一个演员，Pod 是必须共同登台的小组，Deployment 是始终保证演员数量和版本的舞台监督，Service 是观众永远使用的固定入口。

### 3.2 集群诞生：控制面、kubeadm、高可用与 CRI【第 2 章】

#### 第 2 章路线

| 原书小节 | 安装与操作主线 |
| -------- | -------------- |
| 2.1 系统要求 | 明确 Linux、主机、网络、运行时和资源前提；书中基线是 CentOS 7 与 Kubernetes 1.19。 |
| 2.2 kubeadm | 依次安装工具、修改配置、拉取镜像、初始化控制面、加入 Node、安装 CNI 并验证集群。 |
| 2.3 二进制高可用 | 从 CA 和 etcd 开始，部署 3 个控制面、Node 服务与 token 认证，展示组件之间真实的证书和参数关系。 |
| 2.4 私有镜像库 | 让节点能够认证并拉取企业内部镜像，处理隔离网络和镜像分发。 |
| 2.5 版本升级 | 分别讲解二进制替换和 kubeadm 升级；升级本质还包括 API、etcd、CNI/CSI 与版本偏差治理。 |
| 2.6 CRI | 从接口、组件、Pod/容器生命周期到 Docker-CRI 实验，解释 kubelet 与运行时如何解耦。 |
| 2.7 kubectl | 系统整理命令、资源类型、公共参数、格式化输出和常用操作，是后续所有实验的入口。 |

#### 原书部署路线及其架构意义

第 2 章给出两条路线：

- kubeadm 快速安装，用于学习和标准化引导；
- Kubernetes 1.19 二进制安装，构建 3 控制节点、启用 CA 认证，并用 HAProxy+Keepalived 暴露 API Server VIP。

生产架构中的关键不是逐条复制 systemd 参数，而是理解故障域：etcd 要有奇数成员形成多数派；API Server 可横向扩展；Scheduler 和 Controller Manager 通过 leader election 保持单活协调；Worker 应通过稳定的控制面端点访问 API Server。

```mermaid
flowchart TB
    LB[稳定控制面端点<br/>云LB或HAProxy VIP]
    LB --> A1[kube-apiserver 1]
    LB --> A2[kube-apiserver 2]
    LB --> A3[kube-apiserver 3]
    A1 --> E[(etcd 3/5成员)]
    A2 --> E
    A3 --> E
    CM[controller-manager Leader] --> A1
    S[scheduler Leader] --> A2
    W[Worker kubelet] --> LB
```

#### CRI 解耦运行时

书中第 2.6 节把 CRI 定义为 kubelet 与容器运行时之间的 gRPC 插件接口，主要包含 `RuntimeService` 和 `ImageService`。这使 kubelet 不必为 Docker、containerd、CRI-O 等逐个内置实现。

- **CRI**：Container Runtime Interface，容器运行时接口。
- **CNI**：Container Network Interface，容器网络接口；负责给 Pod 沙箱接通网络。
- **CSI**：Container Storage Interface，容器存储接口；负责卷的供应、挂载与卸载。
- **kubeadm**：引导集群的官方工具，不负责安装所有后续运维组件。
- **etcd**：强一致键值数据库，保存 Kubernetes API 对象，是控制面最关键的持久状态。
- **control plane**：控制面。原书使用 `Master`，现代文档和命令更常使用 control plane。

【纠正，对应 2.2、2.3、2.6】书中以 CentOS 7、Docker 和 Kubernetes 1.19 为环境，相关仓库、镜像、kubeadm 配置版本及服务参数不能照搬。内置 Docker 集成 dockershim 已在 Kubernetes 1.24 移除；现在应使用实现 CRI 的 containerd、CRI-O，或额外的 `cri-dockerd` 适配 Docker Engine。

#### 安装的现实边界

自建控制面意味着自己负责证书轮换、etcd 快照与恢复、跨可用区延迟、版本偏差、CNI/CSI 升级和灾难演练。组织若没有明确的基础设施学习或合规要求，托管 Kubernetes 可以减少控制面负担。kubeadm 解决“如何正确引导”，不自动解决“如何长期运营”。

### 3.3 组织 Pod：定义、共享卷、ConfigMap 与 Downward API【第 3 章上】

#### 第 3 章前半路线

| 原书小节 | 这一节在解决什么问题 |
| -------- | -------------------- |
| 3.1 Pod 定义详解 | 逐字段解释 Pod、容器、端口、环境变量、资源、探针、Volume 与调度相关配置，建立读懂 YAML 的基础。 |
| 3.2 Pod 的基本用法 | 从单容器、多容器到静态 Pod，说明 Pod 是共同调度和共享上下文的最小单元，而不是单个进程的别名。 |
| 3.3 静态 Pod | 说明 kubelet 如何直接从本地 manifest 管理 Pod，以及 API Server 中 mirror Pod 与真实静态 Pod 的关系。 |
| 3.4 Pod 容器共享 Volume | 用同一个 Volume 在同一 Pod 的容器间交换文件，形成 sidecar 等协作模式。 |
| 3.5 Pod 的配置管理 | 讲解 ConfigMap 的命令行、YAML、环境变量和挂载文件用法，以及大小、命名空间和更新限制。 |
| 3.6 Downward API | 把 Pod 名称、Label、Annotation、IP 和资源约束等运行上下文注入环境变量或文件，避免应用反查控制面。 |

#### 配置与镜像分离

第 3.5 节明确提出最佳实践：应用所需配置应与程序分离，使同一镜像能在不同环境复用。ConfigMap 可通过环境变量、命令行参数或 Volume 文件注入；Downward API 将 Pod 名称、Namespace、Label、资源 Request/Limit 等自身信息暴露给容器。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: info
  app.yaml: |
    featureEnabled: true
---
apiVersion: v1
kind: Pod
metadata:
  name: config-demo
spec:
  containers:
    - name: app
      image: example/app:1.0
      envFrom:
        - configMapRef:
            name: app-config
      env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
```

#### 术语、限制与安全纠正

- **ConfigMap**：保存非敏感配置的 namespaced API 对象。
- **Downward API**：把 Kubernetes 已知的 Pod/容器元数据向下暴露给容器。
- **Projected Volume**：把 ConfigMap、Secret、ServiceAccount Token 等多个来源投射到同一目录；Secret 的安全边界在第 6 章讨论。
- **immutable configuration**：不可变 ConfigMap/Secret，适合降低 watch 压力并防止意外修改；变更时创建新名称和滚动更新引用者。

环境变量在进程启动后不会自动更新；Volume 形式的 ConfigMap 通常会延迟刷新，但使用 `subPath` 挂载时不会获得自动更新。应用是否热加载配置也必须明确。简单说，ConfigMap 是“外置说明书”，Downward API 则是运行平台夹在说明书里的“本实例信息页”。

### 3.4 Pod 运行：探针、控制器、调度、升级与扩缩容【第 3 章】

#### 第 3 章后半路线

| 原书小节 | 这一节在解决什么问题 |
| -------- | -------------------- |
| 3.7 生命周期和重启策略 | 区分 Pod Phase、容器状态与 `restartPolicy`，解释应用退出后由谁、按什么策略重启。 |
| 3.8 健康与可用性检查 | 用 liveness、readiness、startup probe 分别判断“要不要重启”“能否接流量”“是否仍在启动”。 |
| 3.9 Pod 调度 | 按顺序覆盖 Deployment/RC、NodeSelector、节点与 Pod 亲和、污点容忍、优先级抢占、DaemonSet、Job、CronJob、自定义调度器和容灾调度。 |
| 3.10 Init Container | 把依赖等待、配置生成、权限准备等一次性前置任务与业务容器分开，并保证顺序完成。 |
| 3.11 升级和回滚 | 讲解 Deployment 滚动更新、历史版本、暂停/恢复，以及 DaemonSet、StatefulSet 的不同更新策略。 |
| 3.12 扩缩容 | 从 `kubectl scale` 进入 HPA，说明资源指标、自定义指标和算法如何驱动副本变化。 |
| 3.13 StatefulSet 实战 | 用 MongoDB 说明稳定网络身份、有序部署与 PVC 模板，但数据库成员关系和备份仍需应用或 Operator 负责。 |

#### 三种探针回答三个不同问题

【原书】第 3.8 节区分 Exec、TCP、HTTP 三类检查动作，并讲解 Liveness、Readiness、Startup 三类探针。现代整理示例：

```yaml
containers:
  - name: api
    image: example/api:2.0
    ports:
      - containerPort: 8080
    startupProbe:
      httpGet:
        path: /startup
        port: 8080
      periodSeconds: 10
      failureThreshold: 30
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 5
      failureThreshold: 2
    livenessProbe:
      httpGet:
        path: /live
        port: 8080
      periodSeconds: 10
      failureThreshold: 3
```

- **Startup Probe**：应用是否完成启动；成功前会抑制 liveness/readiness，适合慢启动程序。
- **Readiness Probe**：是否可以接收流量；失败时从 Service Endpoint 移除，不重启容器。
- **Liveness Probe**：进程是否陷入不可恢复状态；连续失败触发重启。
- **Readiness Gate**：让外部 Controller 给 Pod 增加自定义就绪条件。

三者不能共用一个“深度依赖检查”：如果数据库短时不可用就让 liveness 失败，所有 Pod 可能一起重启，反而放大故障。存活检查应浅，就绪检查可以体现接流能力，启动检查只覆盖初始化窗口。

#### 工作负载控制器的选择

| 工作负载        | 控制器      | 书中用途                                   | 关键限制                                 |
| --------------- | ----------- | ------------------------------------------ | ---------------------------------------- |
| 无状态常驻服务  | Deployment  | 副本、滚动升级、回滚                       | Pod 身份与本地磁盘不可依赖               |
| 每节点一个代理  | DaemonSet   | 日志、监控、网络 Agent                     | 节点加入即部署，要设置容忍和资源预算     |
| 一次性/并行任务 | Job         | 批处理                                     | 必须设计幂等、重试和完成判定             |
| 定时任务        | CronJob     | 周期批处理                                 | 并发策略、错过调度和时区需明确           |
| 有状态集群      | StatefulSet | 固定序号、稳定网络名、PVC 绑定             | 不会自动理解数据库成员变更和备份语义     |
| 复杂有状态软件  | Operator    | 书中指出通过自定义 Controller 编码运维知识 | 开发与升级成本高，错误控制器可能扩大故障 |

#### 调度不是指定一台机器

```yaml
spec:
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app: api
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: workload.example.com/tier
                operator: In
                values: [general]
```

- **nodeSelector**：按 Node Label 的简单硬选择。
- **Node Affinity**：支持集合表达式、硬约束和带权软偏好。
- **Pod Affinity/Anti-Affinity**：依据其他 Pod Label 决定靠近或分散。
- **Taint/Toleration**：Node 排斥 Pod，Pod 的 toleration 表示能够容忍，但不保证会调度过去。
- **Priority/Preemption**：高优先级 Pod 在资源不足时可能抢占低优先级 Pod。
- **Topology Spread Constraint**：按 zone、hostname 等拓扑域控制副本偏斜，直接表达容灾分布。

原书预测 NodeSelector 最终会被废弃，但它至今仍是简单且稳定的能力；应把这句话视为 2021 年的趋势判断，而不是已发生事实。调度约束越多，越容易形成无解的 Pending Pod，应以最少硬约束、更多软偏好为原则。

#### 滚动更新与自动扩缩容

Deployment 的 `maxSurge` 决定升级时可超出期望副本的数量，`maxUnavailable` 决定允许不可用的数量。滚动发布安全与否还取决于 readiness、`terminationGracePeriodSeconds`、`preStop`、连接排空和容量冗余。

【原书】HPA 从 Metrics Server 获取 CPU/内存，从 custom/external metrics API 获取应用或外部指标。现代示例采用 `autoscaling/v2`：

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
```

HPA 的 CPU utilization 以 Request 为分母，没有合理 Request 就没有可靠含义。VPA 修改 Request 可能需要重建 Pod，HPA 与 VPA 同时控制同一资源指标会相互干扰；队列消费者更适合按积压量扩缩。扩容也受镜像拉取、节点容量、初始化时间和下游承载能力限制。

### 3.5 服务被发现：Service、CoreDNS、EndpointSlice 与 Ingress【第 4 章】

#### 第 4 章路线

| 原书小节 | 这一节在解决什么问题 |
| -------- | -------------------- |
| 4.1 Service 定义 | 从 selector、端口、ClusterIP、会话亲和、外部流量策略等字段建立稳定入口。 |
| 4.2 概念和原理 | 顺序讲解负载均衡、多端口、无 selector 的外部服务、NodePort/LoadBalancer、协议、发现、Headless、EndpointSlice 与拓扑。 |
| 4.3 CoreDNS | 部署和配置集群 DNS，把 Service 名字转换为可用地址。 |
| 4.4 NodeLocal DNSCache | 将缓存下沉到节点，降低集中式 DNS 与 UDP conntrack 压力。 |
| 4.5 Pod DNS | 解释 Pod 域名、hostname/subdomain、`dnsPolicy` 与 `dnsConfig`。 |
| 4.6 Ingress | 由 Ingress 描述七层规则，由 Ingress Controller 实际实现 HTTP(S) 路由和 TLS。 |

#### 稳定入口如何屏蔽 Pod 变化

第 4 章把 Service 称为 Kubernetes 实现微服务的核心概念。Selector 找到 Pod，控制器生成 Endpoint/EndpointSlice，kube-proxy 或其他数据面把 ClusterIP 流量转发到后端。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
  ports:
    - name: http
      port: 80
      targetPort: 8080
```

同 Namespace 内用 `api`，跨 Namespace 用 `api.team-a`，完整域名通常为 `api.team-a.svc.cluster.local`。Headless Service 设置 `clusterIP: None`，DNS 直接返回后端地址，适合 StatefulSet 的稳定成员发现或客户端自选后端。

- **ClusterIP**：集群内部虚拟服务地址。
- **NodePort**：在每个节点开放端口并转发到 Service；适合基础接入，不是完整七层网关。
- **LoadBalancer**：请求云控制器或实现方创建外部负载均衡器。
- **ExternalName**：以 DNS CNAME 把 Service 映射到外部名称，不产生代理数据面。
- **EndpointSlice**：对后端端点分片并携带拓扑信息，改善大规模 Endpoint 对象的容量和更新成本。
- **CoreDNS**：默认集群 DNS，通过插件链完成 Kubernetes 服务发现和上游解析。
- **NodeLocal DNSCache**：每节点缓存 DNS，减少集中 DNS 服务和 conntrack 压力。

#### Ingress 是规则，不是代理进程

原书第 4.6 节先部署 NGINX Ingress Controller，再创建 Ingress，并强调 Controller 持续监听 API Server 的 Ingress 变化后生成转发配置。稳定 API 示例：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mywebsite
spec:
  ingressClassName: nginx
  tls:
    - hosts: [mywebsite.example.com]
      secretName: mywebsite-tls
  rules:
    - host: mywebsite.example.com
      http:
        paths:
          - path: /demo
            pathType: Prefix
            backend:
              service:
                name: myweb
                port:
                  number: 8080
```

【版本变化】书中已介绍 Kubernetes 1.19 的 `networking.k8s.io/v1`、`pathType` 和 `IngressClass`，这是第五版很有价值的更新。更旧的 `extensions/v1beta1`/`networking.k8s.io/v1beta1` Ingress 已删除，后端字段从 `serviceName/servicePort` 改为 `service.name/service.port`。

Ingress API 只描述有限 HTTP(S) 路由，重写、认证、限流等通常依赖 Controller 注解，形成实现方锁定。Gateway API 用 GatewayClass、Gateway、HTTPRoute 等拆分基础设施和应用职责，是现代扩展方向，但属于书外内容。

### 3.6 控制面原理：API、List-Watch、Controller 与 Scheduler【第 5 章】

#### 第 5 章路线

| 原书小节 | 组件职责与边界 |
| -------- | -------------- |
| 5.1 API Server | 暴露 REST API，完成校验、认证授权、准入、版本转换并持久化，是组件通信的数据总线。 |
| 5.2 Controller Manager | 运行副本、Node、ResourceQuota、Namespace、Service/Endpoint 等控制器，使实际状态向期望状态收敛。 |
| 5.3 Scheduler | 对未绑定 Pod 进行排队、过滤、评分和绑定；Scheduler Framework 提供插件扩展点。 |
| 5.4 kubelet | 管理本节点 Pod、探针、状态与运行时；书中还介绍 cAdvisor、PLEG、RuntimeClass 等节点机制。 |
| 5.5 kube-proxy | 从用户态代理到 iptables、IPVS，展示 Service 数据面逐步移入内核的演进。 |

#### API Server 是总线，不是所有工作的执行者

原书对 API Server 的原话是：

> “成为集群内各个功能模块之间数据交互和通信的中心枢纽，是整个系统的数据总线和数据中心。”

典型创建流程如下：

1. 客户端提交 Deployment，API Server 完成认证、授权、准入和校验并写入 etcd。
2. Deployment Controller watch 到对象，创建 ReplicaSet。
3. ReplicaSet Controller 创建未绑定节点的 Pod。
4. Scheduler watch 到 Pod，过滤和评分后写入 `spec.nodeName`/Binding。
5. 目标 Node 的 kubelet watch 到 Pod，经 CRI 拉镜像、建沙箱并启动容器。
6. EndpointSlice Controller 根据 Service selector 和 Ready Pod 更新后端。

```mermaid
sequenceDiagram
    participant U as kubectl
    participant A as API Server
    participant E as etcd
    participant C as Controllers
    participant S as Scheduler
    participant K as kubelet
    U->>A: Apply Deployment
    A->>E: Persist desired state
    A-->>C: Watch event
    C->>A: Create RS and Pods
    A-->>S: Watch unscheduled Pod
    S->>A: Bind Pod to Node
    A-->>K: Watch assigned Pod
    K->>A: Report Pod status
```

- **REST**：Representational State Transfer，以资源、统一接口、无状态等约束组织 Web API 的架构风格。
- **List-Watch**：先列出当前对象和 `resourceVersion`，再从该版本持续监听变化。
- **reconciliation loop**：协调循环，反复观察、比较并采取动作，不依赖一次性命令必然成功。
- **Controller**：针对某类资源运行协调逻辑的控制器。
- **Scheduler Framework**：把调度拆成 QueueSort、Filter、Score、Reserve、Permit、Bind 等扩展点的框架。
- **Server-Side Apply**：API Server 跟踪字段所有者并合并声明，冲突时显式报告。

#### kubelet 和 kube-proxy 的边界

kubelet 负责本节点 Pod 全生命周期、探针和状态上报；它不负责跨节点调度。kube-proxy 监听 Service/EndpointSlice，落实服务转发规则。原书按用户态代理、iptables、IPVS 讲述三代实现，清楚展示了数据面从“每包经过进程”到“内核规则转发”的演化。

控制器的优势是能处理短暂失败和最终一致，局限是异步：`kubectl apply` 成功只表示对象被 API 接受，不代表容器已 Ready。排障时必须沿 OwnerReference、Condition、Event 和各控制器职责逐层定位。

### 3.7 API 请求的安全链：认证、授权、准入与运行时限制【第 6 章】

#### 第 6 章路线

| 原书小节 | 防护目标 |
| -------- | -------- |
| 6.1 认证 | 用客户端证书、Bearer Token、OIDC 或认证代理回答“调用者是谁”。 |
| 6.2 授权 | 比较 ABAC、Webhook、RBAC、Node Authorizer，回答“这个身份能做什么”。 |
| 6.3 Admission Control | 在授权之后、持久化之前执行默认、校验、配额和安全策略。 |
| 6.4 ServiceAccount | 给 Pod 内程序提供 Kubernetes 身份，并由 RBAC 约束其 API 权限。 |
| 6.5 Secret | 管理凭据、证书、镜像仓库认证等敏感数据，但仍需静态加密、访问控制与轮换。 |
| 6.6 Pod 安全 | 原书以 PSP 和 SecurityContext 约束特权、用户、Capability、SELinux 与只读文件系统。 |

#### 四道边界

```text
TLS连接 → Authentication → Authorization → Admission → 写入etcd
             你是谁            能做什么          这个对象是否合规
```

原书讲解 X.509 客户端证书、Bearer Token、OIDC 和认证代理；授权部分比较 ABAC、Webhook、RBAC；准入部分覆盖内置插件和 Admission Webhook；工作负载安全则由 ServiceAccount、Secret、SecurityContext 和当时的 PodSecurityPolicy 组成。

最小 RBAC 示例：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: team-a
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: team-a
subjects:
  - kind: ServiceAccount
    name: observer
    namespace: team-a
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: pod-reader
```

- **Authentication**：验证调用者身份。
- **Authorization**：针对 user/group、verb、resource、namespace 等判断是否允许操作。
- **RBAC**：Role-Based Access Control，基于角色的访问控制。
- **Admission Controller**：授权后、持久化前修改或拒绝对象的准入控制器。
- **ServiceAccount**：Pod 内进程使用的 Kubernetes 身份，不是人类账号。
- **SecurityContext**：Pod/Container 的 UID、GID、capability、seccomp、只读根文件系统等运行安全设置。
- **OIDC**：OpenID Connect，基于 OAuth 2.0 的身份层，可把外部 IdP 接入 API Server。

#### Secret 不是“做过 Base64 就安全”

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: app
  password: change-me
```

- **Secret**：保存敏感字节数据的 namespaced API 对象；`data` 是 Base64 编码，`stringData` 由 API Server 转换为 `data`。
- **encryption at rest**：API Server 写入 etcd 前按 EncryptionConfiguration 加密敏感资源，不能由 Base64 代替。
- **KMS**：Key Management Service，把密钥保护和轮换交给外部密钥系统，降低密钥与密文同处一地的风险。
- **short-lived token**：短期令牌；现代 ServiceAccount 投射令牌可绑定受众和过期时间，比长期静态 token 更易控制泄露窗口。

【纠正，对应 1.4.3、6.5】原书写到 Kubernetes 1.7 以后 Secret 数据“可以以加密形式保存”。必须补充：Secret 默认的 Base64 **不是加密**；etcd 静态加密要显式配置，传输依赖 TLS，读取权限依赖 RBAC。更严格场景还应结合 KMS、Secrets Store CSI Driver 或专门的 Secret Manager。环境变量中的 Secret 在进程启动后不会自动更新，进程转储和调试接口也可能暴露它；文件投射虽然可轮换，应用仍需实现重载。

#### PSP 已退出，思想并未退出

【纠正，对应 6.6】PodSecurityPolicy 在原书的 1.19 时代为 Beta，后来已废弃并在 Kubernetes 1.25 删除。现代内置方案是 Pod Security Admission 按 Namespace 标签执行 Privileged、Baseline、Restricted 标准；复杂策略可使用 ValidatingAdmissionPolicy、Kyverno 或 OPA Gatekeeper。

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

工作负载本身仍应设置 `runAsNonRoot`、`allowPrivilegeEscalation: false`、只读根文件系统、删除多余 Linux capabilities 和合适的 seccomp profile。Namespace 不是强安全边界，默认 ServiceAccount token、节点权限、网络和存储也要一起治理。

### 3.8 Pod 获得网络：namespace、CNI、Service 数据面与 NetworkPolicy【第 7 章】

#### 第 7 章路线

| 原书小节 | 数据包视角下的作用 |
| -------- | ------------------ |
| 7.1 网络模型 | 规定每个 Pod 有独立 IP，Pod 之间无需 NAT 即可直接通信，Node 与 Pod 也能互通。 |
| 7.2 Docker 网络基础 | 解释 network namespace、veth、bridge、iptables/Netfilter 和路由，为后面的数据路径打基础。 |
| 7.3 Docker 网络实现 | 对比无端口映射与有端口映射时的主机规则，并指出单机 bridge 难以直接跨主机。 |
| 7.4 Kubernetes 网络实现 | 区分同 Pod 容器、同节点 Pod 和跨节点 Pod 的通信路径。 |
| 7.5 Pod 与 Service 实战 | 从 RC/Pod 到 Service，实际观察容器地址、规则和访问链路。 |
| 7.6 CNI | 先对比 Docker CNM，再解释 CNI 配置、插件调用和 IPAM，说明 kubelet/运行时如何为 Pod 接网。 |
| 7.7 开源网络方案 | 比较 Flannel、Open vSwitch、直接路由和 Calico 的封装、路由与策略取舍。 |
| 7.8 NetworkPolicy | 用 selector 和 ingress/egress allow-list 隔离工作负载，并强调 CNI 必须实现策略。 |
| 7.9 IPv4/IPv6 双栈 | 配置双栈集群并验证 Pod 与 Service 地址族，是原书面向 1.19 的新特性之一。 |

#### 原书的网络原则

第 7.1 节给出精确原则：

> “每个 Pod 都拥有一个独立的 IP 地址，并假定所有 Pod 都在一个可以直接连通的、扁平的网络空间中。”

同一 Pod 的容器共享网络命名空间；同节点 Pod 通常通过 veth 与桥或 eBPF 数据面连接；跨节点可用路由或 VXLAN/IP-in-IP 等隧道；Service 则在 Pod 网络之上提供虚拟入口。

```text
容器 eth0
   │
 veth pair
   │
节点网络数据面 ── 路由/隧道/eBPF ── 另一节点 ── 目标Pod
   │
Service规则：ClusterIP → 一个EndpointSlice后端
```

- **network namespace**：独立的网卡、地址、路由、端口与 netfilter 视图。
- **veth pair**：成对虚拟以太网设备，一端收到的包从另一端出现，用于连接命名空间。
- **bridge**：二层软件交换设备。
- **Netfilter**：Linux 内核包处理钩子框架，iptables/nftables 在其上配置规则。
- **overlay/underlay**：在现有网络上封装出的虚拟网络 / 直接使用底层路由可达性的网络。
- **CNI**：kubelet/运行时在创建和删除 Pod 沙箱时调用的网络插件规范。
- **BGP**：Border Gateway Protocol；Calico 可用它分发 Pod 路由。
- **IPVS**：IP Virtual Server，内核四层负载均衡能力，书中称第三代 kube-proxy 模式。

#### NetworkPolicy 是声明，还需要实现者

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-only-from-web
  namespace: team-a
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes: [Ingress, Egress]
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: web
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: data
      ports:
        - protocol: TCP
          port: 5432
```

只有 CNI 插件实现 NetworkPolicy 时，创建对象才会产生隔离效果；Flannel 单独部署通常不负责完整策略执行，Calico、Cilium 等可以。策略是 allow-list 语义，选中 Pod 后未允许的对应方向流量被拒绝。生产落地常从观测开始，再逐 Namespace 建立 default-deny、DNS egress 和必要白名单，避免一次切断所有依赖。

【时效说明】原书花大量篇幅解释 Docker bridge、Open vSwitch、Flannel 与 Calico，这些原理仍有价值；现代数据面还广泛采用 eBPF，能够减少长 iptables 链并整合网络、策略和可观测性。选择 CNI 时应比较封装开销、底层路由条件、NetworkPolicy 语义、双栈、加密、运维工具和升级路径，而不是只看吞吐基准。

### 3.9 数据跨越 Pod：Volume、PV/PVC、StorageClass 与 CSI【第 8 章】

#### 第 8 章路线

| 原书小节 | 存储生命周期中的位置 |
| -------- | -------------------- |
| 8.1 存储机制 | 先区分临时卷、配置投射、网络存储和 Node 本地卷，再说明卷如何映射进容器。 |
| 8.2 PV/PVC | 讲清供应、申请、匹配、绑定、挂载、回收，以及访问模式、StorageClass 和延迟绑定。 |
| 8.3 GlusterFS/Heketi 实战 | 用当时的方案串起动态供应全流程；流程思想可迁移，具体插件已过时。 |
| 8.4 CSI | 解释 Controller/Node 插件、sidecar、注册、拓扑、快照和 in-tree 迁移，建立现代存储驱动模型。 |

#### 从“目录挂载”到声明式供应

容器可写层随容器重建而变化，同 Pod 的 `emptyDir` 随 Pod 删除而消失。第 8 章用 PV/PVC 将“管理员或驱动提供什么”与“应用申请什么”解耦：

```mermaid
flowchart LR
    SC[StorageClass<br/>provisioner与参数] --> PVC[PVC<br/>容量与访问模式]
    PVC --> PV[动态创建并绑定PV]
    PV --> CSI[CSI Driver<br/>Attach Mount]
    CSI --> P[Pod volumeMount]
```

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-data
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: fast-block
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 1
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
        - name: db
          image: example/database:1.0
          volumeMounts:
            - name: data
              mountPath: /var/lib/database
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: fast-block
        resources:
          requests:
            storage: 20Gi
```

- **PV**：PersistentVolume，集群级持久卷资源及后端存储的抽象。
- **PVC**：PersistentVolumeClaim，命名空间内用户对容量、访问模式、存储类的申请。
- **StorageClass**：动态供应模板，声明 provisioner、参数、回收和绑定策略。
- **access mode**：RWO/ROX/RWX/RWOP 等访问语义；它描述后端能力，不等同数据库并发一致性。
- **reclaim policy**：PVC/PV 释放后的 Delete 或 Retain 策略。
- **CSI**：厂商中立的存储插件接口，把驱动从 Kubernetes 主代码库解耦。
- **VolumeSnapshot**：CSI 快照 API；快照不是天然一致的数据库备份，仍需应用冻结或日志协同。

#### 历史方案与现代边界

【原书】8.3 用 GlusterFS+Heketi 完整演示 StorageClass 动态供应；真正可迁移的知识是 PVC 触发 provisioner、绑定 PV、挂载进 Pod 的过程。

【纠正，对应 8.3】GlusterFS in-tree volume 插件已移除，Heketi 项目也已归档，不能把该章命令作为新集群方案。应选择仍受支持的 CSI Driver，例如云盘 CSI、Ceph RBD/CephFS、Longhorn 或企业存储方案，并验证升级、拓扑、快照、扩容与灾难恢复。

【原书前瞻】8.4 对 in-tree 插件紧耦合问题的分析仍然准确：驱动随 Kubernetes 二进制发布会拖慢双方迭代，因此 CSI 外置控制器和 Node 插件是正确方向。今天应优先使用 CSI，而不是继续新增 in-tree 配置。

存储最常被误解为“PVC Bound 就安全”。Bound 只证明资源匹配，不证明有备份、跨区恢复、性能达标或应用一致性。对数据库要同时设计备份恢复演练、拓扑约束、扩容、故障切换和数据校验。

### 3.10 扩展平台：客户端、CRD、Controller 与聚合 API【第 9 章】

#### 第 9 章路线

| 原书小节 | 开发者得到的能力 |
| -------- | ---------------- |
| 9.1 REST | 用资源、HTTP 方法、状态码和无状态约束理解 Kubernetes API 的外形。 |
| 9.2 Kubernetes API | 解释 API 路径、版本演进、Group、REST 方法、响应与错误，为客户端和扩展开发奠基。 |
| 9.3 Fabric8 | 以 Java 客户端演示连接配置、CRUD、watch、Pod 日志和其他客户端库。 |
| 9.4 API 扩展 | 比较 CRD 与 API Aggregation：前者复用主 API Server 存储，后者运行扩展 API Server。 |

#### API Group 与版本演进

第 9 章先讲 REST，再分析 Core Group `/api/v1` 与命名 API Group `/apis/<group>/<version>`，并以 Fabric8 Java Client 进行 CRUD、watch 等操作。使用官方或成熟客户端库的优势是处理认证、序列化、watch 重连和资源版本，而不是手写脆弱 HTTP。

- **GVK**：Group-Version-Kind，标识对象的 API 组、版本和类型。
- **GVR**：Group-Version-Resource，标识 REST 资源路径，resource 通常是复数小写。
- **CRD**：CustomResourceDefinition，自定义资源类型的结构和版本。
- **Custom Resource**：CRD 的具体实例，只保存声明数据。
- **Operator**：把领域运维知识写入 Controller，以 CR 管理复杂应用生命周期。
- **API Aggregation**：API Server 把某 API Group 路径代理到扩展 API Server；Metrics API 是典型应用。
- **OpenAPI schema**：定义字段结构、类型、必填项和校验规则，也支撑客户端发现和字段裁剪。

【版本校正】原书围绕 `apiextensions.k8s.io/v1beta1` 的时代展开，并已建议 CRD 使用 `versions` 和 OpenAPI v3 schema。现代稳定定义必须使用 `apiextensions.k8s.io/v1`：

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: backups.platform.example.com
spec:
  group: platform.example.com
  scope: Namespaced
  names:
    plural: backups
    singular: backup
    kind: Backup
    shortNames: [bk]
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required: [target]
              properties:
                target:
                  type: string
            status:
              type: object
              x-kubernetes-preserve-unknown-fields: true
      subresources:
        status: {}
```

CRD 只创建 API，不会自动执行备份；还必须有 Controller watch `Backup`，创建 Job、更新 status、处理重试、删除和幂等。控制器应使用 finalizer 谨慎清理外部资源，避免 finalizer 逻辑故障让对象永远卡在 Terminating。

简单 CRD+Controller 易于部署和复用 Kubernetes 认证、RBAC、存储；需要自定义存储、特殊协议或完整 API Server 行为时才考虑 Aggregated API Server。平台扩展的风险是把错误自动化：必须定义状态机、超时、速率限制、升级兼容和灾难恢复。

### 3.11 运营集群：资源、公平性、可观测性、审计与 Helm【第 10 章】

#### 第 10 章路线

| 原书小节 | 运维闭环中的任务 |
| -------- | ---------------- |
| 10.1 Node 管理 | 用 cordon、drain、uncordon 隔离和恢复节点，并讨论扩容。 |
| 10.2 更新 Label | 调整对象标签，使 selector、调度和组织方式能够演进。 |
| 10.3 Namespace/Context | 隔离资源命名和部分策略，通过 kubeconfig context 降低误操作。 |
| 10.4 资源管理 | 连续讲解 Request/Limit、LimitRange、QoS、Quota、共享 PID namespace、PID 限制、CPU Manager 与 Topology Manager。 |
| 10.5 压力驱逐 | 从 eviction signal、阈值和节点状态进入镜像/容器回收与 Pod 驱逐，解释节点如何自保。 |
| 10.6 PDB | 在 drain、升级等自愿中断时限制同时不可用的副本数。 |
| 10.7 监控 | 区分 Metrics Server 的资源指标与 Prometheus/Grafana 的长期监控。 |
| 10.8 日志 | 讨论 stdout/stderr、节点日志、Fluentd+Elasticsearch+Kibana 以及 sidecar 采集。 |
| 10.9 审计 | 由 API Server Audit Policy 记录身份、动作、对象与阶段，回答控制面“谁做了什么”。 |
| 10.10 Dashboard | 通过 Web UI 管理对象，同时暴露出认证、授权和对外暴露面的安全要求。 |
| 10.11 Helm | 从 v2/Tiller 迁移语境进入 v3，讲解 release、Chart、values、模板和私有仓库。 |

#### Request、Limit、QoS 和配额是一套系统

Scheduler 依据 Request 放置 Pod，kubelet/运行时通过 cgroup 落实部分 Limit；QoS 在节点资源紧张和 OOM 时影响驱逐优先级。原书第 10.4 节把它们与 LimitRange、ResourceQuota 串联，是生产治理的核心。

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-budget
  namespace: team-a
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "50"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: container-defaults
  namespace: team-a
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      default:
        cpu: 500m
        memory: 512Mi
```

- **Request**：调度和资源保障的基准，不是预留一块永不共享的物理 CPU。
- **Limit**：允许使用上限；CPU 通常被节流，内存超限会触发 OOM kill。
- **QoS**：Guaranteed、Burstable、BestEffort，依据 Request/Limit 组合自动分类。
- **LimitRange**：为 Namespace 内对象设置默认值、最小值、最大值或比例。
- **ResourceQuota**：限制 Namespace 汇总资源和对象数量。
- **eviction**：节点资源不足时 kubelet 按信号和优先级回收资源、驱逐 Pod。
- **PDB**：PodDisruptionBudget，限制自愿中断期间同时不可用的副本数量，不阻止节点故障等非自愿中断。

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api
```

PDB 不能创造容量；只有两个副本却要求 `minAvailable: 2` 会阻塞 drain。维护前应同时检查副本、跨节点/跨区分布、readiness 和优雅退出。

#### 指标、日志和审计的分工

原书从 Heapster 的退出讲到 Metrics Server，再搭建 Prometheus+node_exporter+Grafana 和 Fluentd+Elasticsearch+Kibana，并介绍 API Server Audit Policy。

| 信号             | 书中组件                                     | 适合回答                                      | 不应承担                             |
| ---------------- | -------------------------------------------- | --------------------------------------------- | ------------------------------------ |
| Resource Metrics | Metrics Server                               | HPA、VPA、`kubectl top` 所需 CPU/内存近实时值 | 长期监控和告警                       |
| Metrics          | Prometheus/Grafana                           | 趋势、SLO、容量、告警                         | 单个请求的完整上下文                 |
| Logs             | stdout/stderr、Fluentd、Elasticsearch/Kibana | 错误细节、业务事件、跨节点检索                | 精确低成本聚合统计                   |
| Events           | Kubernetes Event                             | 调度、拉镜像、挂载、探针等近期状态变化        | 长期可靠审计，Event 有保留期且会聚合 |
| Audit            | API Server Audit Log                         | 谁在何时对哪个资源做了什么                    | 容器内业务行为                       |

【时效说明】EFK 架构思想仍有效，但具体版本、Elasticsearch 安全设置和索引配置已经变化；也可选择 OpenSearch、Loki 或托管日志。Metrics Server 仍不是 Prometheus 的替代品。

#### Helm v3 的正确位置

书中同时解释 Helm v2/Tiller 和 Helm v3，并明确 v3 去除 Tiller、把 API 操作放回客户端，权限遵循调用者 kubeconfig/RBAC。新项目只使用 Helm v3。

Helm 是 Kubernetes YAML 的打包、模板化和 release 管理工具，不是 Operator：它擅长安装和升级一组资源，不会持续理解数据库主从、备份和应用内部状态。Chart 应固定依赖、校验 values、渲染后审查，并避免在模板中隐藏过多业务逻辑。

### 3.12 故障发生后：从对象事实到组件日志【第 11 章】

#### 第 11 章路线

| 原书小节 | 排障动作 |
| -------- | -------- |
| 11.1 Event | 先用 `get`/`describe` 观察对象状态、关联关系和近期事件，定位 Pending、拉镜像或调度失败。 |
| 11.2 容器日志 | 用 `kubectl logs` 和容器名进入应用层，原书同时提醒容器删除后本地日志可能丢失。 |
| 11.3 组件日志 | 查看 systemd journal 或组件日志，将全局故障归因到 API Server、Controller、Scheduler、kubelet、kube-proxy 或 etcd。 |
| 11.4 常见问题 | 依次分析 pause 镜像拉取失败、启动命令立即退出导致持续重启、服务名不可达三类案例。 |
| 11.5 寻求帮助 | 在提交社区问题前收集版本、资源定义、事件、日志、复现步骤与已尝试操作。 |

#### 原书的三层排障方法

第 11 章给出一条很实用的顺序：先看对象状态和 Event；再进容器或看容器日志；最后对全局问题联合分析 API Server、Scheduler、Controller Manager、kubelet、kube-proxy 日志。

```bash
# 1. 看期望状态、实际状态、Condition 和近期 Event
kubectl get pod -n team-a -o wide
kubectl describe pod api-xxxxx -n team-a
kubectl get events -n team-a --sort-by=.lastTimestamp

# 2. 看应用、上一个已崩溃实例和多容器中的指定容器
kubectl logs api-xxxxx -n team-a -c api
kubectl logs api-xxxxx -n team-a -c api --previous

# 3. 验证服务选择器、EndpointSlice、DNS 与网络
kubectl get svc,endpointslice -n team-a
kubectl exec -n team-a deploy/debug -- nslookup api.team-a.svc.cluster.local

# 4. 节点和组件层
kubectl describe node worker-1
journalctl -u kubelet --since '30 min ago'
```

```mermaid
flowchart TD
    A[Pod异常] --> B{Scheduled?}
    B -- 否 --> C[看Scheduler Event<br/>Request 亲和 污点 PVC]
    B -- 是 --> D{容器已创建?}
    D -- 否 --> E[看kubelet Event<br/>镜像 CNI CSI sandbox]
    D -- 是 --> F{Ready?}
    F -- 否 --> G[看探针 日志 端口 依赖]
    F -- 是 --> H{Service可达?}
    H -- 否 --> I[Selector EndpointSlice DNS NetworkPolicy]
    H -- 是 --> J[Ingress/LB TLS 路由和外部DNS]
```

- **Condition**：对象当前关键状态及原因，比单一 Phase 更有诊断价值。
- **Event**：组件针对对象记录的近期事件；重复事件可能被合并。
- **CrashLoopBackOff**：容器反复退出后的退避状态，是现象而非根因。
- **ImagePullBackOff**：镜像拉取失败后的退避，检查名称、凭据、仓库和网络。
- **Pending**：Pod 尚未完成调度或必要资源准备，常见原因是资源、约束和 PVC。
- **ephemeral container**：临时调试容器，可注入运行中 Pod 协助诊断，属于原书之后日渐成熟的能力。

不要在原因未知时反复删除 Pod：控制器只会重建相同配置，且可能抹掉现场。先保存 YAML、describe、Event、日志、节点状态和时间线，再决定回滚、隔离节点或重启。排障本质是沿控制链寻找“期望状态在哪一步没有变成实际状态”。

### 3.13 异构与资源适配：Windows、GPU、VPA 与社区演进【第 12 章】

第 12 章体现了 Kubernetes 从 Linux 容器平台向异构基础设施扩展：Windows Server Worker、GPU Device Plugin、Vertical Pod Autoscaler，以及 CNCF、SIG 驱动的社区路线。

| 原书小节 | 该能力的主线 |
| -------- | ------------ |
| 12.1 Windows 容器 | 从安装 Docker EE、部署 kubelet/kube-proxy 与 Flannel，到运行 Windows Pod；现代环境必须改按受支持的 Windows、containerd 和网络方案矩阵实施。 |
| 12.2 GPU | 安装驱动与 Device Plugin，把 GPU 注册为 `nvidia.com/gpu` 等扩展资源供 Pod 整数申请。 |
| 12.3 VPA | 由 Recommender、Updater、Admission Controller 形成建议或自动调整链路，并讨论与 HPA 的耦合和重建风险。 |
| 12.4 生态与演进 | 从 CNCF、CRI/CNI/CSI、API 扩展、安全和自动化运维路线，落到 SIG/工作组驱动的开发模式。 |

- **Windows Node**：运行 Windows 容器的 Worker；控制面仍运行在 Linux，Pod 需按 `kubernetes.io/os: windows` 调度，并遵守宿主机/镜像版本兼容。
- **Device Plugin**：kubelet 插件机制，把 GPU 等厂商资源注册为扩展资源，例如 `nvidia.com/gpu`。
- **VPA**：Vertical Pod Autoscaler，依据历史用量给出或应用 CPU/内存 Request 建议。
- **HPA/VPA/Cluster Autoscaler**：分别改变副本数、单 Pod 资源申请和节点数，作用层级不同。
- **CNCF**：Cloud Native Computing Foundation，云原生计算基金会。
- **SIG**：Special Interest Group，围绕某领域维护设计、代码和文档的特别兴趣小组。

GPU 申请示意：

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
```

这要求节点安装驱动并部署对应 device plugin。GPU 资源通常不可超卖、不可按小数申请，除非采用厂商提供的切分/共享机制。调度成功也不保证数据管道、显存和拓扑达到性能要求。

VPA 并非“自动调大就结束”：推荐模式可先只观察建议；自动更新可能重建 Pod；与 HPA 同时基于 CPU/内存会形成反馈竞争；StatefulSet 和单副本服务还要考虑中断。原书把这些列为发展中的能力是准确的，生产启用必须以 PDB、副本、维护窗口和回滚保护。

### 3.14 参数是版本化接口，不是永久答案【附录 A】

附录 A 的定位是“生产部署与日常运维的参数字典”。它依次列出公共参数、`kube-apiserver`、`kube-controller-manager`、`kube-scheduler`、`kubelet` 和 `kube-proxy` 的启动选项，补足第 2、5、10 章没有展开的配置面。原书建议使用 `cmd --help` 查看每个二进制的可用参数，这个方法今天仍成立；但 1.19 参数表只能解释历史配置，不能充当 1.36 的可复制模板。

| 附录小节 | 参数影响面 | 阅读和迁移重点 |
| -------- | ---------- | -------------- |
| A.1 公共参数 | 日志、调试、配置文件和通用运行行为 | 许多基于 glog 的旧日志参数已经变化；先看目标版本 `--help` 与结构化日志文档。 |
| A.2 kube-apiserver | HTTPS、etcd、认证授权、准入、审计、API 启用与限流 | 不安全端口已经移除；认证、加密、审计和准入必须按安全基线设计，参数间存在组合约束。 |
| A.3 kube-controller-manager | 各控制器、同步周期、并发度、证书签发与 leader election | 并发和同步周期会改变 API 压力；云控制器、存储和路由等能力已持续外置。 |
| A.4 kube-scheduler | 调度配置、profile、插件和 leader election | 现代版本优先使用版本化 `KubeSchedulerConfiguration`，不要依赖已删除的 policy 文件参数。 |
| A.5 kubelet | Pod 管理、CRI、镜像回收、驱逐、资源管理、证书、DNS 与探针 | 优先使用版本化 `KubeletConfiguration`；dockershim 参数、旧 cAdvisor/日志参数和部分 feature gate 已变化或删除。 |
| A.6 kube-proxy | iptables/IPVS/nftables 数据面、ClusterCIDR、conntrack 和健康端点 | 依据版本与 CNI 选择模式；若由 eBPF CNI 替代 kube-proxy，还要明确 Service 语义和升级责任由谁实现。 |

- **flag**：命令行选项，通常形如 `--name=value`；它是否存在、默认值是什么，都属于具体版本行为。
- **component config API**：组件的版本化配置对象，例如 `KubeletConfiguration`、`KubeSchedulerConfiguration`，比长串 flags 更便于审查和升级。
- **feature gate**：按版本启用或关闭特性的开关；特性 GA 后 gate 可能锁定并最终移除，不应永久留在配置中。
- **leader election**：Controller Manager、Scheduler 等多副本组件通过 Lease 选主，保证同一协调职责通常只有一个活跃执行者。

【纠正，对应附录 A】书中的 `--insecure-port`、dockershim、部分 in-tree 云/存储插件与旧日志 flags 已退出；把未知参数交给新二进制会直接导致组件启动失败。升级前应先获取新旧二进制的 `--help`、阅读官方弃用指南，迁移到版本化 ComponentConfig，并在非生产控制面验证。对于 kubeadm 集群，还要让 kubeadm 管理的静态 Pod manifest 与 kubelet 配置保持一致，避免手改文件在升级时被覆盖。

---

## 四、可复现的现代本地实验环境

原书的 CentOS 7 + Docker + kubeadm 1.19 环境具有明显版本依赖。下面使用【书外扩展】的 Docker + kind 构建一次性本地集群，目标是验证书中最核心的 Deployment、Service、探针、滚动更新和故障自愈。kind 用容器模拟 Node，适合学习和 CI，不代表生产高可用部署。

### 4.1 安装并检查前置工具

以下以 Windows 11 + PowerShell 为例。先在“管理员 PowerShell”启用 WSL 2；如果命令提示重启，重启后再继续：

```powershell
wsl --install
wsl --status
```

使用 Windows Package Manager 安装 Docker Desktop、`kubectl` 与 `kind`。`--exact` 避免同名包，两个 `--accept-*` 参数允许脚本化安装官方源中的包：

```powershell
winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements
winget install --id Kubernetes.kubectl --exact --accept-package-agreements --accept-source-agreements
winget install --id Kubernetes.kind --exact --accept-package-agreements --accept-source-agreements
```

启动 Docker Desktop，等待状态栏显示 Engine 正常运行。新开一个 PowerShell，确认 Docker 客户端能连接 Engine，且三个工具都能输出版本：

```powershell
docker version
kubectl version --client
kind version
```

如果 `docker version` 只有 Client、Server 部分报连接错误，说明 Docker Desktop 尚未启动或 WSL 2 后端未就绪；此时不要继续创建集群。Linux 主机可按 Docker Engine、kubectl 和 kind 各自官方安装页安装，后续 YAML 与 `kind` 命令相同。

### 4.2 创建双 Worker 集群

创建 `kind-cluster.yaml`：

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
```

执行：

```bash
kind create cluster --name guide-lab --config kind-cluster.yaml
kubectl cluster-info --context kind-guide-lab
kubectl get nodes -o wide
```

三个节点都应最终进入 `Ready`。若失败，先用 `kind export logs --name guide-lab` 保存诊断信息。

### 4.3 部署可观察的 Web 应用

创建 `web.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: web
      containers:
        - name: web
          image: nginx:stable-alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 32Mi
            limits:
              cpu: 250m
              memory: 128Mi
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 2
            periodSeconds: 3
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
```

应用并验证：

```bash
kubectl apply -f web.yaml
kubectl rollout status deployment/web
kubectl get pod -l app=web -o wide
kubectl get service web
kubectl get endpointslice -l kubernetes.io/service-name=web
```

### 4.4 验证服务、自愈与升级

```bash
# 本机端口转发到 Service
kubectl port-forward service/web 8080:80
# 另一个终端访问
curl http://127.0.0.1:8080/

# 删除一个 Pod，观察 Deployment 自动补齐
kubectl get pod -l app=web
kubectl delete pod <上一步列出的任意一个Pod名称>
kubectl get pod -l app=web -w

# 修改镜像并观察滚动更新；示例采用确定的兼容标签
kubectl set image deployment/web web=nginx:alpine
kubectl rollout status deployment/web
kubectl rollout history deployment/web

# 回滚
kubectl rollout undo deployment/web
kubectl rollout status deployment/web
```

`kubectl apply` 成功后还必须等待 rollout；删除 Pod 后新名称体现“实例可替换”；Service 的 ClusterIP 未变体现“入口稳定”。这三点正是第 1、3、4 章的主干。

### 4.5 清理实验环境

```bash
kind delete cluster --name guide-lab
```

本实验没有覆盖生产所需的多控制面、etcd 备份、真实 LoadBalancer、持久存储、证书和监控。生产部署应选择托管 Kubernetes，或按实际网络、存储、故障域和升级支持矩阵设计 kubeadm 集群，不能把 kind 当作生产方案。

---

## 五、第五版内容的纠正与时效索引

| 对应章节   | 书中版本语境                                             | 现代校正或迁移方向                                                                                           |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1.4.2      | 控制节点称 Master，Worker 曾称 Minion                    | 现代术语为 control plane/worker node；旧名称只用于理解历史配置                                               |
| 1.4.3、6.5 | Secret 可加密保存，示例容易让人把 Base64 当保护          | Base64 不是加密；显式开启 etcd encryption at rest，并结合 RBAC、KMS/外部 Secret 系统                         |
| 2.2 ～ 2.6 | CentOS 7、Docker、1.19 kubeadm 与二进制参数              | CentOS 7 已结束生命周期；dockershim 在 1.24 移除，使用 containerd/CRI-O 或 cri-dockerd                       |
| 3.9        | 大量 RC/直接 ReplicaSet 示例，并预测 NodeSelector 被弃用 | 默认以 Deployment 管理 RS；RC 仅作历史理解；NodeSelector 仍可用于简单硬选择                                  |
| 4.2.9      | EndpointSlice 处于 `discovery.k8s.io/v1beta1` 阶段       | 使用稳定的 `discovery.k8s.io/v1`；客户端优先 watch EndpointSlice 而非庞大 Endpoints                          |
| 4.6        | 同时讨论旧 Ingress 字段与 1.19 稳定 API                  | 只使用 `networking.k8s.io/v1`、`pathType`、`ingressClassName` 和新版 service backend；进一步评估 Gateway API |
| 5.1.1      | 提及 API Server 本地 8080 `--insecure-port`              | 不安全端口已移除；只通过 TLS secure port 访问 API Server                                                     |
| 5.5        | 用户态、iptables、IPVS 三代 kube-proxy                   | 原理仍有效；现代环境还可能使用 nftables 或由 eBPF CNI 替代部分 kube-proxy 数据面                             |
| 6.6        | PodSecurityPolicy 是 Beta 主方案                         | PSP 已在 1.25 删除；迁移到 Pod Security Admission/Standards 或策略引擎                                       |
| 8.3        | GlusterFS+Heketi 是动态供应完整实战                      | GlusterFS in-tree 插件已移除、Heketi 已归档；选择受支持 CSI 驱动                                             |
| 8.4        | CSI Migration 是发展中能力                               | 主流云存储已迁向 CSI；新环境不应依赖废弃 in-tree 驱动                                                        |
| 9.4        | CRD 示例包含 `apiextensions.k8s.io/v1beta1`              | v1beta1 在 1.22 删除；使用 `apiextensions.k8s.io/v1`，提供结构化 schema 和版本转换策略                       |
| 10.7       | 叙述 Heapster 迁移到 Metrics Server                      | Heapster 已退出；Metrics Server 只服务资源指标 API，长期观测另建 Prometheus 等系统                           |
| 10.11      | 同时介绍 Helm v2/Tiller 与 v3                            | 新部署只使用 Helm v3；Tiller 架构仅用于迁移旧 release                                                        |
| 第 12 章   | Windows Server 2019、Docker EE 与旧 Flannel 脚本         | Windows 容器具有严格 OS build/运行时/CNI 兼容矩阵，应按目标 Kubernetes 版本官方支持表部署                    |
| 附录 A     | 以 1.19 的 flags 汇总六类组件配置                         | 每次升级按目标二进制 `--help`、官方弃用指南和版本化 ComponentConfig 迁移；删除未知或已锁定的 feature gate    |

这本书的最大时效风险不在理念，而在“命令和 API 看起来仍然熟悉”。Kubernetes 会长期保留声明式控制、Pod、Service、CRI/CNI/CSI 等思想，但 Beta API、feature gate、镜像地址、组件参数和插件生命周期变化很快。任何生产 YAML 都应先执行服务端 dry-run、schema 校验和版本升级检查。

---

## 六、超出本书的现代技术方向

| 本书主题           | 可继续研究的方向                                                       | 带来的能力                                      | 引入的代价                         |
| ------------------ | ---------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| Ingress            | Kubernetes Gateway API                                                 | 角色分离、可移植路由、HTTP/TCP/TLS 等更丰富模型 | Controller 支持度和迁移成本        |
| iptables/IPVS 网络 | Cilium/eBPF 数据面                                                     | 网络、策略、负载均衡与可观测性整合              | 内核要求、诊断方式和团队学习成本   |
| 手写 YAML/Helm     | Kustomize、GitOps（Argo CD/Flux）                                      | 声明版本化、持续对账、审计和回滚                | 多环境目录、Secret 和变更审批治理  |
| PSP                | Pod Security Admission、Kyverno、Gatekeeper、ValidatingAdmissionPolicy | 从基线安全到组织自定义策略                      | 策略冲突、例外管理和准入可用性风险 |
| GlusterFS/Heketi   | CSI 生态、Ceph Rook、云盘 CSI、Longhorn                                | 解耦驱动、快照、扩容和拓扑感知                  | 存储系统本身仍需专业运维           |
| 手工有状态部署     | Operator Framework、Kubebuilder                                        | 把备份、成员变更、升级等领域知识自动化          | Controller 代码质量决定故障半径    |
| HPA/VPA            | KEDA、事件驱动扩缩容、Cluster Autoscaler                               | 按队列和外部事件扩副本，并联动节点容量          | 指标延迟、冷启动和反馈振荡         |
| 自建组件监控       | kube-prometheus-stack、OpenTelemetry                                   | 标准化指标、告警和跨服务追踪                    | 指标基数、存储和采样成本           |
| 单集群手工运维     | 托管 Kubernetes、多集群管理、Cluster API                               | 降低控制面负担或声明式管理集群生命周期          | 云锁定、网络身份和跨集群一致性     |

这些技术不是“Kubernetes 的替代品”，而是围绕 Kubernetes API 补齐控制、交付、策略和可观测性的生态。若真正需要更轻的编排平台，则应重新评估 Docker Compose、Nomad 或托管容器服务，而不是在一个小应用上堆叠完整 Kubernetes 平台。

---

## 七、全书结论

《Kubernetes 权威指南》第 5 版的价值有两层。第一层是广度：从第一个 Deployment 一直深入 API Server、Scheduler、Linux 网络、CSI、CRD、监控和故障诊断，读者能看到一个 Pod 从声明到运行的完整链路。第二层是设计思想：Label 形成松耦合关系，Service 隔离地址变化，控制器用持续协调代替一次性脚本，CRI/CNI/CSI 用标准接口隔离基础设施实现。

需要带着版本意识阅读：书中目标是 Kubernetes 1.19，PSP、dockershim、GlusterFS/Heketi、旧 Beta API 和部分组件参数已经退出。但它对 Pod/Service 关系、List-Watch、调度、网络模型、PV/PVC 生命周期以及逐层排障的解释依然构成扎实基础。

用最平实的话总结：**Kubernetes 不是一个“帮你运行 Docker 命令”的工具，而是一套让系统不断兑现声明的控制机制。学会它，不是记住最多的 YAML 字段，而是能沿着 API → Controller → Scheduler → kubelet → CRI/CNI/CSI → Service 的链路，解释每一个状态为什么出现，以及下一步该在哪里找证据。**

---

## 八、原书证据与现代核验来源

### 8.1 原书依据

- 龚正、吴治辉、闫健勇：《Kubernetes 权威指南：从 Docker 到 Kubernetes 实践全接触（第 5 版）》，电子工业出版社，2021 年 6 月，ISBN `978-7-121-40998-1`。
- 本文逐页核对的电子版共 1682 个 PDF 页面对象；书签结构为推荐序、前言、第 1～12 章、附录 A 与封底。章节总表和第 3 部分的顺序据此建立。
- 短引文来自 PDF 第 7 页内容简介、第 1 章、第 5 章和第 7 章。代码只保留理解机制所需的短例，并在正文中标明“原书示例整理”或“书外扩展”，未复刻大段正文。
- 未发现可确认且可合法获取的更新版原书，因此第 5 版仍是书籍事实主线；版本更新只采用官方文档作对照，不使用来源不明的新副本。

### 8.2 Kubernetes 官方资料（核验日期：2026-08-08）

- [Kubernetes Releases](https://kubernetes.io/releases/) 与 [`stable.txt`](https://dl.k8s.io/release/stable.txt)：核对当前稳定分支 1.36 与最新补丁 1.36.3。
- [Deprecated API Migration Guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)：核对 Ingress、CRD、PSP 等旧 API 的删除边界。
- [Dockershim Removal FAQ](https://kubernetes.io/blog/2022/02/17/dockershim-faq/)：核对内置 Docker 集成在 1.24 移除及 CRI 迁移方向。
- [Pod Security Admission](https://kubernetes.io/docs/concepts/security/pod-security-admission/) 与 [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)：核对 PSP 之后的内置策略模型。
- [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) 与 [Encrypting Confidential Data at Rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)：核对 Base64、etcd 静态加密和安全实践。
- [Service](https://kubernetes.io/docs/concepts/services-networking/service/)、[EndpointSlice](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)、[Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) 与 [Gateway API](https://gateway-api.sigs.k8s.io/)：核对服务发现和七层入口的现代边界。
- [Cluster Networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/)、[Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)：核对 CNI 与策略实现责任。
- [Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)、[Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) 与 [CSI Volume Cloning/Snapshot 相关文档](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)：核对 in-tree 插件变化和 CSI 语义。
- [Custom Resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)：核对 CRD、聚合 API 与 Controller 的职责边界。
- [Component Tools](https://kubernetes.io/docs/reference/command-line-tools-reference/)：核对附录 A 中各组件 flags 的现代查询入口。
- [Windows containers in Kubernetes](https://kubernetes.io/docs/concepts/windows/) 与 [Schedule GPUs](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/)：核对异构节点与 Device Plugin 边界。
- [kind Quick Start](https://kind.sigs.k8s.io/docs/user/quick-start/)：核对第 4 部分本地实验环境的命令与用途边界。
