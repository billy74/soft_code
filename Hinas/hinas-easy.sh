#!/bin/bash
export LANG=en_US.UTF-8
#######################################
# 定义颜色
re='\e[0m'
red='\e[1;91m'
white='\e[1;97m'
green='\e[1;32m'
yellow='\e[1;33m'
purple='\e[1;35m'
skyblue='\e[1;96m'
gl_hui='\e[37m'
gl_hong='\033[31m'
gl_lv='\033[32m'
gl_huang='\033[33m'
gl_lan='\033[34m'
gl_bai='\033[0m'
gl_zi='\033[35m'
gl_kjlan='\033[96m'
# 获取服务状态

SERVICE_NAME="hinas"
status=$(systemctl is-active --quiet $SERVICE_NAME; echo $?)

# if [ $# -ne 1 ]; then
   #echo "请使用:bash $0 设备名 进行使用"
   ip_wz=`curl -s -4 ping0.cc/geo | awk 'NR==2'`
   ip_wz=${ip_wz// /}
   echo -e "${green} 未使用设备名，将以$ip_wz 命名${re}"
# else

INSTALL_PATH="/etc/zhinan"
machineid=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)
echo -e "${green}Machineid为${green} $machineid${re}"

#check file
if [ -d "$INSTALL_PATH" ]; then
    echo "文件夹存在"
else
    echo "文件夹不存在，正在创建文件夹"
    sudo -u root mkdir $INSTALL_PATH
fi
  # Download
  wget -O /etc/zhinan/zhinan https://soft.hi-nas.dpdns.org/Hinas/zhinan
  chmod 777 /etc/zhinan/zhinan

#安装结束
if [ -z "$1" ]; then
	s_name="--hostname $ip_wz"
else
	s_name="--hostname $1"
fi


  
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
sudo -u root mv $INSTALL_PATH/hinas.service /etc/systemd/system/hinas.service
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
