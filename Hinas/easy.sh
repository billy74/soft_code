#!/bin/bash
export LANG=en_US.UTF-8

# 获取服务状态

SERVICE_NAME="hinas"
status=$(systemctl is-active --quiet $SERVICE_NAME; echo $?)

INSTALL_PATH="/etc/zhinan"
#判断文件夹是否存在
if [ -d "$INSTALL_PATH" ]; then
    echo "文件夹存在已跳过"
else
    echo "文件夹不存在-正在创建文件夹"
    sudo -u root mkdir $INSTALL_PATH
fi

  # Download
echo  "Downloading EasyTier ..."

wget -O $INSTALL_PATH/zhinan http://ll.qiniu.mzfree.top/zhinan


chmod 777 $INSTALL_PATH/zhinan

  if [ -f $INSTALL_PATH/zhinan ]; then
    echo  "Download successfully! "
  else
    echo  "Download failed! "
     exit 1
  fi

# 尝试获取中文地址
ip_wz=$(curl -s -4 ping0.cc/geo | awk 'NR==2')

# 去除空格
ip_wz=$(echo "$ip_wz" | tr -d ' ')

# 判断是否为空
if [ -z "$ip_wz" ]; then
    echo "中文地址为空，将采用IP命名"
    ip_wz=$(curl -s 4.ipw.cn)
fi

echo "将以 $ip_wz 命名"


if [ -z "$1" ]; then
	s_name="--hostname $ip_wz"
else
	s_name="--hostname $1"
fi



# machineid=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)
random_string=$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | head -c 16)
machineid=$random_string
cat <<-EOF > /$INSTALL_PATH/hinas.service
[Unit]
Description=EasyTier Service
After=network.target syslog.target
Wants=network.target

[Service]
Type=simple
ExecStart=$INSTALL_PATH/zhinan -d -w billy74 --machine-id=$machineid  $s_name

[Install]
WantedBy=multi-user.target
EOF


echo "正在写出配置文件"

  if [ -f $INSTALL_PATH/hinas.service ]; then
    echo  "service successfully! "
    sudo -u root mv $INSTALL_PATH/hinas.service /etc/systemd/system/hinas.service
  else
    echo  "service failed! "
    exit 1
  fi


echo "写出配置文件完成 正在配置开机启动"
sudo -u root systemctl enable hinas.service
echo "开机启动已完成 正在重载服务"
sudo -u root systemctl daemon-reload
echo "重启配置完成 准备重启服务"
sudo -u root systemctl restart hinas.service
echo "重启服务完成"
curl -s -4 ping0.cc/geo
echo "显示当前网络"
rm $0

