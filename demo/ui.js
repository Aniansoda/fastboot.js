// @license magnet:?xt=urn:btih:d3d9a9a6595521f9666a5e94cc830dab83b65699&dn=expat.txt MIT

import * as fastboot from "../dist/fastboot.mjs";

// 初始化设备实例
let device = new fastboot.FastbootDevice();
window.device = device;

// 开启调试日志
fastboot.setDebugLevel(2);

/**
 * 终端日志输出
 */
function terminalLog(message, type = 'info') {
    const logOutput = document.getElementById('log-output');
    if (!logOutput) return;

    const div = document.createElement('div');
    div.style.marginBottom = "5px";
    
    if (type === 'error') div.style.color = "var(--accent-red)";
    else if (type === 'success') div.style.color = "var(--primary-gold)";
    else div.style.color = "#00ff41"; // 极客绿
    
    const time = new Date().toLocaleTimeString();
    div.innerHTML = `<span style="opacity:0.4">[${time}]</span> ${message}`;
    
    logOutput.appendChild(div);
    logOutput.scrollTop = logOutput.scrollHeight;
}

/**
 * 更新进度条 ( window 级函数 )
 */
window.updateProgress = (val) => {
    const wrap = document.getElementById('prog-wrap');
    const bar = document.getElementById('prog-bar');
    if (wrap && bar) {
        wrap.style.display = 'block';
        bar.style.width = val + '%';
        if (val >= 100) {
            setTimeout(() => { wrap.style.display = 'none'; bar.style.width = '0%'; }, 1500);
        }
    }
};

/**
 * --- 核心修复：免责声明接受逻辑 ---
 * 通过 window.acceptTerms 显式暴露给 HTML 里的 onclick
 */
window.acceptTerms = () => {
    const overlay = document.getElementById('disclaimer-overlay');
    if (overlay) {
        // iOS 渐隐与缩放动画
        overlay.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        overlay.style.opacity = '0';
        overlay.style.transform = 'scale(1.1) translateY(-20px)';
        
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 600);
        
        // 触感反馈
        if (window.navigator.vibrate) window.navigator.vibrate([10, 30]);
        terminalLog("契约已生效，SHARK OS 权限已解锁。");
    }
};

/**
 * 自动同步设备信息
 */
async function fetchDeviceInfo() {
    try {
        const prod = await device.getVariable("product");
        const seri = await device.getVariable("serialno");
        const cpu = await device.getVariable("cpu");
        const lock = await device.getVariable("unlocked");

        document.getElementById('info-prod').innerText = prod || "Unknown";
        document.getElementById('info-seri').innerText = seri || "Unknown";
        document.getElementById('info-cpu').innerText = cpu || "Unknown";
        
        const lockEl = document.getElementById('info-lock');
        lockEl.innerText = lock === "yes" ? "UNLOCKED" : "LOCKED";
        lockEl.style.color = lock === "yes" ? "#00ff41" : "var(--accent-red)";

        const statusField = document.getElementById("status-text");
        statusField.textContent = "已连接";
        statusField.style.color = "var(--primary-gold)";

        terminalLog(`实体同步完成: ${prod}`, "success");
    } catch (e) {
        terminalLog("信息读取失败: " + e.message, "error");
    }
}

/**
 * 唤醒设备
 */
async function connectDevice() {
    try {
        terminalLog("正在搜寻虚空中的 USB 信号...");
        await device.connect();
        await fetchDeviceInfo();
    } catch (error) {
        terminalLog(`唤醒失败: ${error.message}`, "error");
    }
}

/**
 * 品牌解锁逻辑
 */
window.handleUnlock = async (brand) => {
    if (!device.isConnected) return terminalLog("设备未连接", "error");
    terminalLog(`执行 ${brand} 解锁协议...`);
    try {
        const b = brand.toLowerCase();
        if (b === "xiaomi") await device.runCommand("oem unlock");
        else if (["oneplus", "oppo", "realme", "redmagic", "nubia"].includes(b)) {
            await device.runCommand("flashing unlock");
        } else {
            await device.runCommand("oem unlock");
        }
        terminalLog(`${brand} 指令发送成功`, "success");
    } catch (e) {
        terminalLog(`拒绝访问: ${e.message}`, "error");
    }
};

/**
 * KernelSU 临时提权
 */
async function runSharkRoot() {
    if (!device.isConnected) return terminalLog("虚空未连通", "error");
    try {
        terminalLog("注入提权指令 (Permissive)...");
        window.updateProgress(40);
        await device.runCommand("oem set-gpu-preemption 0 androidboot.selinux=permissive");
        
        window.updateProgress(80);
        terminalLog("指令成功，强制重启中...");
        await device.runCommand("continue");
        
        window.updateProgress(100);
        terminalLog("流程结束，请等待开机。", "success");
    } catch (e) {
        window.updateProgress(0);
        terminalLog(`Root 失败: ${e.message}`, "error");
    }
}

/**
 * 镜像刷写
 */
async function flashFile() {
    const file = document.getElementById("file-input").files[0];
    const part = document.getElementById("part-input").value;

    if (!file || !part) return alert("请指定分区和镜像文件");

    try {
        terminalLog(`开始向 ${part} 灌注数据...`);
        await device.flashBlob(part, file, (p) => {
            const progress = p * 100;
            window.updateProgress(progress);
            if (Math.round(progress) % 25 === 0) terminalLog(`进度: ${progress.toFixed(0)}%`);
        });
        terminalLog(`${part} 刷写达成！`, "success");
    } catch (e) {
        window.updateProgress(0);
        terminalLog(`烧录中断: ${e.message}`, "error");
    }
}

/**
 * 初始化绑定
 */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("connect-btn")?.addEventListener("click", connectDevice);
    document.getElementById("root-btn")?.addEventListener("click", runSharkRoot);
    document.getElementById("flash-btn")?.addEventListener("click", flashFile);

    navigator.usb.addEventListener("disconnect", () => {
        document.getElementById("status-text").innerText = "已消失";
        document.getElementById("status-text").style.color = "var(--accent-red)";
        terminalLog("USB 连接已断开", "error");
    });
});
