(function() {
    'use strict';
    
    // 防止重复创建
    if (document.getElementById('yxt-control-panel')) {
        console.log('⚠️ 控制面板已存在');
        return;
    }
    
    // ==================== 默认配置 ====================
    const DEFAULT_CONFIG = {
        interval: {
            base: 20,
            min: 15,
            max: 45,
            randomRange: 3
        },
        submitTime: {
            base: 120,
            min: 60,
            max: 180,
            randomRange: 5
        },
        speed: {
            min: 5,
            max: 16,
            current: 8
        },
        adjust: {
            successDecrease: 2,
            failIncrease: 5,
            consecutiveFailLimit: 3
        }
    };
    
    // 当前配置
    let currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    
    // 运行状态
    let isRunning = false;
    let currentInterval = currentConfig.interval.base;
    let consecutiveFails = 0;
    let submitCount = 0;
    let autoSubmitTimer = null;
    let isPanelCollapsed = false;
    let commentObserver = null;
    let isCommentAutoFillEnabled = true;
    
    // ==================== 样式 ====================
    const styles = `
        #yxt-control-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 280px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.5), 0 0 15px rgba(0,150,255,0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #fff;
            z-index: 999999;
            border: 1px solid rgba(255,255,255,0.1);
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        #yxt-control-panel.collapsed {
            width: 160px;
        }
        
        #yxt-control-panel.collapsed .panel-content {
            display: none;
        }
        
        #yxt-control-panel.dragging {
            opacity: 0.8;
            cursor: grabbing;
        }
        
        #yxt-control-panel .panel-header {
            cursor: grab;
        }
        
        #yxt-control-panel.dragging .panel-header {
            cursor: grabbing;
        }
        
        #yxt-control-panel .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            background: rgba(0,0,0,0.2);
            cursor: pointer;
            user-select: none;
        }
        
        #yxt-control-panel .panel-header:hover {
            background: rgba(0,0,0,0.3);
        }
        
        #yxt-control-panel .panel-title {
            font-size: 16px;
            font-weight: 600;
            background: linear-gradient(90deg, #00d4ff, #7b2cbf);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        #yxt-control-panel .header-actions {
            display: flex;
            gap: 8px;
        }
        
        #yxt-control-panel .panel-toggle,
        #yxt-control-panel .panel-close {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
            border: none;
            color: #fff;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        #yxt-control-panel .panel-toggle:hover {
            background: rgba(0,212,255,0.3);
        }
        
        #yxt-control-panel .panel-close:hover {
            background: rgba(255,0,0,0.5);
            transform: rotate(90deg);
        }
        
        #yxt-control-panel .panel-content {
            padding: 12px;
        }
        
        #yxt-control-panel .control-group {
            margin-bottom: 10px;
            padding: 8px 10px;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
        }
        
        #yxt-control-panel .control-label {
            font-size: 12px;
            color: #8892b0;
            margin-bottom: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        #yxt-control-panel .control-value {
            color: #00d4ff;
            font-weight: 600;
            font-size: 14px;
        }
        
        #yxt-control-panel .slider-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        #yxt-control-panel input[type="range"] {
            flex: 1;
            height: 6px;
            -webkit-appearance: none;
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
            outline: none;
        }
        
        #yxt-control-panel input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            background: linear-gradient(135deg, #00d4ff, #7b2cbf);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(0,212,255,0.5);
            transition: transform 0.2s;
        }
        
        #yxt-control-panel input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
        }
        
        #yxt-control-panel input[type="number"] {
            width: 60px;
            padding: 6px 8px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            color: #fff;
            font-size: 13px;
            text-align: center;
        }
        
        #yxt-control-panel input[type="number"]:focus {
            outline: none;
            border-color: #00d4ff;
            box-shadow: 0 0 8px rgba(0,212,255,0.3);
        }
        
        #yxt-control-panel .button-group {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        
        #yxt-control-panel .btn {
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        #yxt-control-panel .btn-start {
            background: linear-gradient(135deg, #00d4ff, #7b2cbf);
            color: #fff;
        }
        
        #yxt-control-panel .btn-start:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(0,212,255,0.4);
        }
        
        #yxt-control-panel .btn-stop {
            background: linear-gradient(135deg, #ff416c, #ff4b2b);
            color: #fff;
        }
        
        #yxt-control-panel .btn-stop:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(255,65,108,0.4);
        }
        
        #yxt-control-panel .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
        
        #yxt-control-panel .status-bar {
            margin-top: 10px;
            padding: 8px 10px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            font-size: 11px;
        }
        
        #yxt-control-panel .status-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
        }
        
        #yxt-control-panel .status-item:last-child {
            margin-bottom: 0;
        }
        
        #yxt-control-panel .status-label {
            color: #8892b0;
        }
        
        #yxt-control-panel .status-value {
            color: #00d4ff;
            font-weight: 600;
        }
        
        #yxt-control-panel .status-value.running {
            color: #00ff88;
        }
        
        #yxt-control-panel .status-value.stopped {
            color: #ff416c;
        }
        
        #yxt-control-panel .quick-actions {
            display: flex;
            gap: 8px;
            margin-bottom: 15px;
        }
        
        #yxt-control-panel .quick-btn {
            flex: 1;
            padding: 8px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            color: #8892b0;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        #yxt-control-panel .quick-btn:hover {
            background: rgba(0,212,255,0.2);
            border-color: #00d4ff;
            color: #fff;
        }
        
        #yxt-control-panel .log-area {
            margin-top: 10px;
            padding: 8px 10px;
            background: rgba(0,0,0,0.4);
            border-radius: 6px;
            max-height: 160px;
            overflow-y: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 10px;
            line-height: 1.4;
        }
        
        #yxt-control-panel .log-entry {
            margin-bottom: 4px;
            padding: 2px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        #yxt-control-panel .log-entry.success {
            color: #00ff88;
        }
        
        #yxt-control-panel .log-entry.error {
            color: #ff416c;
        }
        
        #yxt-control-panel .log-entry.info {
            color: #00d4ff;
        }
        
        #yxt-control-panel .param-hint {
            font-size: 10px;
            color: #64748b;
            margin-top: 4px;
            text-align: right;
        }
        
        /* 开关样式 */
        #yxt-control-panel .switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        }
        
        #yxt-control-panel .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        #yxt-control-panel .switch-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255,255,255,0.2);
            transition: .3s;
            border-radius: 24px;
        }
        
        #yxt-control-panel .switch-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }
        
        #yxt-control-panel .switch input:checked + .switch-slider {
            background: linear-gradient(135deg, #00d4ff, #7b2cbf);
        }
        
        #yxt-control-panel .switch input:checked + .switch-slider:before {
            transform: translateX(20px);
        }
    `;
    
    // 添加样式
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    // ==================== 创建面板 HTML ====================
    const panel = document.createElement('div');
    panel.id = 'yxt-control-panel';
    panel.innerHTML = `
        <div class="panel-header" onclick="window.yxtTogglePanel()">
            <span class="panel-title" id="panel-title">🚀 云学堂自动完成</span>
            <div class="header-actions" onclick="event.stopPropagation()">
                <button class="panel-toggle" id="panel-toggle" onclick="window.yxtTogglePanel()" title="收起/展开">−</button>
                <button class="panel-close" onclick="document.getElementById('yxt-control-panel').remove()" title="关闭">×</button>
            </div>
        </div>
        
        <div class="panel-content" id="panel-content">
            <div class="quick-actions">
                <button class="quick-btn" onclick="window.yxtResetConfig()">重置默认</button>
                <button class="quick-btn" onclick="window.yxtCheckStatus()">查看状态</button>
                <button class="quick-btn" onclick="window.yxtTestOnce()">单次测试</button>
            </div>
            
            <div class="control-group">
                <div class="control-label">
                    <span>💬 自动评论</span>
                    <label class="switch">
                        <input type="checkbox" id="comment-toggle" checked onchange="window.yxtToggleComment(this.checked)">
                        <span class="switch-slider"></span>
                    </label>
                </div>
                <div class="param-hint">课程完成后自动填写评论并提交</div>
            </div>
            
            <div class="control-group">
                <div class="control-label">
                    <span>⏱️ 提交间隔 (秒)</span>
                    <span class="control-value" id="val-interval">20</span>
                </div>
                <div class="slider-container">
                    <input type="range" id="slider-interval" min="15" max="45" value="20" 
                           oninput="window.yxtUpdateConfig('interval', this.value)">
                    <input type="number" id="input-interval" value="20" min="15" max="45"
                           onchange="window.yxtUpdateConfig('interval', this.value)">
                </div>
                <div class="param-hint">修改后立即生效，下次提交使用新间隔</div>
            </div>
            
            <div class="control-group">
                <div class="control-label">
                    <span>📊 提交时间 (秒)</span>
                    <span class="control-value" id="val-submitTime">120</span>
                </div>
                <div class="slider-container">
                    <input type="range" id="slider-submitTime" min="60" max="180" value="120"
                           oninput="window.yxtUpdateConfig('submitTime', this.value)">
                    <input type="number" id="input-submitTime" value="120" min="60" max="180"
                           onchange="window.yxtUpdateConfig('submitTime', this.value)">
                </div>
                <div class="param-hint">修改后立即生效，下次提交使用新时间</div>
            </div>
            
            <div class="button-group">
                <button class="btn btn-start" id="btn-start" onclick="window.yxtStart()">开始</button>
                <button class="btn btn-stop" id="btn-stop" onclick="window.yxtStop()" disabled>停止</button>
            </div>
            
            <div class="status-bar">
                <div class="status-item">
                    <span class="status-label">运行状态:</span>
                    <span class="status-value stopped" id="status-running">已停止</span>
                </div>
                <div class="status-item">
                    <span class="status-label">当前进度:</span>
                    <span class="status-value" id="status-progress">--</span>
                </div>
                <div class="status-item">
                    <span class="status-label">提交次数:</span>
                    <span class="status-value" id="status-count">0</span>
                </div>
                <div class="status-item">
                    <span class="status-label">预估剩余:</span>
                    <span class="status-value" id="status-eta">--</span>
                </div>
                <div class="status-item">
                    <span class="status-label">下次提交:</span>
                    <span class="status-value" id="status-next">--</span>
                </div>
            </div>
            
            <div class="log-area" id="log-area">
                <div class="log-entry info">控制面板已加载，点击"开始"运行</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // ==================== 日志函数 ====================
    function addLog(message, type = 'info') {
        const logArea = document.getElementById('log-area');
        if (!logArea) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logArea.appendChild(entry);
        logArea.scrollTop = logArea.scrollHeight;
        
        // 限制日志数量
        while (logArea.children.length > 20) {
            logArea.removeChild(logArea.firstChild);
        }
    }
    
    // ==================== 折叠/展开面板 ====================
    window.yxtTogglePanel = function() {
        const panel = document.getElementById('yxt-control-panel');
        const toggleBtn = document.getElementById('panel-toggle');
        const titleEl = document.getElementById('panel-title');
        
        isPanelCollapsed = !isPanelCollapsed;
        
        if (isPanelCollapsed) {
            panel.classList.add('collapsed');
            toggleBtn.textContent = '+';
            toggleBtn.title = '展开';
            // 收起时换行显示
            titleEl.innerHTML = '🚀 云学堂<br>🚀 自动完成';
        } else {
            panel.classList.remove('collapsed');
            toggleBtn.textContent = '−';
            toggleBtn.title = '收起';
            // 展开时不换行
            titleEl.textContent = '🚀 云学堂自动完成';
        }
    };
    
    // ==================== 拖动功能 ====================
    (function setupDrag() {
        const panel = document.getElementById('yxt-control-panel');
        const header = panel.querySelector('.panel-header');
        
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', function(e) {
            // 如果点击的是按钮，不启动拖动
            if (e.target.closest('.header-actions')) return;
            
            isDragging = true;
            panel.classList.add('dragging');
            
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = panel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newLeft = startLeft + dx;
            let newTop = startTop + dy;
            
            // 限制在窗口内
            const maxLeft = window.innerWidth - panel.offsetWidth;
            const maxTop = window.innerHeight - panel.offsetHeight;
            
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));
            
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
            panel.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                panel.classList.remove('dragging');
            }
        });
    })();
    
    // ==================== 更新配置 ====================
    window.yxtUpdateConfig = function(key, value) {
        value = parseInt(value);
        
        switch(key) {
            case 'interval':
                currentConfig.interval.base = value;
                currentInterval = value; // 立即更新当前间隔
                document.getElementById('slider-interval').value = value;
                document.getElementById('input-interval').value = value;
                document.getElementById('val-interval').textContent = value;
                addLog(`✏️ 提交间隔已修改为 ${value} 秒，下次提交生效`, 'info');
                break;
            case 'submitTime':
                currentConfig.submitTime.base = value;
                document.getElementById('slider-submitTime').value = value;
                document.getElementById('input-submitTime').value = value;
                document.getElementById('val-submitTime').textContent = value;
                addLog(`✏️ 提交时间已修改为 ${value} 秒，下次提交生效`, 'info');
                break;

        }
    };
    
    // ==================== 重置配置 ====================
    window.yxtResetConfig = function() {
        currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        currentInterval = DEFAULT_CONFIG.interval.base;
        
        document.getElementById('slider-interval').value = DEFAULT_CONFIG.interval.base;
        document.getElementById('input-interval').value = DEFAULT_CONFIG.interval.base;
        document.getElementById('val-interval').textContent = DEFAULT_CONFIG.interval.base;
        
        document.getElementById('slider-submitTime').value = DEFAULT_CONFIG.submitTime.base;
        document.getElementById('input-submitTime').value = DEFAULT_CONFIG.submitTime.base;
        document.getElementById('val-submitTime').textContent = DEFAULT_CONFIG.submitTime.base;
        

        
        addLog('🔄 已重置为默认配置，下次提交生效', 'info');
    };
    
    // ==================== 获取 Player ====================
    function getPlayer() {
        const countdownEl = document.querySelector('.yxtulcdsdk-course-player__countdown');
        if (countdownEl) {
            const getVue = (n) => { 
                while (n) { 
                    if (n.__vue__) return n.__vue__; 
                    n = n.parentElement; 
                } 
            };
            const vueInstance = getVue(countdownEl);
            if (vueInstance && vueInstance.$parent) {
                return vueInstance.$parent;
            }
        }
        return null;
    }
    
    // ==================== 生成 UUID ====================
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // ==================== 计算预估完成时间 ====================
    function calculateETA(currentProgress) {
        if (currentProgress >= 100) return '已完成';
        if (!isRunning) return '--';
        
        const remainingProgress = 100 - currentProgress;
        
        // 假设每次提交增加1%进度（偶尔2%）
        // 平均每次增加约1.1%，保守估计按1%计算
        const avgProgressPerSubmit = 1;
        const estimatedSubmits = Math.ceil(remainingProgress / avgProgressPerSubmit);
        
        // 计算平均间隔时间（包含随机波动）
        const avgInterval = currentConfig.interval.base;
        const randomFactor = currentConfig.interval.randomRange * 0.5; // 随机波动的平均值
        const totalSeconds = estimatedSubmits * (avgInterval + randomFactor);
        
        // 转换为可读格式
        if (totalSeconds < 60) {
            return `${Math.ceil(totalSeconds)}秒`;
        } else if (totalSeconds < 3600) {
            return `${Math.ceil(totalSeconds / 60)}分钟`;
        } else {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.ceil((totalSeconds % 3600) / 60);
            return `${hours}小时${minutes}分`;
        }
    }
    
    // ==================== 更新状态显示 ====================
    function updateStatus() {
        const player = getPlayer();
        const progress = player?.kngDetail?.schedule || 0;
        
        document.getElementById('status-progress').textContent = progress + '%';
        document.getElementById('status-count').textContent = submitCount;
        document.getElementById('status-eta').textContent = calculateETA(progress);
        
        const statusEl = document.getElementById('status-running');
        if (isRunning) {
            statusEl.textContent = '运行中';
            statusEl.className = 'status-value running';
        } else {
            statusEl.textContent = '已停止';
            statusEl.className = 'status-value stopped';
        }
    }
    
    // ==================== 提交函数 ====================
    async function doSubmit() {
        const player = getPlayer();
        if (!player) {
            addLog('未找到 Player 组件', 'error');
            return false;
        }
        
        const trackId = generateUUID();
        
        // 更新 trackId
        if (player.kngDetail) {
            player.kngDetail.lastTrackId = trackId;
        }
        
        // 准备参数 - 使用当前配置（实时生效）
        const acqSecond = currentConfig.submitTime.base + 
                         Math.floor(Math.random() * currentConfig.interval.randomRange * 2) - 
                         currentConfig.interval.randomRange;
        
        // 倍率固定为8
        const speed = 8;
        
        // 更新播放器状态
        if (player.unsavedTime !== undefined) {
            player.unsavedTime = acqSecond;
        }
        if (player.countdown !== undefined) {
            player.countdown = 0;
        }
        if (player.rate !== undefined) {
            player.rate = speed;
        }
        if (player.kngDetail) {
            player.kngDetail.timeCompleteFlag = 0;
            player.kngDetail.contentCompleteFlag = 1;
        }
        
        const currentProgress = player.kngDetail?.schedule || 0;
        addLog(`提交 #${submitCount + 1}: ${currentProgress}% | ${acqSecond}秒 | ${speed}x`, 'info');
        
        // 调用原生提交
        try {
            if (typeof player.submitStudyTime === 'function') {
                player.submitStudyTime(true);
                
                // 等待响应
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const newProgress = player.kngDetail?.schedule || currentProgress;
                const increase = newProgress - currentProgress;
                
                if (increase > 0) {
                    addLog(`成功! +${increase}% (${currentProgress}% → ${newProgress}%)`, 'success');
                    consecutiveFails = 0;
                    return true;
                } else {
                    addLog('提交成功但进度未增加', 'error');
                    consecutiveFails++;
                    return false;
                }
            } else {
                addLog('submitStudyTime 方法不存在', 'error');
                return false;
            }
        } catch (error) {
            addLog(`提交失败: ${error.message}`, 'error');
            consecutiveFails++;
            return false;
        }
    }
    
    // ==================== 自动提交循环 ====================
    async function autoSubmitLoop() {
        while (isRunning) {
            const player = getPlayer();
            const currentProgress = player?.kngDetail?.schedule || 0;
            
            // 检查是否完成
            if (currentProgress >= 100) {
                addLog('🎉 课程已完成!', 'success');
                window.yxtStop();
                // 尝试自动填写评论
                setTimeout(() => {
                    autoFillComment();
                }, 2000);
                break;
            }
            
            // 检查连续失败
            if (consecutiveFails >= currentConfig.adjust.consecutiveFailLimit) {
                addLog(`连续失败 ${consecutiveFails} 次，自动停止`, 'error');
                window.yxtStop();
                break;
            }
            
            submitCount++;
            
            // 执行提交
            const success = await doSubmit();
            
            // 更新状态
            updateStatus();
            
            // 计算等待时间 - 使用当前实时配置
            let waitTime = currentInterval;
            if (success) {
                waitTime = Math.max(currentConfig.interval.min, 
                                   waitTime - currentConfig.adjust.successDecrease);
            } else {
                waitTime = Math.min(currentConfig.interval.max, 
                                   waitTime + currentConfig.adjust.failIncrease);
            }
            
            // 添加随机波动
            waitTime += Math.floor(Math.random() * currentConfig.interval.randomRange * 2) - 
                       currentConfig.interval.randomRange;
            
            // 更新下次提交时间显示
            const nextTime = new Date(Date.now() + waitTime * 1000);
            document.getElementById('status-next').textContent = 
                nextTime.toLocaleTimeString('zh-CN', { hour12: false });
            
            // 更新预估时间
            const currentPlayer = getPlayer();
            const currentProgressForETA = currentPlayer?.kngDetail?.schedule || 0;
            document.getElementById('status-eta').textContent = calculateETA(currentProgressForETA);
            
            addLog(`等待 ${waitTime} 秒后继续...`, 'info');
            
            // 等待
            await new Promise(resolve => {
                autoSubmitTimer = setTimeout(resolve, waitTime * 1000);
            });
        }
    }
    
    // ==================== 控制函数 ====================
    window.yxtStart = function() {
        if (isRunning) {
            addLog('已经在运行中', 'error');
            return;
        }
        
        const player = getPlayer();
        if (!player) {
            addLog('未找到 Player 组件，请确保在课程播放页面', 'error');
            return;
        }
        
        isRunning = true;
        submitCount = 0;
        consecutiveFails = 0;
        
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-stop').disabled = false;
        
        addLog('🚀 自动提交已启动', 'success');
        addLog(`当前配置: 间隔${currentConfig.interval.base}秒 | 时间${currentConfig.submitTime.base}秒 | 倍率8x`, 'info');
        updateStatus();
        
        autoSubmitLoop();
    };
    
    window.yxtStop = function() {
        isRunning = false;
        
        if (autoSubmitTimer) {
            clearTimeout(autoSubmitTimer);
            autoSubmitTimer = null;
        }
        
        document.getElementById('btn-start').disabled = false;
        document.getElementById('btn-stop').disabled = true;
        document.getElementById('status-next').textContent = '--';
        
        addLog('🛑 自动提交已停止', 'info');
        updateStatus();
    };
    
    window.yxtCheckStatus = function() {
        const player = getPlayer();
        if (!player) {
            addLog('未找到 Player 组件', 'error');
            return;
        }
        
        const kngDetail = player.kngDetail || {};
        addLog(`进度: ${kngDetail.schedule || 0}% | 已学: ${kngDetail.acqHours || 0}秒`, 'info');
        addLog(`当前配置: 间隔${currentConfig.interval.base}秒 | 时间${currentConfig.submitTime.base}秒 | 倍率8x`, 'info');
        updateStatus();
    };
    
    window.yxtTestOnce = async function() {
        const player = getPlayer();
        if (!player) {
            addLog('未找到 Player 组件', 'error');
            return;
        }
        
        addLog('执行单次测试提交...', 'info');
        addLog(`使用配置: 间隔${currentConfig.interval.base}秒 | 时间${currentConfig.submitTime.base}秒 | 倍率8x`, 'info');
        submitCount++;
        await doSubmit();
        updateStatus();
    };
    
    // ==================== 自动评论功能 ====================
    function autoFillComment() {
        if (!isCommentAutoFillEnabled) {
            addLog('自动评论已禁用，跳过', 'info');
            return;
        }
        
        // 查找评论弹窗
        const modal = document.querySelector('.el-dialog__wrapper');
        if (!modal) return;
        
        // 检查是否是课程评论弹窗
        const title = modal.querySelector('.el-dialog__title');
        if (!title || !title.textContent.includes('课程评论')) return;
        
        addLog('检测到课程评论弹窗，开始自动填写...', 'info');
        
        // 1. 填写评论内容
        const textarea = modal.querySelector('textarea.el-textarea__inner');
        if (textarea) {
            textarea.value = '已学习';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            addLog('✅ 已填写评论内容', 'success');
        }
        
        // 2. 点击第5颗星（评5分）
        const stars = modal.querySelectorAll('.el-rate__item .el-rate__icon');
        if (stars.length >= 5) {
            // 点击第5颗星
            stars[4].click();
            addLog('✅ 已选择5星评分', 'success');
        }
        
        // 3. 点击发表按钮
        setTimeout(() => {
            const submitBtn = modal.querySelector('.el-button--primary');
            if (submitBtn && submitBtn.textContent.includes('发表')) {
                submitBtn.click();
                addLog('✅ 已点击发表按钮', 'success');
            }
        }, 500);
    }
    
    // 启动评论弹窗监听
    function startCommentObserver() {
        if (commentObserver) return;
        
        commentObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // 检查是否有弹窗出现
                    const modal = document.querySelector('.el-dialog__wrapper');
                    if (modal) {
                        const title = modal.querySelector('.el-dialog__title');
                        if (title && title.textContent.includes('课程评论')) {
                            // 延迟一点确保弹窗完全渲染
                            setTimeout(autoFillComment, 800);
                        }
                    }
                }
            }
        });
        
        commentObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        addLog('💬 自动评论监听已启动', 'info');
    }
    
    // 停止评论弹窗监听
    function stopCommentObserver() {
        if (commentObserver) {
            commentObserver.disconnect();
            commentObserver = null;
            addLog('💬 自动评论监听已停止', 'info');
        }
    }
    
    // 切换自动评论开关
    window.yxtToggleComment = function(enabled) {
        isCommentAutoFillEnabled = enabled;
        if (enabled) {
            startCommentObserver();
            addLog('💬 自动评论已启用', 'success');
        } else {
            stopCommentObserver();
            addLog('💬 自动评论已禁用', 'info');
        }
    };
    
    // 手动触发评论填写
    window.yxtFillCommentNow = function() {
        autoFillComment();
    };
    
    // 初始化状态
    updateStatus();
    
    // 初始化配置显示
    document.getElementById('slider-interval').value = DEFAULT_CONFIG.interval.base;
    document.getElementById('input-interval').value = DEFAULT_CONFIG.interval.base;
    document.getElementById('val-interval').textContent = DEFAULT_CONFIG.interval.base;
    
    document.getElementById('slider-submitTime').value = DEFAULT_CONFIG.submitTime.base;
    document.getElementById('input-submitTime').value = DEFAULT_CONFIG.submitTime.base;
    document.getElementById('val-submitTime').textContent = DEFAULT_CONFIG.submitTime.base;
    
    // 启动评论监听
    startCommentObserver();
    
    console.log('✅ 云学堂控制面板已加载'); 
})();
