# 统一数据库实施方案（手机+电脑共用）

## 目标
让手机端 H5 与电脑端后台使用同一份数据库数据（SQLite），实现实时同步查看。

## 当前状态
- 目前 H5/后台预览版主要读写 `localStorage`（设备隔离）。
- 已有后端 `backend/src/server.js` + SQLite 结构，可作为统一数据源。

## 实施路径（两步）

### 第一步：服务统一（先可用）
1. 在一台常开设备（你的电脑/小主机）启动后端服务。
2. 后端使用 `data/app.db` 作为唯一数据源。
3. 手机与电脑都访问同一地址：`http://<局域网IP>:3000`。

结果：两端访问同一服务，天然共享同一数据库。

### 第二步：前端数据源切换（必须做）
把前端的读写从 `localStorage` 切到 API：
- `GET /api/day/:date`
- `PUT /api/daily/:date`
- `PUT /api/meals/:date/:mealType`
- `POST /api/meals/:date/:mealType/images`
- `DELETE /api/meals/images/:imageId`
- `POST /api/weights/:date`
- `GET /api/history`
- `GET/PUT /api/settings`
- `POST /api/summary/:date`

结果：手机与电脑看到完全一致的数据。

## 部署与网络要求
1. 服务设备与手机在同一 Wi-Fi。
2. 放行 3000 端口（Windows 防火墙入站规则）。
3. 使用固定局域网 IP 或路由器 DHCP 保留地址。

## 数据目录
- 数据库：`D:\github\50！\diet-h5\data\app.db`
- 上传图：`D:\github\50！\diet-h5\data\uploads`
- 汇总图：`D:\github\50！\diet-h5\data\summaries`

## 备份策略（建议）
1. 每日定时备份 `data/` 整目录。
2. 重要备份至少保留最近 7 天。

## 风险与对策
1. 设备关机导致不可访问：使用常开设备。
2. IP变化导致手机访问失败：固定 IP。
3. 网络抖动：前端增加失败提示与重试。

## 验收标准
1. 手机新增记录后，电脑后台刷新可见。
2. 电脑后台编辑后，手机历史页刷新可见。
3. 体重最后一条规则在两端一致。
4. 汇总图在两端显示同一版本。
