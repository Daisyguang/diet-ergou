# 部署指南（参考 Tennis Diary，适配统一数据库）

> 目标：手机端 H5 与电脑端后台使用同一份数据。

## 一、部署模式说明

本项目和 `tennis diary` 一样可以做静态页面部署，但因为你要“统一数据库”，需要 **前后端分离部署**：

1. 前端（H5 + 管理页）
- 可部署在 Cloudflare Pages（静态资源）。

2. 后端（API + SQLite）
- 需部署在可运行 Node 的环境（本地常开机/云主机）。
- 负责统一数据读写：`/api/*`、`/api/snapshot`。

---

## 二、部署前检查

- [ ] 前端资源全部使用相对路径。
- [ ] 后端可本地启动并监听 3000 端口。
- [ ] `data/` 目录具备写入权限。
- [ ] 前端 `common.js` 已启用 API 优先能力。
- [ ] 手机和服务端网络可连通。

---

## 三、方案 A（推荐）局域网统一部署

适合个人长期使用，成本低。

### 1) 启动后端服务（电脑）
```powershell
cd D:\github\50！\diet-h5\backend
npm install
npm start
```

### 2) 获取电脑局域网 IP
```powershell
ipconfig
```
找到 `IPv4`，如 `192.168.1.23`。

### 3) 手机访问
- `http://192.168.1.23:3000`

### 4) 防火墙
- 放行 3000 入站端口（Node 或端口规则）。

### 5) 验证
1. 手机新增记录。
2. 电脑后台页刷新可见同数据。
3. 电脑编辑后手机刷新可见。

---

## 四、方案 B：Cloudflare Pages + 后端服务

适合外网访问。

### 1) 前端部署到 Cloudflare Pages
参考 `tennis diary` 流程：
- Build command：留空（静态）
- Output directory：`/frontend`

### 2) 后端部署到 Node 运行环境
可选：Render / Railway / VPS。

后端启动命令：
```bash
cd backend
npm install
npm start
```

### 3) 配置前端 API 地址
首次打开前端页面后，设置 `diet_api_base` 到后端地址：
- 例如：`https://your-api.example.com`

（当前代码支持保存该地址并优先走 API。）

### 4) 注意
- Cloudflare Pages 只托管静态页，不托管 SQLite 写入逻辑。
- SQLite 在云环境建议绑定持久磁盘；否则重启可能丢失数据。

---

## 五、数据目录与备份

- DB：`data/app.db`
- 上传图：`data/uploads`
- 汇总图：`data/summaries`

备份建议：
1. 每日打包 `data/` 目录。
2. 至少保留最近 7 份。

---

## 六、验收清单

- [ ] H5 三个 Tab 正常切换。
- [ ] 每餐最多 3 图校验生效。
- [ ] 体重最后一条参与掉秤。
- [ ] 昨日无体重显示 `--` + 随机文案。
- [ ] 手机端新增数据，电脑端可见。
- [ ] 后台编辑数据，手机端可见。
- [ ] CSV 导出可下载。

---

## 七、常见问题

1. `file://` 打开页面为什么不同步？
- `file://` 没有同源 API，走的是本地存储。
- 统一数据库必须从 `http://...` 地址访问。

2. 手机打不开电脑地址？
- 检查是否同 Wi-Fi、电脑防火墙、IP 是否变化。

3. 页面更新不生效？
- 硬刷新：`Ctrl + Shift + R`。
