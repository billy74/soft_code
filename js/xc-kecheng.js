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
            base: 15,       // 接近服务端~45s冷却窗口，提高每次命中率
            min: 12,
            max: 25,
            randomRange: 2
        },
        submitTime: {
            base: 50,      // 稳超40秒上限，确保每次有效提交都打满
            min: 45,
            max: 60,
            randomRange: 3
        },
        speed: {
            min: 5,
            max: 16,
            current: 8
        },
        adjust: {
            successDecrease: 1,
            failIncrease: 3,
            consecutiveFailLimit: 5
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
        
        #yxt-control-panel .log-area {
            margin-top: 10px;
            padding: 6px 8px;
            background: rgba(0,0,0,0.4);
            border-radius: 6px;
            max-height: 160px;
            overflow-y: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 9px;
            line-height: 1.3;
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
                    <input type="range" id="slider-submitTime" min="60" max="250" value="120"
                           oninput="window.yxtUpdateConfig('submitTime', this.value)">
                    <input type="number" id="input-submitTime" value="120" min="60" max="250"
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
                    <span class="status-label">当前课件:</span>
                    <span class="status-value" id="status-title" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">--</span>
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
                    <span class="status-label">下次提交:</span>
                    <span class="status-value" id="status-next">--</span>
                </div>
                <div class="status-item">
                    <span class="status-label">今日学习:</span>
                    <span class="status-value" style="color:#00ff88;" id="status-today">--</span>
                </div>
                <div class="status-item">
                    <span class="status-label">本月学习:</span>
                    <span class="status-value" style="color:#ffcc00;" id="status-month">--</span>
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
        while (logArea.children.length > 80) {
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
            titleEl.innerHTML = '🚀 云学堂<br>🚀 暴力猪';
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
    
    // ==================== 获取 Player ====================
    function getPlayer() {
        // 方式1: 查找包含 submitStudyTime 方法的 Vue 实例（真正的 Player 组件）
        let foundPlayer = null;
        document.querySelectorAll('*').forEach(el => {
            if (el.__vue__ && typeof el.__vue__.submitStudyTime === 'function' && !foundPlayer) {
                foundPlayer = el.__vue__;
            }
        });
        if (foundPlayer) return foundPlayer;
        
        // 方式2: 直接通过播放器容器查找
        const playerContainers = [
            '.yxtulcdsdk-course-player',
            '.yxt-ulcd-sdk-course-player',
            '[class*="course-player"]',
            '.player-container'
        ];
        
        for (const selector of playerContainers) {
            const container = document.querySelector(selector);
            if (container && container.__vue__) {
                // 检查是否是真正的 Player（有 submitStudyTime 方法）
                if (typeof container.__vue__.submitStudyTime === 'function') {
                    return container.__vue__;
                }
                // 否则可能是父组件，尝试找其子组件
                if (container.__vue__.$refs && container.__vue__.$refs.mainPlayer) {
                    return container.__vue__.$refs.mainPlayer;
                }
            }
        }
        
        // 方式3: 通过 countdown 元素查找
        const countdownEl = document.querySelector('.yxtulcdsdk-course-player__countdown');
        if (countdownEl) {
            const getVue = (n) => { 
                while (n) { 
                    if (n.__vue__) return n.__vue__; 
                    n = n.parentElement; 
                } 
            };
            const vueInstance = getVue(countdownEl);
            if (vueInstance) {
                // 检查是否找到的是 Player 组件
                if (typeof vueInstance.submitStudyTime === 'function') {
                    return vueInstance;
                }
                // 否则可能是 Player 的父组件，尝试通过 $refs 获取
                if (vueInstance.$refs && vueInstance.$refs.mainPlayer) {
                    return vueInstance.$refs.mainPlayer;
                }
                if (vueInstance.$parent && typeof vueInstance.$parent.submitStudyTime === 'function') {
                    return vueInstance.$parent;
                }
            }
        }
        
        // 方式4: 遍历所有元素查找包含 kngDetail 和 submitStudyTime 的 Vue 实例
        document.querySelectorAll('*').forEach(el => {
            if (el.__vue__ && el.__vue__.kngDetail && typeof el.__vue__.submitStudyTime === 'function' && !foundPlayer) {
                foundPlayer = el.__vue__;
            }
        });
        
        return foundPlayer;
    }
    
    // ==================== 检查是否有下一课 ====================
    function hasNextKng() {
        const player = getPlayer();
        if (!player || !player.$parent) return false;
        
        // 使用 checkNextDisable() 方法判断是否有下一课
        if (typeof player.$parent.checkNextDisable === 'function') {
            return !player.$parent.checkNextDisable();
        }
        
        // 备用方案：检查 isLastKng 属性
        if (player.isLastKng !== undefined) return !player.isLastKng;
        if (player.kngDetail?.isLastKng !== undefined) return !player.kngDetail.isLastKng;
        
        return false;
    }
    
    // ==================== 触发下一课件（遍历父组件链找切换方法） ====================
    function triggerNextKng() {
        const player = getPlayer();
        if (!player) {
            addLog('❌ 未找到 Player 组件，无法切换课件', 'error');
            return false;
        }
        
        // 切换相关的方法名关键词
        const switchMethodKeywords = [
            'nextChapter', 'playNext', 'playNextChapter',
            'nextKng', 'switchKng', 'changeKng', 'selectKng',
            'goNext', 'toNext', 'handleNext',
            'nextLesson', 'nextSection', 'nextItem',
        ];
        
        // 遍历父组件链（最多10层）
        let comp = player;
        let depth = 0;
        while (comp && depth < 10) {
            for (const methodName of switchMethodKeywords) {
                if (typeof comp[methodName] === 'function') {
                    try {
                        addLog(`🔄 [第${depth}层] 调用 ${methodName}()`, 'info');
                        comp[methodName]();
                        addLog(`✅ ${methodName}() 调用成功`, 'success');
                        return true;
                    } catch (e) {
                        addLog(`  ↳ ${methodName}() 报错: ${e.message}`, 'error');
                    }
                }
            }
            comp = comp.$parent;
            depth++;
        }
        
        addLog('⚠️ 父组件链上未找到可用的切换方法', 'error');
        return false;
    }
    
    // ==================== 从课程列表切换到下一课（核心方案） ====================
    function clickNextKngFromList() {
        const player = getPlayer();
        const currentTitle = player?.kngDetail?.title || '';
        
        // 常见的课程列表容器选择器（侧边栏/目录）
        const listContainerSelectors = [
            '[class*="kng-list"]',
            '[class*="chapter-list"]',
            '[class*="catalog"]',
            '[class*="course-list"]',
            '[class*="outline"]',
            '[class*="directory"]',
            '[class*="menu"]',
            '.yxtf-tree',
            '[class*="tree"]',
            '[class*="sidebar"]',
        ];
        
        // 课件列表项选择器
        const itemSelectors = [
            '[class*="kng-item"]',
            '[class*="chapter-item"]',
            '[class*="catalog-item"]',
            '[class*="course-item"]',
            '[class*="leaf"]',
            '[class*="node"]',
            'li',
        ];
        
        // 查找所有课件列表项（带标题文字的可点击元素）
        let allItems = [];
        let foundContainer = null;
        let foundItemSel = null;
        
        // 先在容器内找
        for (const containerSel of listContainerSelectors) {
            const container = document.querySelector(containerSel);
            if (!container) continue;
            
            for (const itemSel of itemSelectors) {
                const items = container.querySelectorAll(itemSel);
                if (items.length > 1) {
                    allItems = Array.from(items);
                    foundContainer = container;
                    foundItemSel = itemSel;
                    addLog(`📋 在 ${containerSel} > ${itemSel} 找到 ${items.length} 个列表项`, 'info');
                    break;
                }
            }
            if (allItems.length > 1) break;
        }
        
        // 如果没找到，尝试通过 Vue 实例获取课程列表
        if (allItems.length === 0) {
            return clickNextByVueList(currentTitle);
        }
        
        // 找到当前课件所在的列表项
        let currentIndex = -1;
        let matchMethod = '';
        
        // 先尝试通过样式类定位（更可靠，不依赖Player）
        for (let i = 0; i < allItems.length; i++) {
            const cls = allItems[i].className || '';
            if (cls.includes('active') || cls.includes('current') || cls.includes('selected') || cls.includes('playing') || cls.includes('focus')) {
                currentIndex = i;
                matchMethod = '样式类';
                break;
            }
        }
        
        // 如果样式类没找到，再尝试通过标题匹配
        if (currentIndex === -1 && currentTitle) {
            for (let i = 0; i < allItems.length; i++) {
                const itemText = allItems[i].textContent.trim();
                if (itemText.includes(currentTitle)) {
                    currentIndex = i;
                    matchMethod = '标题匹配';
                    break;
                }
            }
        }
        
        addLog(`📌 当前课件在列表中的位置: ${currentIndex === -1 ? '未找到' : currentIndex + 1 + '/' + allItems.length} (${matchMethod})`, 'info');
        
        if (currentIndex === -1) {
            addLog('⚠️ 未能在列表中定位当前课件，尝试备用方案...', 'error');
            return clickNextByVueList(currentTitle);
        }
        
        if (currentIndex >= allItems.length - 1) {
            addLog('🎊 当前已是列表最后一课', 'success');
            return false;
        }
        
        const nextItem = allItems[currentIndex + 1];
        const nextTitle = nextItem.textContent.trim().substring(0, 30);
        addLog(`🖱️ 点击列表中的下一课: "${nextTitle}"`, 'info');
        
        // 方式1: 先尝试 Vue 实例方法（最可靠）
        if (vueClickItem(nextItem)) return true;
        
        // 方式2: 模拟完整点击事件序列
        simulateClick(nextItem);
        return true;
    }
    
    // 通过 Vue 实例调用点击处理（处理 Vue 绑定的 @click 不响应原生 click() 的问题）
    function vueClickItem(el) {
        // 尝试找这个元素或其父元素上的 Vue 实例
        let targetEl = el;
        for (let i = 0; i < 5; i++) {
            if (!targetEl) break;
            const vue = targetEl.__vue__;
            if (vue) {
                // 尝试直接调用 Vue 实例上的点击/选中方法
                const clickMethods = ['handleClick', 'onClick', 'handleSelect', 'select', 'handleItemClick', 'itemClick', 'onItemClick'];
                for (const m of clickMethods) {
                    if (typeof vue[m] === 'function') {
                        try {
                            vue[m](vue.$props || vue);
                            addLog(`✅ Vue实例方法 ${m}() 调用成功`, 'success');
                            return true;
                        } catch (e) { /* 继续尝试 */ }
                    }
                }
                // 尝试触发 Vue 自定义事件
                try {
                    vue.$emit('click');
                    vue.$emit('select');
                } catch (e) { /* 忽略 */ }
            }
            targetEl = targetEl.parentElement;
        }
        return false;
    }
    
    // 模拟完整点击事件序列（mousedown -> mouseup -> click）
    function simulateClick(el) {
        // 找到实际可点击的子元素（通常是 span 或 a 标签）
        const clickableChild = el.querySelector('a, span, [class*="title"], [class*="name"], [class*="text"]') || el;
        
        const eventOpts = { bubbles: true, cancelable: true, view: window };
        
        // 触发完整事件序列
        clickableChild.dispatchEvent(new MouseEvent('mouseenter', eventOpts));
        clickableChild.dispatchEvent(new MouseEvent('mouseover', eventOpts));
        clickableChild.dispatchEvent(new MouseEvent('mousedown', { ...eventOpts, button: 0 }));
        clickableChild.dispatchEvent(new MouseEvent('mouseup', { ...eventOpts, button: 0 }));
        clickableChild.dispatchEvent(new MouseEvent('click', { ...eventOpts, button: 0 }));
        
        // 也对父元素 li 触发一遍
        if (clickableChild !== el) {
            el.dispatchEvent(new MouseEvent('click', { ...eventOpts, button: 0 }));
        }
        
        addLog(`🖱️ 已模拟完整点击事件序列`, 'info');
    }
    
    // ==================== 通过 Vue 实例获取课程列表并切换 ====================
    function clickNextByVueList(currentTitle) {
        const player = getPlayer();
        if (!player) return false;
        
        // 尝试从 Vue 实例的各种数据结构中找到课程列表
        const tryGetList = (obj, depth = 0) => {
            if (!obj || depth > 3) return null;
            // 常见的列表字段名
            const listFields = ['kngList', 'list', 'chapters', 'catalog', 'courseList', 'items', 'children', 'nodes'];
            for (const field of listFields) {
                if (Array.isArray(obj[field]) && obj[field].length > 1) {
                    return obj[field];
                }
            }
            return null;
        };
        
        let kngList = null;
        
        // 从 player 及其父组件中查找
        let comp = player;
        for (let i = 0; i < 5 && comp; i++) {
            kngList = tryGetList(comp);
            if (kngList) {
                addLog(`📋 从Vue组件第${i}层父级找到课程列表 (${kngList.length}项)`, 'info');
                break;
            }
            comp = comp.$parent;
        }
        
        if (!kngList) {
            addLog('⚠️ 未找到课程列表数据', 'error');
            return clickNextKngBtn();
        }
        
        // 找当前课件
        let currentIndex = -1;
        for (let i = 0; i < kngList.length; i++) {
            const item = kngList[i];
            const title = item.title || item.name || item.kngName || '';
            if (title === currentTitle || (currentTitle && title.includes(currentTitle))) {
                currentIndex = i;
                break;
            }
        }
        
        if (currentIndex === -1) {
            addLog('⚠️ 未能在Vue列表中找到当前课件', 'error');
            return clickNextKngBtn();
        }
        
        if (currentIndex >= kngList.length - 1) {
            addLog('🎊 已是最后一课', 'success');
            return false;
        }
        
        const nextItem = kngList[currentIndex + 1];
        const nextTitle = nextItem.title || nextItem.name || nextItem.kngName || '未知';
        addLog(`📋 Vue列表中找到下一课: "${nextTitle}"`, 'info');
        
        // 尝试通过 Vue 方法直接切换
        let comp2 = player;
        for (let i = 0; i < 5 && comp2; i++) {
            // 尝试调用各种切换方法，传入下一课件的 id/kngId
            const nextId = nextItem.id || nextItem.kngId || nextItem.coursewareId;
            if (nextId) {
                const switchMethods = ['switchKng', 'changeKng', 'selectKng', 'playKng', 'goToKng', 'handleKngClick'];
                for (const method of switchMethods) {
                    if (typeof comp2[method] === 'function') {
                        try {
                            comp2[method](nextItem);
                            addLog(`✅ 调用 ${method}() 切换到下一课`, 'success');
                            return true;
                        } catch (e) {
                            addLog(`  ${method}() 失败: ${e.message}`, 'info');
                        }
                    }
                }
            }
            comp2 = comp2.$parent;
        }
        
        addLog('⚠️ Vue方法切换失败，降级到按钮点击', 'error');
        return clickNextKngBtn();
    }

    // ==================== 点击下一课按钮（最终备用方案） ====================
    function clickNextKngBtn() {
        // 严格匹配"下一个/下一课/下一节/Next"，排除"继续学习/继续"等
        const nextKeywords = ['下一个', '下一课', '下一节', '下一章', 'Next'];
        const excludeKeywords = ['继续学习', '继续播放'];
        
        const allButtons = document.querySelectorAll('button, .el-button, .yxtf-button, [role="button"], a');
        for (const btn of allButtons) {
            const text = btn.textContent.trim();
            // 排除不相关按钮
            if (excludeKeywords.some(kw => text.includes(kw))) continue;
            // 匹配目标按钮
            if (nextKeywords.some(kw => text.includes(kw))) {
                addLog(`🖱️ 点击按钮: "${text}"`, 'info');
                btn.click();
                return true;
            }
        }
        
        // 没有精确匹配，降级到包含"下一"的按钮
        for (const btn of allButtons) {
            const text = btn.textContent.trim();
            if (excludeKeywords.some(kw => text.includes(kw))) continue;
            if (text.includes('下一')) {
                addLog(`🖱️ 降级点击按钮: "${text}"`, 'info');
                btn.click();
                return true;
            }
        }
        
        addLog('⚠️ 未找到下一课件按钮，请手动切换', 'error');
        return false;
    }
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // ==================== 学习时长读取（API + DOM双方案） ====================
    /**
     * 通过 API 获取学习时长（单位：秒）
     * 接口：POST /ssp/hour/history/self/statistics
     * 请求头：token (JWT), source: 501, x-yxt-product: xxv2
     * 请求体：{ startDate, endDate, orgId, sourceType: -1 }
     */
    
    const DURATION_API = 'https://api-phx-tc.yunxuetang.cn/ssp/hour/history/self/statistics';
    let durationCache = { todaySec: null, monthSec: null, lastFetch: 0 };
    
    function getDurationToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    }

    /** 从 JWT token 解析 orgId */
    function getOrgIdFromToken() {
        try {
            const token = getDurationToken();
            if (!token) return '';
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.orgId || '';
        } catch(e) { return ''; }
    }

    /**
     * POST 调用统计接口获取指定时间范围内的总学时（秒）
     * @param {string} start - 开始日期 "YYYY-MM-DD HH:mm:ss"
     * @param {string} end - 结束日期 "YYYY-MM-DD HH:mm:ss"
     * @returns {Promise<number|null>} 秒数，失败返回null
     */
    function fetchStudySeconds(start, end) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', DURATION_API, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
            xhr.setRequestHeader('Accept', 'application/json');
            
            const token = getDurationToken();
            if (token) xhr.setRequestHeader('token', token);  // header名是 "token"
            xhr.setRequestHeader('source', '501');
            xhr.setRequestHeader('x-yxt-product', 'xxv2');

            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const d = JSON.parse(xhr.responseText);
                        resolve(d.totalStudyHour != null ? d.totalStudyHour : null);
                    } catch(e) { resolve(null); }
                } else {
                    console.warn(`[时长API] ${start}~${end} → ${xhr.status}:`, xhr.responseText.substring(0, 100));
                    resolve(null);
                }
            };
            xhr.onerror = (e) => { console.warn('[时长API] 网络错误:', e); resolve(null); };

            const orgId = getOrgIdFromToken();
            xhr.send(JSON.stringify({
                startDate: start,
                endDate: end,
                orgId: orgId,
                sourceType: -1,
                keyword: '',
                userId: ''
            }));
        });
    }

    /** 获取今日和本月学习时长（秒），带60s缓存 */
    async function fetchDurationData() {
        const now = Date.now();
        if (durationCache.lastFetch && (now - durationCache.lastFetch < 60000)) {
            return { today: durationCache.todaySec, month: durationCache.monthSec };
        }

        const t = new Date();
        const ds = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
        const ms = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`;
        const me = new Date(t.getFullYear(), t.getMonth() + 1, 0);
        const meStr = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(me.getDate()).padStart(2,'0')}`;

        const [todaySec, monthSec] = await Promise.all([
            fetchStudySeconds(`${ds} 00:00:00`, `${ds} 23:59:59`),
            fetchStudySeconds(`${ms} 00:00:00`, `${meStr} 23:59:59`)
        ]);

        durationCache.todaySec = todaySec;
        durationCache.monthSec = monthSec;
        durationCache.lastFetch = now;

        return { today: todaySec, month: monthSec };
    }

    /** DOM 回退方案：在 /learning/duration 页面时直接读DOM（返回分钟） */
    function getStudyDurationFromDOM() {
        const containers = document.querySelectorAll('.learning-duration-topdiv');
        if (!containers.length) return { today: null, month: null };

        let result = { today: null, month: null };
        for (const container of containers) {
            const labels = container.querySelectorAll(
                '.standard-size-16.yxtf-weight-4, [class*="color-gray"], span'
            );
            for (const label of labels) {
                const text = label.textContent.trim();
                let key = /今日/.test(text) ? 'today' : (/本月/.test(text) ? 'month' : null);
                if (key && result[key] == null) {
                    let parent = label.parentElement;
                    let valueParent = parent?.parentElement || parent;
                    if (valueParent) {
                        const valEl = valueParent.querySelector('[class*="mt12"][class*="learning-duration"]');
                        if (valEl) {
                            const num = parseFloat(valEl.textContent.trim().replace(/,/g, ''));
                            if (!isNaN(num)) result[key] = num; // 分钟
                        }
                    }
                }
            }
        }
        return result;
    }

    /** 格式化：>10000视为秒，否则视为分钟 */
    function formatMinutes(secondsOrMin) {
        if (secondsOrMin == null || isNaN(secondsOrMin)) return '--';
        const sec = secondsOrMin > 10000 ? secondsOrMin : Math.floor(secondsOrMin * 60);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h > 0) return `${h}h${m}m`;
        return `${m}m`;
    }

    /** 强制刷新指定元素的显示（绕过可能的渲染缓存） */
    function forceRepaint(el) {
        if (!el) return;
        // 先移除再重新添加，强制浏览器重排
        const parent = el.parentNode;
        if (parent) {
            const nextSibling = el.nextSibling;
            parent.removeChild(el);
            if (nextSibling) {
                parent.insertBefore(el, nextSibling);
            } else {
                parent.appendChild(el);
            }
        }
        // 触发 reflow
        void el.offsetHeight;
    }

    /** 更新面板时长显示：API优先，失败时DOM回退 */
    let _lastTodayText = '';
    let _lastMonthText = '';
    async function updateDurationDisplay() {
        const todayEl = document.getElementById('status-today');
        const monthEl = document.getElementById('status-month');
        if (!todayEl || !monthEl) {
            console.warn('[时长] 找不到 status-today 或 status-month 元素');
            return;
        }

        try {
            // 方案1：API获取（秒）
            const apiResult = await fetchDurationData();
            if (apiResult.today != null) {
                const newText = formatMinutes(apiResult.today);
                todayEl.textContent = newText;
                todayEl.title = `今日 ${Math.round(apiResult.today)} 秒 (${new Date().toLocaleTimeString()})`;
                const changed = newText !== _lastTodayText;
                console.log(`[时长] 今日: ${apiResult.today}s → ${newText}` + (changed ? ' ✅已更新' : ' (未变)'));
                if (changed) {
                    _lastTodayText = newText;
                    forceRepaint(todayEl);
                }
            } else throw new Error('API无今日数据');
            if (apiResult.month != null) {
                const newText = formatMinutes(apiResult.month);
                monthEl.textContent = newText;
                monthEl.title = `本月 ${Math.round(apiResult.month)} 秒 (${new Date().toLocaleTimeString()})`;
                const changed = newText !== _lastMonthText;
                console.log(`[时长] 本月: ${apiResult.month}s → ${newText}` + (changed ? ' ✅已更新' : ' (未变)'));
                if (changed) {
                    _lastMonthText = newText;
                    forceRepaint(monthEl);
                }
            } else throw new Error('API无本月数据');
        } catch(e) {
            console.warn(`[时长] API获取失败: ${e.message}，尝试DOM回退`);
            // 方案2：DOM回退（分钟）
            try {
                const domResult = getStudyDurationFromDOM();
                todayEl.textContent = formatMinutes(domResult.today);
                monthEl.textContent = formatMinutes(domResult.month);
                todayEl.title = domResult.today != null ? domResult.today + ' 分钟' : '未获取到';
                monthEl.title = domResult.month != null ? domResult.month + ' 分钟' : '未获取到';
                console.log(`[时长] DOM回退:`, domResult);
            } catch(e2) {
                todayEl.textContent = '--';
                monthEl.textContent = '--';
                console.error(`[时长] DOM也失败: ${e2.message}`);
            }
        }
    }

    // 定时刷新（每30秒），缩短间隔让增长更明显
    setInterval(() => updateDurationDisplay(), 30000);
    // 首次立即执行一次
    updateDurationDisplay();

    // ==================== 更新状态显示 ====================
    function updateStatus() {
        const player = getPlayer();
        const progress = player?.kngDetail?.schedule || 0;
        const title = player?.kngDetail?.title || '--';
        
        document.getElementById('status-title').textContent = title;
        document.getElementById('status-title').title = title; // 鼠标悬停显示完整标题
        document.getElementById('status-progress').textContent = progress + '%';
        document.getElementById('status-count').textContent = submitCount;
        
        const statusEl = document.getElementById('status-running');
        if (isRunning) {
            statusEl.textContent = '运行中';
            statusEl.className = 'status-value running';
        } else {
            statusEl.textContent = '已停止';
            statusEl.className = 'status-value stopped';
        }
    }
    
    // ==================== 弹窗管理 ====================
    // 提取为独立函数，供 doSubmit 在提交前后调用
    const MODAL_SELECTOR = '.yxtf-dialog__wrapper, .el-dialog__wrapper, [class*="dialog__wrapper"]';
    
    /**
     * 清理页面上的非评论弹窗（重复课程提示等）
     * @returns {number} 关闭的弹窗数量
     */
    function clearNonCommentModals() {
        let closedCount = 0;
        const seen = new Set(); // 去重，防止嵌套选择器匹配同一弹窗
        
        const modals = document.querySelectorAll(MODAL_SELECTOR);
        for (const m of modals) {
            if (!isElementVisible(m)) continue;
            if (seen.has(m)) continue;
            
            const mText = (m.textContent || '').trim().substring(0, 80);
            const isComment = mText.includes('课程评论') || mText.includes('课程评价');
            
            // 只处理非评论弹窗
            if (!isComment && mText.length > 2) {
                seen.add(m);
                
                // 优先点击"确定"按钮（重复课程弹窗需要确认而非关闭）
                let handled = false;
                const allBtns = m.querySelectorAll('button, [class*="button"], [role="button"], .el-button, .yxtf-button');
                for (const btn of allBtns) {
                    const btnText = (btn.textContent || '').trim();
                    if (btnText === '确定' || btnText === 'OK' || btnText === '是') {
                        btn.click();
                        closedCount++;
                        addLog(`🔒 已点「${btnText}」关闭弹窗`, 'info');
                        handled = true;
                        break;
                    }
                }
                
                // 没有确定按钮则尝试关闭按钮
                if (!handled) {
                    const closeBtn = m.querySelector('[class*="close"], [class*="Close"]');
                    if (closeBtn) {
                        closeBtn.click();
                        closedCount++;
                        addLog(`🔒 已关闭弹窗: "${mText.substring(0, 30)}"`, 'info');
                    }
                }
            }
        }
        
        return closedCount;
    }
    
    // ==================== 视频播放控制 ====================
    /**
     * 暂停视频，防止原生播放器自动提交与面板提交冲突
     * @returns {{video, wasPlaying}} 用于恢复
     */
    function pauseVideoForSubmit() {
        const video = document.querySelector('video');
        if (video && !video.paused) {
            video.pause();
            return { video, wasPlaying: true };
        }
        const p = getPlayer();
        if (p && typeof p.pause === 'function') {
            try { p.pause(); } catch(e) {}
            return { video: null, wasPlaying: true };
        }
        return { video: null, wasPlaying: false };
    }
    
    /**
     * 恢复视频播放
     */
    function restoreVideoPlayback(info) {
        if (!info.wasPlaying) return;
        if (info.video) {
            try { info.video.play(); } catch(e) {
                info.video.muted = true;
                info.video.play().catch(() => {});
            }
            return;
        }
        const p = getPlayer();
        if (p && typeof p.play === 'function') {
            try { p.play(); } catch(e) {}
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
        
        // 调用原生提交 - 尝试多种方法
        try {
            let submitMethod = null;
            
            // 查找可用的提交方法
            if (typeof player.submitStudyTime === 'function') {
                submitMethod = () => player.submitStudyTime(true);
            } else if (typeof player._submitStudyTime === 'function') {
                submitMethod = () => player._submitStudyTime(true);
            } else if (typeof player.submit === 'function') {
                submitMethod = () => player.submit();
            } else if (typeof player.save === 'function') {
                submitMethod = () => player.save();
            } else if (typeof player.$parent?.submitStudyTime === 'function') {
                submitMethod = () => player.$parent.submitStudyTime(true);
            } else if (typeof player.$parent?._submitStudyTime === 'function') {
                submitMethod = () => player.$parent._submitStudyTime(true);
            }
            
            if (submitMethod) {
                // ① 暂停视频，避免原生播放器自动提交与面板冲突
                const vidInfo = pauseVideoForSubmit();
                if (vidInfo.wasPlaying) {
                    addLog(`⏸️ 已暂停视频`, 'info');
                }
                
                // ② 提交前清理已有弹窗
                const preCleared = clearNonCommentModals();
                if (preCleared > 0) {
                    addLog(`🧹 清理 ${preCleared} 个弹窗`, 'info');
                    await new Promise(r => setTimeout(r, 300));
                }
                
                const t0 = Date.now();
                const preProgress = player.kngDetail?.schedule;
                addLog(`⏱️ submitMethod() [${preProgress}%]...`, 'info');
                
                submitMethod();
                
                const t1 = Date.now();
                addLog(`⏱️ 同步返回 ${t1-t0}ms, 等待异步...`, 'info');
                
                // 等待响应
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const t2 = Date.now();
                addLog(`⏱️ 总耗时 ${t2-t0}ms`, 'info');
                
                // ③ 提交后只记录弹窗（不主动关闭），让服务端正常处理重复课程提示
                const postModals = document.querySelectorAll(MODAL_SELECTOR);
                let hasDupModal = false;
                for (const m of postModals) {
                    if (!isElementVisible(m)) continue;
                    const mText = (m.textContent || '').trim();
                    const isComment = mText.includes('课程评论') || mText.includes('课程评价');
                    if (!isComment && mText.length > 2) {
                        hasDupModal = true;
                        addLog(`💬 弹窗存在: "${mText.substring(0, 40)}"（保留）`, 'info');
                        break; // 只记录一次即可
                    }
                }
                
                // ④ 恢复视频播放
                restoreVideoPlayback(vidInfo);
                addLog(`▶️ 已恢复视频`, 'info');
                
                // 重新获取Player，确保获取最新状态
                const freshPlayer = getPlayer();
                const newProgress = freshPlayer?.kngDetail?.schedule || currentProgress;
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
                // 列出 Player 上所有可用的方法供调试
                const methods = Object.keys(player).filter(k => typeof player[k] === 'function');
                addLog(`submitStudyTime 方法不存在`, 'error');
                addLog(`Player 可用方法: ${methods.slice(0, 10).join(', ')}...`, 'info');
                return false;
            }
        } catch (error) {
            addLog(`提交失败: ${error.message}`, 'error');
            consecutiveFails++;
            return false;
        }
    }
    
    // ==================== 检测完成提示 ====================
    function checkCompletionMessage() {
        // 查找包含"太棒了，您已完成当前任务"的元素
        const pageText = document.body.innerText || '';
        return pageText.includes('太棒了，您已完成当前任务');
    }
    
    // ==================== 自动提交循环 ====================
    async function autoSubmitLoop() {
        // 记录历史最高进度，用于检测"100%后变0%"的情况
        let maxProgressRecorded = 0;
        let completedTriggered = false;
        
        while (isRunning) {
            const player = getPlayer();
            const currentProgress = player?.kngDetail?.schedule || 0;
            
            // 更新历史最高进度
            if (currentProgress > maxProgressRecorded) {
                maxProgressRecorded = currentProgress;
            }
            
            // 检测完成状态：
            // 1. 当前进度 >= 100（主要判断条件）
            // 2. 历史最高进度曾达到100%但当前进度突然变低（100%后变0%的情况）
            // 注意：不依赖"太棒了，您已完成当前任务"提示，因为某些课件（如互动问答）加载时就显示此提示
            const isProgressCompleted = currentProgress >= 100 || 
                                       (maxProgressRecorded >= 100 && currentProgress < maxProgressRecorded);
            // 只有进度真正达到100%才算完成，忽略页面上的完成提示
            const isCompleted = isProgressCompleted;
            
            if (isCompleted && !completedTriggered) {
                completedTriggered = true;
                
                addLog('🎉 当前课程已完成!', 'success');
                addLog(`📊 历史最高进度: ${maxProgressRecorded}%, 当前进度: ${currentProgress}%`, 'info');
                addLog('⏳ 正在触发自动下一课...', 'info');
                window.yxtStop();
                
                // 触发原网站的自动下一课功能
                setTimeout(() => {
                    addLog('🚀 尝试触发自动下一课...', 'info');
                    
                    // 检查是否有下一课
                    if (!hasNextKng()) {
                        addLog('🎊 这是最后一课，没有下一课件了', 'success');
                        addLog('💬 等待课程评论弹窗出现后将自动填写...', 'info');
                        return;
                    }
                    
                    // 方案1: 调用 Vue 方法切换
                    let success = triggerNextKng();
                    
                    if (!success) {
                        addLog('⚠️ Vue方法切换失败，尝试从课程列表切换...', 'error');
                        // 方案2: 从侧边栏课程列表找到下一课并点击
                        setTimeout(() => {
                            success = clickNextKngFromList();
                            if (!success) {
                                addLog('⚠️ 列表切换也失败了，请手动切换', 'error');
                            }
                        }, 500);
                    }
                }, 2000);
                
                // 记录当前课件标题，用于对比判断是否切换成功
                const previousTitle = player?.kngDetail?.title;
                addLog(`📌 当前课件标题: "${previousTitle || '未知'}"`, 'info');
                
                // 检查是否成功切换课程 - 多轮检查
                let checkCount = 0;
                const maxChecks = 15; // 增加检查次数
                let playerReady = false;
                const checkInterval = setInterval(() => {
                    checkCount++;
                    addLog(`⏳ 第${checkCount}次检查课程状态...`, 'info');
                    
                    const currentPlayer = getPlayer();
                    if (currentPlayer) {
                        if (!playerReady) {
                            playerReady = true;
                            addLog('✅ Player组件已加载', 'success');
                        }
                        
                        const schedule = currentPlayer?.kngDetail?.schedule;
                        const title = currentPlayer?.kngDetail?.title;
                        const hasNext = hasNextKng();
                        
                        addLog(`📊 进度: ${schedule}%, 标题: ${title || '未知'}, 是否有下一课: ${hasNext}`, 'info');
                        
                        // 检测切换成功：标题变化且（进度为0或标题不同）
                        const titleChanged = title && previousTitle && title !== previousTitle;
                        const isNewCourse = schedule === 0 || titleChanged;
                        
                        if (isNewCourse && title) {
                            if (titleChanged) {
                                addLog(`✅ 检测到课件标题变化，切换成功!`, 'success');
                                addLog(`   "${previousTitle}" → "${title}"`, 'success');
                            } else {
                                addLog('✅ 检测到新课程（进度为0），切换成功!', 'success');
                            }
                            clearInterval(checkInterval);
                            
                            // 延迟后自动重新开始学习
                            setTimeout(() => {
                                addLog('🚀 新课程已就绪，3秒后将自动开始学习...', 'info');
                                setTimeout(() => {
                                    window.yxtStart();
                                }, 3000);
                            }, 1000);
                            return;
                        }
                        
                        // 如果没有下一课了
                        if (!hasNext) {
                            addLog('🎊 这是最后一课，学习完成!', 'success');
                            addLog('💬 等待课程评论弹窗出现后将自动填写...', 'info');
                            clearInterval(checkInterval);
                            // 启动评论检测（最后一课可能有评论弹窗）
                            startCommentObserver();
                            return;
                        }
                    } else {
                        addLog('⏳ 等待Player组件加载...', 'info');
                        // 如果Player长时间未加载，可能是页面正在跳转
                        if (checkCount > 5 && !playerReady) {
                            addLog('⏳ Player组件仍未加载，页面可能正在跳转...', 'info');
                        }
                    }
                    
                    // 达到最大检查次数
                    if (checkCount >= maxChecks) {
                        clearInterval(checkInterval);
                        addLog('⚠️ 检查结束，尝试从课程列表切换下一课...', 'error');
                        clickNextKngFromList();
                        return;
                    }
                    
                    // 第5次还没切换成功，再试一次
                    if (checkCount === 5) {
                        addLog('🔄 第5次检查仍未切换，再次尝试触发下一课...', 'info');
                        // 先尝试 Vue 方法，再尝试列表点击
                        if (!triggerNextKng()) {
                            clickNextKngFromList();
                        }
                    }
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
            
            addLog(`等待 ${waitTime} 秒后继续...`, 'info');
            
            // 等待 - 使用循环检查isRunning，以便能立即响应停止命令
            const waitStart = Date.now();
            const waitMs = waitTime * 1000;
            while (isRunning && (Date.now() - waitStart) < waitMs) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // 如果isRunning被设置为false，退出循环
            if (!isRunning) {
                break;
            }
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
    
    // ==================== 自动评论功能 ====================
    // 判断元素是否可见（兼容 fixed/absolute 定位，不能用 offsetParent）
    function isElementVisible(el) {
        if (!el) return false;
        // 检查 display / visibility
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        // 检查是否有实际尺寸（collapsed 的弹窗宽高为0）
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return true;
    }

    function autoFillComment() {
        if (!isCommentAutoFillEnabled) {
            addLog('自动评论已禁用，跳过', 'info');
            return;
        }
        
        addLog('🔍 正在查找课程评论弹窗...', 'info');
        
        // 查找评论弹窗 - 遍历所有可能的弹窗容器
        // 优先查 wrapper（最外层），再查内层 dialog，避免重复匹配
        const modalSelectors = [
            '.yxtf-dialog__wrapper',
            '.el-dialog__wrapper',
            '.yxtf-dialog',
            '.el-dialog',
            '.yxt-comment-dialog',
            '[class*="dialog__wrapper"]',
            '[class*="dialog"]',
            '[class*="modal"]'
        ];
        
        let modal = null;
        for (const selector of modalSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                // 用 getComputedStyle + BoundingRect 检测可见性，兼容 fixed 定位
                if (!isElementVisible(el)) continue;
                const text = el.textContent || '';
                if (text.includes('课程评论') || text.includes('课程评价') || text.includes('评价课程')) {
                    modal = el;
                    addLog(`✅ 找到评论弹窗: ${selector}`, 'success');
                    break;
                }
            }
            if (modal) break;
        }
        
        if (!modal) {
            addLog('⚠️ 未找到评论弹窗', 'error');
            return;
        }
        
        // 检查是否是课程评论弹窗
        const titleSelectors = ['.el-dialog__title', '.dialog-title', '[class*="title"]', 'h3', 'h4'];
        let title = null;
        for (const selector of titleSelectors) {
            title = modal.querySelector(selector);
            if (title) break;
        }
        
        const titleText = title ? title.textContent : '';
        addLog(`弹窗标题: ${titleText}`, 'info');
        
        // 1. 填写评论内容 - 多种可能的选择器（支持 el- 和 yxtf- 前缀）
        const textareaSelectors = [
            'textarea.el-textarea__inner',
            'textarea.yxtf-textarea__inner',
            'textarea[class*="textarea__inner"]',
            'textarea',
            '[class*="textarea"] textarea',
            'input[type="text"]'
        ];
        
        let textarea = null;
        for (const selector of textareaSelectors) {
            textarea = modal.querySelector(selector);
            if (textarea) {
                addLog(`✅ 找到评论输入框: ${selector}`, 'success');
                break;
            }
        }
        
        if (textarea) {
            textarea.value = '已学习';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            addLog('✅ 已填写评论内容: "已学习"', 'success');
        } else {
            addLog('⚠️ 未找到评论输入框', 'error');
        }
        
        // 2. 点击第5颗星（评5分）- 多种可能的选择器
        const starSelectors = [
            '.el-rate__item .el-rate__icon',
            '.el-rate__icon',
            '[class*="rate"] [class*="icon"]',
            '[class*="star"]',
            '.rate-item'
        ];
        
        let stars = [];
        for (const selector of starSelectors) {
            stars = modal.querySelectorAll(selector);
            if (stars.length >= 5) {
                addLog(`✅ 找到评分星星: ${selector} (${stars.length}个)`, 'success');
                break;
            }
        }
        
        if (stars.length >= 5) {
            // 点击第5颗星 - 评分组件监听 mousemove/mouseenter/mouseleave/mouseup 等事件
            // 需要模拟完整的鼠标事件序列才能触发 Vue 评分组件
            const fifthStar = stars[4];
            const eventOpts = { bubbles: true, cancelable: true, view: window };
            
            // 先逐颗 mouseenter，让评分组件高亮到第5颗
            for (let si = 0; si < 5; si++) {
                stars[si].dispatchEvent(new MouseEvent('mouseenter', eventOpts));
                stars[si].dispatchEvent(new MouseEvent('mouseover', eventOpts));
                stars[si].dispatchEvent(new MouseEvent('mousemove', eventOpts));
            }
            // 在第5颗星上触发 mousedown + mouseup + click
            fifthStar.dispatchEvent(new MouseEvent('mousedown', { ...eventOpts, button: 0 }));
            fifthStar.dispatchEvent(new MouseEvent('mouseup', { ...eventOpts, button: 0 }));
            fifthStar.dispatchEvent(new MouseEvent('click', { ...eventOpts, button: 0 }));
            
            // 尝试直接设置 Vue 实例的 rate/value 数据
            let rateVue = null;
            let el2 = fifthStar;
            for (let ri = 0; ri < 6 && el2; ri++) {
                if (el2.__vue__) { rateVue = el2.__vue__; break; }
                el2 = el2.parentElement;
            }
            if (rateVue) {
                // el-rate/yxtf-rate 内部通常用 currentValue 或 value 记录当前值
                if ('currentValue' in rateVue) rateVue.currentValue = 5;
                if ('hoverIndex' in rateVue) rateVue.hoverIndex = 4;
                // 触发 change/input 事件
                try { rateVue.$emit('change', 5); } catch(e) {}
                try { rateVue.$emit('input', 5); } catch(e) {}
                // 父组件可能通过 v-model 监听
                if (rateVue.$parent) {
                    try { rateVue.$parent.$emit('change', 5); } catch(e) {}
                }
                addLog('✅ 已通过Vue实例设置5星评分', 'success');
            } else {
                addLog('✅ 已模拟鼠标事件选择5星评分', 'success');
            }
        } else {
            addLog(`⚠️ 未找到评分星星 (找到${stars.length}个)`, 'error');
        }
        
        // 3. 点击发表按钮 - 多种可能的选择器（支持 el- 和 yxtf- 前缀）
        // 延长等待时间，确保评分事件处理完毕（1000ms）
        setTimeout(() => {
            const btnSelectors = [
                '.el-button--primary',
                '.yxtf-button--primary',
                '[class*="button--primary"]',
                '[class*="primary"]',
                'button',
                '[class*="btn"]'
            ];
            
            let submitBtn = null;
            for (const selector of btnSelectors) {
                const buttons = modal.querySelectorAll(selector);
                for (const btn of buttons) {
                    const btnText = btn.textContent || '';
                    if (btnText.includes('发表') || btnText.includes('提交') || btnText.includes('确定') || btnText.includes('评价')) {
                        submitBtn = btn;
                        addLog(`✅ 找到发表按钮: ${selector} - "${btnText.trim()}"`, 'success');
                        break;
                    }
                }
                if (submitBtn) break;
            }
            
            if (submitBtn) {
                submitBtn.click();
                addLog('✅ 已点击发表按钮', 'success');
            } else {
                addLog('⚠️ 未找到发表按钮', 'error');
            }
        }, 1000);
    }
    
    // 启动评论弹窗监听
    let lastModalCheckTime = 0;
    function startCommentObserver() {
        if (commentObserver) return;
        
        commentObserver = new MutationObserver((mutations) => {
            // 限制处理频率，每300ms最多处理一次
            const now = Date.now();
            if (now - lastModalCheckTime < 300) return;
            lastModalCheckTime = now;
            
            // 检查是否有新增节点（弹窗通常是新添加到body的）
            const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
            if (!hasNewNodes) return;
            
            // 检查是否有评论弹窗出现 - 同时支持 el-/yxtf- 前缀
            const dialogCandidates = [
                '.yxtf-dialog__wrapper', '.yxtf-dialog',
                '.el-dialog__wrapper', '.el-dialog',
                '[class*="dialog__wrapper"]', '[class*="dialog"]'
            ];
            let modal = null;
            for (const sel of dialogCandidates) {
                const els = document.querySelectorAll(sel);
                for (const el of els) {
                    if (!isElementVisible(el)) continue;
                    const text = el.textContent || '';
                    if (text.includes('课程评论') || text.includes('课程评价') || text.includes('评价课程')) {
                        modal = el;
                        break;
                    }
                }
                if (modal) break;
            }
            
            if (modal) {
                addLog('💬 检测到课程评论弹窗出现', 'info');
                // 延迟一点确保弹窗完全渲染
                setTimeout(autoFillComment, 1000);
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
