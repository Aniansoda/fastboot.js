// @license magnet:?xt=urn:btih:d3d9a9a6595521f9666a5e94cc830dab83b65699&dn=expat.txt MIT

import * as fastboot from "../dist/fastboot.mjs";

/**
 * SHARK OS | 单页流式版核心逻辑
 */
let device = new fastboot.FastbootDevice();
window.device = device;

// 开启调试日志
fastboot.setDebugLevel(2);

/**
 * 终端日志输出 (适配 .terminal 容器)
 */
function log(message, type = 'info') {
    const logOutput = document.getElementById('log-output');
    if (!logOutput) return;

    const div = document.createElement('div');
    div.style.marginBottom = "4px";
    
    if (type === 'error') div.style.color = "var(--accent-red)";
    else if (type === 'success') div.style.color = "var(--primary-gold)";
    else div.style.color = "#00ff41"; 
    
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    div.innerHTML = `<span style="opacity:0.4">[${time}]</span> ${message}`;
    
    logOutput.appendChild(div);
    logOutput.scrollTop = logOutput.scrollHeight;
}

/**
 * 自动同步设备变量 (单页版 ID 适配)
 */
async function fetchDeviceInfo() {
    try {
        // 尝试获取所有核心变量
        const product = await device.getVariable("product");
        const serial = await device.getVariable("serialno");
        const cpu = await device.getVariable("cpu");
        const unlocked = await device.getVariable("unlocked");

        // 映射到单页 HTML 的 ID
        const fields = {
            'info-prod': product || "Unknown",
            'info-seri': serial || "Unknown",
            'info-cpu': cpu || "Unknown",
            'info-lock': unlocked === "yes" ? "UNLOCKED" : "LOCKED"
        };

        for (const [id, val] of Object.entries(fields)) {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = val;
                if (id === 'info-lock') {
                    el.style.color = val === "UNLOCKED" ? "#00ff41" : "var(--accent-red)";
                }
            }
        }

        const statusField = document.getElementById("status-text");
        if (statusField) {
            statusField.textContent = "已连接到虚空";
            statusField.style.color = "var(--primary-gold)";
        }

        log(`实体感应成功: ${product}`, "success");
    } catch (e) {
        log("同步变量受阻: " + e.message, "error");
    }
}

/**
 * 进度条控制 (适配 .prog-wrap / .prog-bar)
 */
window.updateProgress = (val) => {
    const wrap = document.getElementById('prog-wrap');
    const bar = document.getElementById('prog-bar');
    if (!wrap || !bar) return;

    wrap.style.display = 'block';
    bar.style.width = val + '%';
    
    if (val >= 100) {
        setTimeout(() => { 
            wrap.style.display = 'none'; 
            bar.style.width = '0%'; 
        }, 1500);
    }
};

/**
 * 核心：唤醒设备 (处理 WebUSB 授权)
 */
async function connectDevice() {
    try {
        log("发起 WebUSB 握手...");
        await device.connect();
        
        // 连接成功后立即拉取数据
        await fetchDeviceInfo();
        
        if (window.navigator.vibrate) window.navigator.vibrate([10, 30]);
    } catch (error) {
        log("唤醒受阻: " + error.message, "error");
    }
}

/**
 * 核心：品牌解锁
 */
window.handleUnlock = async (brand) => {
    if (!device.isConnected) return log("虚空未连通，请先唤醒设备", "error");
    
    log(`正在向 ${brand} 发送解锁契约...`);
    try {
        const b = brand.toLowerCase();
        if (b === "xiaomi") await device.runCommand("oem unlock");
        else if (["oneplus", "oppo", "realme", "redmagic", "nubia"].includes(b)) {
            await device.runCommand("flashing unlock");
        } else {
            await device.runCommand("oem unlock");
        }
        log(`${brand} 契约指令已送达`, "success");
    } catch (e) {
        log("解锁指令被拒绝: " + e.message, "error");
    }
};

/**
 * 核心：Shark Root
 */
async function runSharkRoot() {
    if (!device.isConnected) return log("设备未连接", "error");
    try {
        log("开始注入 KernelSU 宽容指令...");
        window.updateProgress(30);
        
        await device.runCommand("oem set-gpu-preemption 0 androidboot.selinux=permissive");
        
        window.updateProgress(70);
        log("指令生效，正在执行继续引导...");
        
        await device.runCommand("continue");
        
        window.updateProgress(100);
        log("设备已转生重启。", "success");
    } catch (e) {
        window.updateProgress(0);
        log("提权失败: " + e.message, "error");
    }
}

/**
 * 核心：灵魂灌注
 */
async function flashFile() {
    const fileEl = document.getElementById("file-input");
    const partEl = document.getElementById("part-input");
    
    if (!fileEl || !partEl) return;
    
    const file = fileEl.files[0];
    const part = partEl.value.trim();

    if (!file || !part) {
        log("缺失灌注素材或目标分区", "error");
        return;
    }

    try {
        log(`正在向 ${part} 灌注灵魂数据...`);
        window.updateProgress(1);

        await device.flashBlob(part, file, (p) => {
            const progress = p * 100;
            window.updateProgress(progress);
            if (Math.round(progress) % 25 === 0) log(`同步率: ${progress.toFixed(0)}%`);
        });

        window.updateProgress(100);
        log(`${part} 刷写达成！`, "success");
    } catch (e) {
        window.updateProgress(0);
        log("同步中断: " + e.message, "error");
    }
}

/**
 * 事件挂载 (确保单页 DOM 加载后绑定)
 */
document.addEventListener('DOMContentLoaded', () => {
    // 绑定唤醒按钮
    const connectBtn = document.getElementById("connect-btn");
    if (connectBtn) connectBtn.addEventListener("click", connectDevice);

    // 绑定 Root 按钮
    const rootBtn = document.getElementById("root-btn");
    if (rootBtn) rootBtn.addEventListener("click", runSharkRoot);
    
    // 绑定刷写按钮
    const flashBtn = document.getElementById("flash-btn");
    if (flashBtn) flashBtn.addEventListener("click", flashFile);

    // USB 断开监听
    navigator.usb.addEventListener("disconnect", (event) => {
        if (event.device === device.device) {
            const statusField = document.getElementById("status-text");
            if (statusField) {
                statusField.textContent = "连接断开";
                statusField.style.color = "var(--accent-red)";
            }
            log("设备已脱离连接。", "error");
        }
    });

    log("SHARK OS 系统就绪，等待感应...");
});

// @license-end
