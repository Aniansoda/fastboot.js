// @license magnet:?xt=urn:btih:d3d9a9a6595521f9666a5e94cc830dab83b65699&dn=expat.txt MIT

import * as fastboot from "../dist/fastboot.mjs";

/**
 * SHARK OS | 川上富江二创版 核心逻辑
 */
let device = new fastboot.FastbootDevice();
window.device = device;

// 开启 verbose 级别日志
fastboot.setDebugLevel(2);

/**
 * 终端日志系统：适配液态玻璃容器
 */
function terminalLog(message, type = 'info') {
    const logOutput = document.getElementById('log-output');
    if (!logOutput) return;

    const div = document.createElement('div');
    div.style.padding = "2px 0";
    div.style.borderBottom = "1px solid rgba(255,255,255,0.02)";
    
    // 颜色语义化
    if (type === 'error') div.innerHTML = `<span style="color:var(--accent-red)">[!] ERROR:</span> ${message}`;
    else if (type === 'success') div.innerHTML = `<span style="color:var(--primary-gold)">[+] SUCCESS:</span> ${message}`;
    else div.innerHTML = `<span style="opacity:0.5">> </span>${message}`;
    
    logOutput.appendChild(div);
    logOutput.scrollTop = logOutput.scrollHeight;
}

/**
 * 核心功能：自动抓取并填充设备所有变量
 */
async function syncDeviceVariables() {
    terminalLog("正在同步虚空变量...");
    try {
        const vars = {
            'product': 'info-prod',
            'serialno': 'info-seri',
            'cpu': 'info-cpu',
            'unlocked': 'info-lock'
        };

        for (const [key, id] of Object.entries(vars)) {
            const val = await device.getVariable(key);
            const el = document.getElementById(id);
            if (el) {
                if (key === 'unlocked') {
                    el.innerText = val === "yes" ? "UNLOCKED" : "LOCKED";
                    el.style.color = val === "yes" ? "#00ff41" : "var(--accent-red)";
                } else {
                    el.innerText = val || "UNKNOWN";
                }
            }
        }
        
        // 更新主状态文本
        const statusField = document.getElementById("status-text");
        statusField.textContent = "已就绪 (READY)";
        statusField.style.color = "var(--primary-gold)";
        
        terminalLog("所有实体数据已同步完成", "success");
    } catch (e) {
        terminalLog("变量同步中断: " + e.message, "error");
    }
}

/**
 * 进度条控制：适配 HTML 中的 window.updateProgress
 */
function updateUIProgress(val) {
    if (window.updateProgress) {
        window.updateProgress(val);
    }
}

/**
 * 1. 唤醒设备逻辑
 */
async function connectDevice() {
    try {
        terminalLog("发起 WebUSB 握手请求...");
        await device.connect();
        await syncDeviceVariables();
        
        // 增加震动反馈
        if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    } catch (error) {
        terminalLog(`唤醒失败: ${error.message}`, 'error');
    }
}

/**
 * 2. 品牌解锁契约
 */
window.handleUnlock = async (brand) => {
    if (!device.isConnected) return terminalLog("虚空未连通，无法执行契约", "error");
    
    terminalLog(`正在向 ${brand} 发送引导加载程序解锁指令...`);
    try {
        const b = brand.toLowerCase();
        // 适配更多机型指令
        if (b === "xiaomi") await device.runCommand("oem unlock");
        else if (["oneplus", "oppo", "realme", "redmagic", "nubia"].includes(b)) {
            await device.runCommand("flashing unlock");
        } else if (b === "samsung") {
            terminalLog("三星设备请在 Download 模式下操作，Fastboot 仅支持通用命令", "error");
            await device.runCommand("oem unlock");
        } else {
            await device.runCommand("flashing unlock");
        }
        terminalLog(`${brand} 指令已接受`, 'success');
    } catch (error) {
        terminalLog(`指令被拒绝: ${error.message}`, 'error');
    }
};

/**
 * 3. 鲨鱼 KernelSU 核心注入逻辑
 */
async function runSharkRoot() {
    if (!device.isConnected) return terminalLog("设备未连接", "error");
    
    try {
        terminalLog("开始注入提权协议 (SELinux Permissive)...");
        updateUIProgress(30);
        
        // 执行脚本核心 OEM 命令
        await device.runCommand("oem set-gpu-preemption 0 androidboot.selinux=permissive");
        
        updateUIProgress(70);
        terminalLog("注入成功，正在强制重启至系统...");
        
        await device.runCommand("continue");
        
        updateUIProgress(100);
        terminalLog("转生仪式完成，请等待手机重启。", "success");
    } catch (error) {
        updateUIProgress(0);
        terminalLog(`注入失败: ${error.message}`, 'error');
    }
}

/**
 * 4. 灵魂灌注 (Flash Blob)
 */
async function flashFile() {
    const fileField = document.getElementById("file-input");
    const partField = document.getElementById("part-input");
    const file = fileField.files[0];
    const partition = partField.value;

    if (!file || !partition) return terminalLog("素材或载体(分区)缺失", "error");

    try {
        terminalLog(`正在向 ${partition} 灌注灵魂...`);
        updateUIProgress(1);

        await device.flashBlob(partition, file, (progress) => {
            const p = progress * 100;
            updateUIProgress(p); // 同步到液态进度条
            if (Math.round(p) % 20 === 0) {
                terminalLog(`同步中... ${p.toFixed(1)}%`);
            }
        });

        updateUIProgress(100);
        terminalLog(`${partition} 分区灵魂灌注成功`, "success");
    } catch (error) {
        updateUIProgress(0);
        terminalLog(`灌注失败: ${error.message}`, 'error');
    }
}

/**
 * 初始化绑定
 */
document.addEventListener('DOMContentLoaded', () => {
    // 首页按钮
    document.getElementById("connect-btn")?.addEventListener("click", connectDevice);
    document.getElementById("root-btn")?.addEventListener("click", runSharkRoot);
    
    // 刷写按钮
    document.getElementById("flash-btn")?.addEventListener("click", flashFile);
    
    // USB 自动状态监听
    navigator.usb.addEventListener("disconnect", () => {
        const statusField = document.getElementById("status-text");
        statusField.textContent = "未连接";
        statusField.style.color = "var(--accent-red)";
        
        // 重置信息格
        ['info-prod', 'info-seri', 'info-cpu', 'info-lock'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = "None";
        });
        
        terminalLog("连接已断开", "error");
    });
});

// @license-end
