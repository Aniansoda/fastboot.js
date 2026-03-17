// @license magnet:?xt=urn:btih:d3d9a9a6595521f9666a5e94cc830dab83b65699&dn=expat.txt MIT

import * as fastboot from "../dist/fastboot.mjs";

// 1. 初始化核心实例
let device = new fastboot.FastbootDevice();
window.device = device; // 挂载到全局方便调试

// 开启调试日志
fastboot.setDebugLevel(2);

/**
 * 终端日志系统
 */
function log(message, type = 'info') {
    const logOutput = document.getElementById('log-output');
    if (!logOutput) return;

    const div = document.createElement('div');
    div.style.marginBottom = "5px";
    div.style.lineHeight = "1.4";
    
    if (type === 'error') div.style.color = "var(--accent-red)";
    else if (type === 'success') div.style.color = "var(--primary-gold)";
    else div.style.color = "#00ff41"; // 极客绿
    
    const time = new Date().toLocaleTimeString();
    div.innerHTML = `<span style="opacity:0.4">[${time}]</span> ${message}`;
    
    logOutput.appendChild(div);
    logOutput.scrollTop = logOutput.scrollHeight;
}

/**
 * 自动同步设备变量信息
 */
async function fetchDeviceInfo() {
    try {
        const product = await device.getVariable("product");
        const serial = await device.getVariable("serialno");
        const cpu = await device.getVariable("cpu");
        const unlocked = await device.getVariable("unlocked");

        // 填充首页卡片
        document.getElementById('info-prod').innerText = product || "未知机型";
        document.getElementById('info-seri').innerText = serial || "未知序列号";
        document.getElementById('info-cpu').innerText = cpu || "未知架构";
        
        const lockEl = document.getElementById('info-lock');
        lockEl.innerText = unlocked === "yes" ? "UNLOCKED" : "LOCKED";
        lockEl.style.color = unlocked === "yes" ? "#00ff41" : "var(--accent-red)";

        // 更新主状态显示
        const statusField = document.getElementById("status-text");
        statusField.textContent = "已就绪 (READY)";
        statusField.style.color = "var(--primary-gold)";

        log(`设备变量同步成功: ${product}`, "success");
    } catch (e) {
        log("变量读取失败: " + e.message, "error");
    }
}

/**
 * 进度条更新逻辑
 */
window.updateProgress = (val) => {
    const wrap = document.getElementById('prog-wrap');
    const bar = document.getElementById('prog-bar');
    if (!wrap || !bar) return;

    wrap.style.display = 'block';
    bar.style.width = val + '%';
    
    if (val >= 100) {
        setTimeout(() => { wrap.style.display = 'none'; bar.style.width = '0%'; }, 1500);
    }
};

/**
 * 核心：免责声明接受逻辑 (修复无法前往下一层的问题)
 */
window.acceptTerms = () => {
    const overlay = document.getElementById('disclaimer-overlay');
    if (overlay) {
        overlay.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        overlay.style.opacity = '0';
        overlay.style.transform = 'scale(1.1) translateY(-20px)';
        
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 600);
        
        if (window.navigator.vibrate) window.navigator.vibrate([10, 30]);
        log("神圣契约已签署，系统权限已解锁。");
    }
};

/**
 * 核心：唤醒设备
 */
async function connectDevice() {
    try {
        log("正在寻找处于虚空(Fastboot)模式的设备...");
        await device.connect();
        await fetchDeviceInfo();
        if (window.navigator.vibrate) window.navigator.vibrate(50);
    } catch (error) {
        log("连接中断: " + error.message, "error");
    }
}

/**
 * 核心：品牌解锁
 */
window.handleUnlock = async (brand) => {
    if (!device.isConnected) return log("请先唤醒设备！", "error");
    log(`发起 ${brand} 强制解锁协议...`);
    try {
        const b = brand.toLowerCase();
        if (b === "xiaomi") await device.runCommand("oem unlock");
        else if (["oneplus", "oppo", "realme", "redmagic", "nubia"].includes(b)) {
            await device.runCommand("flashing unlock");
        } else {
            await device.runCommand("oem unlock");
        }
        log(`${brand} 指令执行完毕`, "success");
    } catch (e) {
        log("指令被拒绝: " + e.message, "error");
    }
};

/**
 * 核心：Shark Root (SELinux Permissive)
 */
async function runSharkRoot() {
    if (!device.isConnected) return log("虚空未连通", "error");
    try {
        log("注入 KernelSU 提权指令...");
        window.updateProgress(40);
        await device.runCommand("oem set-gpu-preemption 0 androidboot.selinux=permissive");
        
        window.updateProgress(80);
        log("指令发送成功，正在执行重启...");
        await device.runCommand("continue");
        
        window.updateProgress(100);
        log("设备已指令重启，请等待开机。", "success");
    } catch (e) {
        window.updateProgress(0);
        log("Root 流程失败: " + e.message, "error");
    }
}

/**
 * 核心：灵魂灌注 (刷写)
 */
async function flashFile() {
    const file = document.getElementById("file-input").files[0];
    const part = document.getElementById("part-input").value;

    if (!file || !part) {
        alert("请选择镜像并输入目标分区");
        return;
    }

    try {
        log(`正在向 ${part} 烧录灵魂镜像...`);
        await device.flashBlob(part, file, (p) => {
            const progress = p * 100;
            window.updateProgress(progress);
            if (Math.round(progress) % 25 === 0) log(`当前同步率: ${progress.toFixed(0)}%`);
        });
        log(`${part} 刷写达成！`, "success");
    } catch (e) {
        window.updateProgress(0);
        log("刷写失败: " + e.message, "error");
    }
}

/**
 * 事件挂载
 */
document.addEventListener('DOMContentLoaded', () => {
    // 首页
    document.getElementById("connect-btn")?.addEventListener("click", connectDevice);
    document.getElementById("root-btn")?.addEventListener("click", runSharkRoot);
    
    // 刷写页
    document.getElementById("flash-btn")?.addEventListener("click", flashFile);

    // USB 状态自动更新
    navigator.usb.addEventListener("disconnect", () => {
        document.getElementById("status-text").innerText = "已消失";
        document.getElementById("status-text").style.color = "var(--accent-red)";
        log("设备已脱离现实连接。", "error");
    });
});

// @license-end
