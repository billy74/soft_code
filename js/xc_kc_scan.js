(function() {
    // 销毁逻辑：如果面板已存在，先移除
    if (document.getElementById('yx-panel')) {
        document.getElementById('yx-panel').remove();
    }
    // 清除可能遗留的旧样式
    if (document.getElementById('yx-panel-style')) {
        document.getElementById('yx-panel-style').remove();
    }

    var style = document.createElement('style');
    style.id = 'yx-panel-style'; // 给样式加ID，方便销毁时清除
    style.textContent = "#yx-panel{position:fixed;top:50%;right:10px;transform:translateY(-50%);width:360px;height:88vh;background:rgba(255,255,255,0.95);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.2);z-index:99999;display:flex;flex-direction:column;overflow:hidden;font-family:'Microsoft YaHei',sans-serif;color:#333}#yx-header{padding:10px;background:#1890ff;color:white;font-weight:bold;font-size:14px;display:flex;justify-content:space-between;align-items:center}#yx-close-btn{background:transparent;border:none;color:white;font-size:18px;cursor:pointer;line-height:1;padding:0 2px}#yx-close-btn:hover{color:#ff4d4f}#yx-controls{padding:10px;background:#f0f2f5;border-bottom:1px solid #ddd;display:flex;gap:10px;align-items:center}#yx-page-input{width:60px;padding:6px;border:1px solid #ccc;border-radius:4px;text-align:center;font-size:12px}#yx-fetch-btn{flex:1;padding:8px;background:#52c41a;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold}#yx-fetch-btn:hover{background:#389e0d}#yx-fetch-btn:disabled{background:#87d068;cursor:not-allowed}#yx-content{flex:1;overflow-y:auto;padding:10px;font-size:12px}.yx-card{background:#fafafa;border:1px solid #eee;border-radius:4px;padding:8px;margin-bottom:8px;line-height:1.5}.yx-title{font-weight:bold;color:#1890ff;text-decoration:none;display:block;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.yx-tag{display:inline-block;padding:1px 4px;border-radius:2px;font-size:10px;margin-right:4px}.yx-tag.todo{background:#fff1f0;color:#f5222d;border:1px solid #ffa39e}.yx-tag.done{background:#f6ffed;color:#52c41a;border:1px solid #b7eb8f}.yx-tag.exam{background:#e6f7ff;color:#1890ff;border:1px solid #91d5ff}";
    document.head.appendChild(style);

    var panel = document.createElement('div');
    panel.id = 'yx-panel';
    // 新增了关闭按钮结构，移除了日志区域结构
    panel.innerHTML = '<div id="yx-header"><span>云学堂全量课程助手</span><button id="yx-close-btn" title="关闭并销毁面板">×</button></div><div id="yx-controls"><span style="font-size:12px;white-space:nowrap;">扫描页数:</span><input type="number" id="yx-page-input" value="5" min="1" max="50"><button id="yx-fetch-btn">开始全量扫描</button></div><div id="yx-content"><div style="text-align:center;color:#888;margin-top:20px;">设置页数后点击按钮开始获取</div></div>';
    document.body.appendChild(panel);

    // 绑定关闭按钮点击事件：彻底销毁面板和样式
    document.getElementById('yx-close-btn').addEventListener('click', function() {
        var panelEl = document.getElementById('yx-panel');
        var styleEl = document.getElementById('yx-panel-style');
        if (panelEl) panelEl.remove();
        if (styleEl) styleEl.remove();
    });

    function formatStudyHours(seconds) {
        if (!seconds || seconds <= 0) return '0分钟';
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + '分钟';
        var hours = Math.floor(minutes / 60);
        var remainMinutes = minutes % 60;
        if (remainMinutes > 0) return hours + '小时' + remainMinutes + '分钟';
        return hours + '小时';
    }

    function getStatusText(status) {
        if (status === 0) return { text: '尚未开始', isTodo: true };
        if (status === 1) return { text: '学习中', isTodo: true };
        if (status === 2) return { text: '已学完', isTodo: false };
        return { text: '未知', isTodo: true };
    }

    var fetchBtn = document.getElementById('yx-fetch-btn');
    var contentArea = document.getElementById('yx-content');
    var pageInput = document.getElementById('yx-page-input');

    async function checkHasExam(courseId, token) {
        var treeApiUrl = 'https://api-phx-tc.yunxuetang.cn/kng/study/tree';
        var treeRequestBody = JSON.stringify({
            "courseId": courseId,
            "studyParam": {"originOrgId": "", "previewType": 0},
            "targetCode": "kng",
            "targetId": "",
            "targetParam": {"taskId": "", "projectId": "", "flipId": "", "batchId": ""},
            "customFunctionCode": ""
        });

        try {
            var response = await fetch(treeApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'source': '501',
                    'token': token || '',
                    'yxt-orgdomain': 'xcsxy.yunxuetang.cn'
                },
                credentials: 'omit',
                body: treeRequestBody
            });
            if (!response.ok) return false;
            var treeData = await response.json(); 
            if (Array.isArray(treeData)) {
                for (var i = 0; i < treeData.length; i++) {
                    if (treeData[i].type === 91) return true;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    fetchBtn.addEventListener('click', async function() {
        fetchBtn.disabled = true;
        var totalPages = parseInt(pageInput.value) || 5;
        contentArea.innerHTML = '<div style="text-align:center;color:#1890ff;margin-top:20px;">数据加载中，请耐心等待...</div>';

        var token = localStorage.getItem('token');
        var limit = 16;
        var allCoursesData = []; // 用于收集所有课程的原始数据

        try {
            var baseHeaders = {
                'accept': 'application/json, text/plain, */*',
                'access-key': 'undefined',
                'cache-control': 'no-cache',
                'content-type': 'application/json;charset=UTF-8',
                'origin': 'https://xcsxy.yunxuetang.cn',
                'pragma': 'no-cache',
                'referer': 'https://xcsxy.yunxuetang.cn/',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                'source': '501',
                'token': token || '',
                'x-yxt-product': 'xxv2',
                'yxt-orgdomain': 'xcsxy.yunxuetang.cn'
            };

            // 第一步：循环拉取所有页码数据
            for (var page = 1; page <= totalPages; page++) {
                var offset = (page - 1) * limit;
                var listApiUrl = 'https://api-phx-tc.yunxuetang.cn/kng/knowledge/pagelist?limit=' + limit + '&offset=' + offset + '&orderType=desc&orderBy=createTime';
                var listRequestBody = JSON.stringify({
                    "collegeId": "09db0187-4860-46c3-9737-a6ed48384d29",
                    "catalogId": "69d80620-3468-4896-98cf-4acc85b89e73",
                    "title": "",
                    "type": "0",
                    "allTag": 1,
                    "tagIds": []
                });

                fetchBtn.textContent = '获取第 ' + page + '/' + totalPages + ' 页...';

                var response = await fetch(listApiUrl, {
                    method: 'POST',
                    headers: baseHeaders,
                    credentials: 'omit',
                    body: listRequestBody
                });

                if (!response.ok) {
                    throw new Error('HTTP错误! 状态码: ' + response.status);
                }
                
                var resData = await response.json();
                var courses = resData.datas;

                if (!courses || courses.length === 0) {
                    break; // 无数据，结束翻页
                }

                allCoursesData = allCoursesData.concat(courses); // 收集当前页数据
                if (page < totalPages) await delay(500);
            }

            if (allCoursesData.length === 0) {
                contentArea.innerHTML = '<div style="color:#888;">未查询到课程数据</div>';
                return;
            }

            // 第二步：按课程时长(studyHours)从大到小排序 [6](@ref)[7](@ref)
            allCoursesData.sort((a, b) => b.studyHours - a.studyHours);

            contentArea.innerHTML = ''; // 清空加载提示
            var todoCount = 0;
            var examCount = 0;

            // 第三步：遍历排序后的数据，检测考试并渲染
            for (var i = 0; i < allCoursesData.length; i++) {
                var course = allCoursesData[i];
                var statusInfo = getStatusText(course.status);
                var courseLink = 'https://xcsxy.yunxuetang.cn/kng/#/course/play?kngId=' + course.id + '&projectId=&btid=&gwnlUrl=&locateshare=';
                
                fetchBtn.textContent = '检测考试中 (' + (i + 1) + '/' + allCoursesData.length + ')';
                var hasExam = await checkHasExam(course.id, token);
                if(hasExam) examCount++;
                if (statusInfo.isTodo) todoCount++;

                await delay(200);

                var card = document.createElement('div');
                card.className = 'yx-card';
                if (statusInfo.isTodo) card.style.borderLeft = '3px solid #f5222d';

                var titleLink = document.createElement('a');
                titleLink.href = courseLink;
                titleLink.target = '_blank';
                titleLink.className = 'yx-title';
                titleLink.textContent = course.title;
                titleLink.title = '点击直接学习: ' + course.title;
                
                var infoDiv = document.createElement('div');
                
                var tagSpan = document.createElement('span');
                tagSpan.className = 'yx-tag ' + (statusInfo.isTodo ? 'todo' : 'done');
                tagSpan.textContent = statusInfo.text;
                
                if (hasExam) {
                    var examSpan = document.createElement('span');
                    examSpan.className = 'yx-tag exam';
                    examSpan.textContent = '含考试';
                    infoDiv.appendChild(examSpan);
                }

                var timeSpan = document.createElement('span');
                timeSpan.style.color = '#666';
                timeSpan.textContent = ' ⏱ ' + formatStudyHours(course.studyHours);
                
                var scoreSpan = document.createElement('span');
                scoreSpan.style.cssText = 'color:#faad14;float:right;';
                scoreSpan.textContent = '🏆 学分: ' + (course.studyScore || 0);

                infoDiv.insertBefore(tagSpan, infoDiv.firstChild);
                infoDiv.appendChild(timeSpan);
                infoDiv.appendChild(scoreSpan);
                
                card.appendChild(titleLink);
                card.appendChild(infoDiv);
                contentArea.appendChild(card);
            }

            fetchBtn.textContent = '🎉 扫描完毕！(待学:' + todoCount + ' 含考:' + examCount + ')';

        } catch (error) {
            contentArea.innerHTML = '<div style="color:red;">数据加载失败: ' + error.message + '</div>';
            fetchBtn.textContent = '❌ 加载失败，点击重试';
        } finally {
            fetchBtn.disabled = false;
        }
    });

})();
